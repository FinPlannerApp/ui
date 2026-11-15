import { UndoBanner } from '../../../shared/components/undo-banner/undo-banner';
import { UndoService } from '../../../core/services/undo.service';
import { CcHistory } from '../../accounts/cc-history/cc-history';
import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, Subject, Subscription } from 'rxjs';
import { Transaction, TransactionService } from '../transaction';
import { Category } from '../../categories/category';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TransactionForm } from '../transaction-form/transaction-form';
import { TransactionSwitchForm } from '../transaction-switch-form/transaction-switch-form';
import { AdjustBalance } from '../../accounts/adjust-balance/adjust-balance';
import { RecordCcBill } from '../../accounts/record-cc-bill/record-cc-bill';
import { PayCcBill } from '../../accounts/pay-cc-bill/pay-cc-bill';
import { AccountSummary } from '../../dashboard/dashboard';
import { DashboardService } from '../../dashboard/dashboard';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { AccountState } from '../../../core/state/account-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';
import { toDateOnlyString, fromDateOnlyString } from '../../../core/utils/date-utils';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { AccountBucketBreakdown } from '../../../core/models/savings-bucket.model';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { AccountType, InterestFrequency } from '../../../core/models/account-type.model';
import { InterestDue } from '../../accounts/interest-due/interest-due';
import { Account } from '../../accounts/account';
import { Attachments } from '../../../shared/components/attachments/attachments';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';

interface StatementCycle {
  key: number;               // statement date (ms) — 0 = the stretch before the first statement
  from: Date | null;
  to: Date | null;           // null = still open (latest statement)
  label: string;
  statementAmount: number | null;
  projected?: boolean;       // no statement recorded yet; dates come from the card's billing day
}
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    UndoBanner,
    InterestDue,
    CcHistory,
    CommonModule,
    FormsModule,
    RouterLink,
    EmptyState,
    Attachments,
    StatCard,
    InfiniteScrollDirective,
    ...sharedPrimeModules
  ],
  templateUrl: './transaction-list.html',
  providers: [DialogService, MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionList implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private transactionService = inject(TransactionService);
  private categoryService = inject(Category);
  private dashboardService = inject(DashboardService);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  public accountState = inject(AccountState);
  private notificationService = inject(NotificationService);
  private breadcrumbService = inject(BreadcrumbService);
  private cdr = inject(ChangeDetectorRef);
  private api = inject(GenericApi);

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  transactions = signal<Transaction[]>([]);
  isLoading = signal(false);
  accountId = signal<number | null>(null);
  ref: DynamicDialogRef | null = null;
  summary = signal<AccountSummary | null>(null);

  bucketBreakdown = signal<AccountBucketBreakdown | null>(null);
  cashbackInsights = signal<any | null>(null);
  ccBreakdown = signal<any | null>(null);
  selectedCashbackAppDetail = signal<any | null>(null);
  showBucketForm = signal(false);
  newBucketName = signal('');
  newBucketAmount = signal<number | null>(null);

  readonly AccountType = AccountType;

  // Active account resolved from AccountState
  currentAccount = computed(() => {
    const id = this.accountId();
    if (id === null) return null;
    return this.accountState.accounts().find(a => a.id === id) ?? null;
  });

  // Calculate allocated buckets percent
  allocatedPercent = computed(() => {
    const breakdown = this.bucketBreakdown();
    const account = this.currentAccount();
    if (!breakdown || !account || account.balance <= 0) return 0;
    const totalAllocated = breakdown.buckets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const pct = Math.round((totalAllocated / account.balance) * 100);
    return Math.min(pct, 100);
  });

  estimatedInterest = computed(() => {
    const account = this.currentAccount();
    const details = account?.bankAccountDetails;
    if (!details?.interestRate) return null;

    const periodsPerYear = details.interestFrequency === InterestFrequency.Daily ? 365
      : details.interestFrequency === InterestFrequency.Monthly ? 12
        : details.interestFrequency === InterestFrequency.Quarterly ? 4
          : details.interestFrequency === InterestFrequency.HalfYearly ? 2
          : 1;

    return (account!.balance * (details.interestRate / 100)) / periodsPerYear;
  });

  bucketInterestShare(allocatedAmount: number): number | null {
    const account = this.currentAccount();
    const accountInterest = this.estimatedInterest();

    if (!account || accountInterest === null || account.balance <= 0) {
      return null;
    }

    const proportion = allocatedAmount / account.balance;
    return proportion * accountInterest;
  }

  interestFrequencyLabel(freq: InterestFrequency | null | undefined): string {
    switch (freq) {
      case InterestFrequency.Daily: return 'day';
      case InterestFrequency.Monthly: return 'month';
      case InterestFrequency.Quarterly: return 'quarter';
      case InterestFrequency.HalfYearly: return 'half-year';
      case InterestFrequency.Yearly: return 'year';
      default: return 'period';
    }
  }

  interestFrequencyAdverb(freq: InterestFrequency | null | undefined): string {
    switch (freq) {
      case InterestFrequency.Daily: return 'Daily';
      case InterestFrequency.Monthly: return 'Monthly';
      case InterestFrequency.Quarterly: return 'Quarterly';
      case InterestFrequency.HalfYearly: return 'Half-yearly';
      case InterestFrequency.Yearly: return 'Yearly';
      default: return '—';
    }
  }

  getAccountIcon(acc: Account | null): string {
    if (!acc) return 'pi pi-wallet';
    const cat = (acc.accountCategoryName || '').toLowerCase();
    if (cat.includes('card') || cat.includes('credit')) return 'pi pi-credit-card';
    if (cat.includes('loan') || cat.includes('debt')) return 'pi pi-building-columns';
    if (cat.includes('bank') || cat.includes('savings')) return 'pi pi-wallet';
    if (cat.includes('cash') || cat.includes('wallet')) return 'pi pi-money-bill';
    return 'pi pi-box';
  }

  getAccountBadgeColor(acc: Account | null): { bg: string, text: string, border: string, badgeSeverity: 'success' | 'warn' | 'danger' | 'info' | 'secondary' } {
    if (!acc) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', badgeSeverity: 'info' };
    const catLower = (acc.accountCategoryName || '').toLowerCase();
    if (catLower.includes('card') || catLower.includes('credit')) {
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', badgeSeverity: 'warn' };
    }
    if (catLower.includes('loan') || catLower.includes('debt')) {
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', badgeSeverity: 'danger' };
    }
    if (catLower.includes('bank') || catLower.includes('savings')) {
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', badgeSeverity: 'success' };
    }
    if (catLower.includes('cash') || catLower.includes('wallet')) {
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', badgeSeverity: 'info' };
    }
    return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', badgeSeverity: 'secondary' };
  }

  totalRecords = signal(0);
  rows = signal(25);
  isLoadingMore = signal(false);
  hasMore = computed(() => this.transactions().length < this.totalRecords());
  lastLazyLoadEvent: any;
  ready = signal(false);

  // ── Credit-card statement cycles ──
  // A card's period is a statement cycle: from a statement's date to the day before the next statement
  // (the latest one stays open). Cards with no statements recorded yet fall back to calendar months.
  private userSettings = inject(UserSettingsService);
  private undo = inject(UndoService);
  monthStartDay = signal(1);
  cycles = signal<StatementCycle[]>([]);
  selectedCycleKey = signal<number | null>(null);
  isCardWithCycles = computed(() =>
    this.currentAccount()?.accountType === AccountType.CreditCard && this.cycles().length > 0);
  activeCycle = computed(() => {
    if (!this.isCardWithCycles()) return null;
    const list = this.cycles();
    return list.find(c => c.key === this.selectedCycleKey()) ?? list[0];
  });

  /** The date window the list, totals and cashback use: the cycle for cards, else the calendar month. */
  private period(): { from: Date | null; to: Date | null } {
    const c = this.activeCycle();
    if (c) return { from: c.from, to: c.to };
    const d = this.selectedDate();
    const sd = this.monthStartDay();   // the user's money-month (1 = calendar month)
    return {
      from: new Date(d.getFullYear(), d.getMonth(), sd, 0, 0, 0),
      to: new Date(d.getFullYear(), d.getMonth() + 1, sd - 1, 23, 59, 59, 999),
    };
  }

  private periodFilters(): { [key: string]: string } {
    const c = this.activeCycle();
    if (!c && this.monthStartDay() > 1) {
      const w = this.period();
      return { from: ymd(w.from!), to: ymd(w.to!) };
    }
    if (!c) return {
      month: (this.selectedDate().getMonth() + 1).toString(),
      year: this.selectedDate().getFullYear().toString(),
    };
    const f: { [key: string]: string } = {};
    if (c.from) f['from'] = ymd(c.from);
    if (c.to) f['to'] = ymd(c.to);
    return f;
  }

  async loadCycles(): Promise<void> {
    const id = this.accountId();
    if (id === null || this.currentAccount()?.accountType !== AccountType.CreditCard) return;
    try {
      const res = await firstValueFrom(this.api.get<{ statements: { statementDate: string; billAmount: number }[] }>(`Accounts/${id}/credit-card-history`));
      if (!res.isSuccess) return;
      const days = res.value.statements
        .map(s => { const d = new Date(s.statementDate); return { d: new Date(d.getFullYear(), d.getMonth(), d.getDate()), amt: s.billAmount }; })
        .sort((a, b) => a.d.getTime() - b.d.getTime());

      // Billing day (from the card's "Statement Closing Date"): fills in cycles for months where no statement was recorded,
      // so spend since the last statement lands in the right cycle instead of one ever-growing "current" one.
      const bd = this.currentAccount()?.creditCardDetails?.statementClosingDate;
      const billingDay = bd ? new Date(bd).getDate() : 0;
      const projectedKeys = new Set<number>();
      if (billingDay > 0) {
        const at = (y: number, m: number) => new Date(y, m, Math.min(billingDay, new Date(y, m + 1, 0).getDate()));
        const today = new Date();
        let cursor = days.length ? days[days.length - 1].d : at(today.getFullYear(), today.getMonth() - 6);
        if (!days.length) { days.push({ d: cursor, amt: null as any }); projectedKeys.add(cursor.getTime()); }
        for (let i = 0; i < 24; i++) {
          const next = at(cursor.getFullYear(), cursor.getMonth() + 1);
          if (next.getTime() > today.getTime()) break;
          days.push({ d: next, amt: null as any });
          projectedKeys.add(next.getTime());
          cursor = next;
        }
      }
      const list: StatementCycle[] = [];
      if (days.length) list.push({ key: 0, from: null, to: new Date(days[0].d.getTime() - 86400000 + 0), label: '', statementAmount: null });
      days.forEach((s, i) => {
        const next = days[i + 1]?.d ?? null;
        list.push({ key: s.d.getTime(), from: s.d, to: next ? new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1, 23, 59, 59, 999) : null, label: '', statementAmount: projectedKeys.has(s.d.getTime()) ? null : s.amt, projected: projectedKeys.has(s.d.getTime()) });
      });
      if (list.length) {
        const first = list[0];
        first.to = new Date(days[0].d.getFullYear(), days[0].d.getMonth(), days[0].d.getDate() - 1, 23, 59, 59, 999);
      }
      for (const c of list) {
        const f = c.from ? shortDate(c.from) : 'Earlier';
        const t = c.to ? shortDate(c.to) : 'now';
        c.label = c.from === null ? `Before first statement (until ${t})` : `${f} – ${t}${c.to === null ? ' · current' : ''}${c.projected ? ' · by billing day' : ''}`;
      }
      list.reverse(); // newest first
      const hadSelection = this.selectedCycleKey();
      this.cycles.set(list);
      if (hadSelection === null || !list.some(c => c.key === hadSelection)) this.selectedCycleKey.set(list[0]?.key ?? null);
      this.cdr.markForCheck();
    } catch { /* falls back to calendar months */ }
  }

  onCycleChange(key: number): void {
    this.selectedCycleKey.set(key);
    this.loadData();
  }

  /** Spend on the card within the selected cycle — what the user actually wants to track. */
  cycleSpend = computed(() => this.summary()?.totalExpenses ?? 0);

  // Filter state
  selectedDate = signal<Date>(new Date());
  selectedCategory = signal<string | null>(null);
  globalSearch = signal<string>('');
  categoryOptions = signal<{ label: string; value: string }[]>([]);

  protected readonly Math = Math;
  private lastQueryKey: string | null = null;

  constructor() {
    this.selectedDate.update(d => {
      const startOfMonth = new Date(d);
      startOfMonth.setDate(1);
      return startOfMonth;
    });

    this.breadcrumbService.refresh$.subscribe(() => {
      this.loadData(this.lastLazyLoadEvent);
    });
  }

  async ngOnInit(): Promise<void> {
    const params = await firstValueFrom(this.route.paramMap);
    const id = Number(params.get('id'));
    if (!id || isNaN(id)) {
      return;
    }
    this.accountId.set(id);

    // Ensure account state is fresh
    await this.accountState.loadAccounts();
    try { this.monthStartDay.set((await this.userSettings.getGeneral()).monthStartDay); } catch { /* calendar month */ }
    await this.loadCycles();

    // Load available categories for filtering
    try {
      const categories = await firstValueFrom(this.categoryService.getTransactionCategories());
      this.categoryOptions.set(categories.map(c => ({ label: c.path ?? c.name, value: c.name })));
    } catch (e) {
      console.warn('Could not load category options');
    }

    this.ready.set(true);
    this.cdr.markForCheck();

    // Explicitly trigger data load after accountId is set.
    // The p-table's lazy-load event often fires BEFORE this async ngOnInit
    // finishes, so accountId is still null at that point and loadData()
    // early-returns. Without this, navigating back and re-entering this
    // route leaves the component blank.
    await this.loadData(null, true);
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  async loadBuckets(): Promise<void> {
    const id = this.accountId();
    if (id === null) return;
    try {
      const result = await firstValueFrom(this.api.get<AccountBucketBreakdown>(`SavingsBuckets/account/${id}`));
      this.bucketBreakdown.set(result.value);
      this.cdr.markForCheck();
    } catch (err) {
      // Non-critical widget
    }
  }

  async loadCashbackInsights(): Promise<void> {
    const acc = this.currentAccount();
    if (!acc || acc.accountType !== AccountType.CreditCard) return;
    const c = this.activeCycle();
    const ref = c?.from ?? c?.to ?? this.selectedDate();
    const month = ref.getMonth() + 1;
    const year = ref.getFullYear();
    try {
      const result = await firstValueFrom(
        this.api.get<any>(`Accounts/cashback-insights?accountId=${acc.id}&month=${month}&year=${year}`)
      );
      if (result.isSuccess) {
        this.cashbackInsights.set(result.value);
        this.cdr.markForCheck();
      }
    } catch (err) {
      // Non-critical supplementary data
    }
  }

  async loadCreditCardBreakdown(): Promise<void> {
    const id = this.accountId();
    if (id === null || this.currentAccount()?.accountType !== AccountType.CreditCard) return;
    try {
      const res = await firstValueFrom(this.api.get<any>(`Accounts/${id}/credit-card-breakdown`));
      if (res.isSuccess) {
        this.ccBreakdown.set(res.value);
        this.cdr.markForCheck();
      }
    } catch {
      // Non-critical widget
    }
  }

  async addBucket(): Promise<void> {
    const id = this.accountId();
    const name = this.newBucketName().trim();
    const amount = this.newBucketAmount();
    if (id === null || !name || amount === null || amount <= 0) {
      this.notificationService.showError('Please enter a valid bucket name and amount.');
      return;
    }

    try {
      await firstValueFrom(this.api.post<any>('SavingsBuckets/upsert', {
        accountId: id,
        name,
        allocatedAmount: amount,
        targetAmount: null
      }));
      this.notificationService.showSuccess(`Savings bucket "${name}" added.`);
      this.newBucketName.set('');
      this.newBucketAmount.set(null);
      this.showBucketForm.set(false);
      await this.loadBuckets();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to add bucket.');
    }
  }

  async deleteBucket(bucketId: number): Promise<void> {
    try {
      await firstValueFrom(this.api.post<any>('SavingsBuckets/delete', { id: bucketId }));
      this.notificationService.showSuccess('Bucket deleted.');
      await this.loadBuckets();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to delete bucket.');
    }
  }

  async loadData(event?: any, force: boolean = false): Promise<void> {
    const id = this.accountId();
    if (id === null || this.isLoading()) return;

    const pageNumber = 1; // every (re)load restarts the list; further pages are appended by loadMore()
    const pageSize = this.rows();
    const sortBy = event?.sortField || this.lastLazyLoadEvent?.sortField || 'date';
    const sortOrder = event?.sortOrder === 1 ? 'asc' : (event?.sortOrder === -1 ? 'desc' : (this.lastLazyLoadEvent?.sortOrder === 1 ? 'asc' : 'desc'));

    const filters: { [key: string]: string } = this.periodFilters();
    if (this.selectedCategory()) {
      filters['categoryName'] = this.selectedCategory()!;
    }

    const win = this.period();
    const startOfMonth = win.from ?? new Date(2000, 0, 1);
    const endOfMonth = win.to ?? new Date(2100, 0, 1);

    const currentQueryKey = JSON.stringify({
      accountId: id,
      pageNumber,
      pageSize,
      sortBy,
      sortOrder,
      filters,
      globalSearch: this.globalSearch(),
    });

    if (!force && this.lastQueryKey === currentQueryKey) {
      return;
    }

    this.isLoading.set(true);
    if (event && event.sortField) this.lastLazyLoadEvent = event;

    try {
      this.lastQueryKey = currentQueryKey;

      const [paginatedResult, summaryData] = await Promise.all([
        firstValueFrom(this.transactionService.getTransactionsForAccount(id, {
          pageNumber,
          pageSize,
          sortBy,
          sortOrder,
          filters,
          globalSearch: this.globalSearch() || ''
        })),
        firstValueFrom(this.dashboardService.getAccountSummary(id, startOfMonth, endOfMonth))
      ]);

      this.transactions.set(paginatedResult.data);
      this.totalRecords.set(paginatedResult.totalRecords);
      this.summary.set(summaryData);
      await this.loadBuckets();
      await this.loadCashbackInsights();
      await this.loadCreditCardBreakdown();
      void this.loadCycles();

      const accountName = this.currentAccount()?.name || 'Account';
      this.breadcrumbService.setItems([
        { label: 'Accounts', routerLink: '/app/accounts' },
        { label: accountName },
        { label: 'Transactions' }
      ]);
    } catch (err) {
      console.error('Failed to load account transactions', err);
      this.lastQueryKey = null;
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  /** Infinite scroll: fetch the next page and APPEND it, so rows already shown never disappear. */
  async loadMore(): Promise<void> {
    const id = this.accountId();
    if (id === null || this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;

    this.isLoadingMore.set(true);
    const pageSize = this.rows();
    const nextPage = Math.floor(this.transactions().length / pageSize) + 1;
    const keyAtStart = this.lastQueryKey;
    const filters: { [key: string]: string } = this.periodFilters();
    if (this.selectedCategory()) filters['categoryName'] = this.selectedCategory()!;
    const sortBy = this.lastLazyLoadEvent?.sortField || 'date';
    const sortOrder = this.lastLazyLoadEvent?.sortOrder === 1 ? 'asc' : 'desc';

    try {
      const page = await firstValueFrom(this.transactionService.getTransactionsForAccount(id, {
        pageNumber: nextPage, pageSize, sortBy, sortOrder, filters, globalSearch: this.globalSearch() || ''
      }));
      // Filters/sort changed while this page was in flight: it belongs to an old list, drop it.
      if (keyAtStart !== this.lastQueryKey) return;
      const seen = new Set(this.transactions().map(t => t.id));
      this.transactions.update(list => [...list, ...page.data.filter(t => !seen.has(t.id))]);
      this.totalRecords.set(page.totalRecords);
    } catch (err) {
      console.error('Failed to load more transactions', err);
    } finally {
      this.isLoadingMore.set(false);
      this.cdr.markForCheck();
    }
  }

  onDateChange(event: any): void {
    if (event) {
      this.selectedDate.set(event);
      this.loadData();
    }
  }

  // ── Saved filters (search text + category), kept on this device ──
  private static readonly SAVED_KEY = 'finplanner_saved_tx_filters';
  savedFilters = signal<{ name: string; search: string; category: string | null }[]>(TransactionList.readSaved());
  private static readSaved(): { name: string; search: string; category: string | null }[] {
    try { const v = JSON.parse(localStorage.getItem(TransactionList.SAVED_KEY) ?? '[]'); return Array.isArray(v) ? v.slice(0, 12) : []; } catch { return []; }
  }
  private persistSaved(): void {
    try { localStorage.setItem(TransactionList.SAVED_KEY, JSON.stringify(this.savedFilters())); } catch { /* storage unavailable */ }
  }
  canSaveFilter = computed(() => !!(this.globalSearch().trim() || this.selectedCategory()));
  saveCurrentFilter(): void {
    const search = this.globalSearch().trim(), category = this.selectedCategory();
    if (!search && !category) return;
    const name = (window.prompt('Name this filter', search || category || '') ?? '').trim().slice(0, 30);
    if (!name) return;
    this.savedFilters.update(l => [{ name, search, category }, ...l.filter(f => f.name.toLowerCase() !== name.toLowerCase())].slice(0, 12));
    this.persistSaved();
  }
  applySavedFilter(f: { search: string; category: string | null }): void {
    this.globalSearch.set(f.search);
    this.selectedCategory.set(f.category);
    this.lastQueryKey = null;
    this.loadData();
  }
  removeSavedFilter(name: string): void {
    this.savedFilters.update(l => l.filter(f => f.name !== name));
    this.persistSaved();
  }

  onCategoryChange(): void {
    this.loadData();
  }

  onSearch(): void {
    this.searchSubject.next(this.globalSearch());
  }

  /** Click a #tag on a row to show everything with that tag (search matches tags and notes). */
  filterByTag(tag: string): void {
    this.globalSearch.set(tag);
    this.onSearch();
  }

  clearSearch(): void {
    this.globalSearch.set('');
    this.onSearch();
  }

  onLazyLoad(event: any): void {
    if (this.accountId() === null) return;
    this.loadData(event);
  }

  async showTransactionForm(transactionToEdit?: Transaction): Promise<void> {
    const isEditMode = !!transactionToEdit;
    this.ref = this.dialogService.open(TransactionForm, {
      header: isEditMode ? 'Edit Transaction' : 'Add New Transaction',
      width: '450px',
      modal: true,
      closable: true,
      data: {
        transaction: transactionToEdit,
        currentAccountId: this.accountId()
      }
    });

    if (this.ref) {
      const result = await firstValueFrom(this.ref.onClose);
      if (result) {
        this.lastQueryKey = null;
        await this.accountState.refresh();
        await this.loadData(null, true);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Transaction saved successfully' });
      }
    }
  }

  // ── Bulk edit: tick rows, then set a category, add a tag or delete them together ──
  selectMode = signal(false);
  selectedIds = signal<Set<number>>(new Set());
  bulkCategories = signal<any[]>([]);
  bulkCategoryId = signal<number | null>(null);
  bulkTag = signal('');
  bulkBusy = signal(false);

  /** Transfers can't be edited in bulk; everything else can. */
  isBulkEditable(tx: Transaction): boolean { return !tx.transferGroupId; }

  toggleSelectMode(): void {
    const on = !this.selectMode();
    this.selectMode.set(on);
    this.selectedIds.set(new Set());
    this.bulkCategoryId.set(null);
    this.bulkTag.set('');
    if (on && this.bulkCategories().length === 0) {
      firstValueFrom(this.categoryService.getTransactionCategories())
        .then(c => this.bulkCategories.set((c ?? []).map((x: any) => ({ ...x, path: x.path ?? x.name }))))
        .catch(() => { /* picker stays empty */ });
    }
  }

  toggleRow(tx: Transaction, checked: boolean): void {
    this.selectedIds.update(s => { const n = new Set(s); checked ? n.add(tx.id) : n.delete(tx.id); return n; });
  }

  selectAllVisible(checked: boolean): void {
    this.selectedIds.set(checked ? new Set(this.transactions().filter(t => this.isBulkEditable(t)).map(t => t.id)) : new Set());
  }

  allVisibleSelected = computed(() => {
    const rows = this.transactions().filter(t => this.isBulkEditable(t));
    return rows.length > 0 && rows.every(t => this.selectedIds().has(t.id));
  });

  private selectedRows(): Transaction[] {
    const ids = this.selectedIds();
    return this.transactions().filter(t => ids.has(t.id) && this.isBulkEditable(t));
  }

  /** Applies a category and/or an extra tag to every ticked row, one save at a time (same rules as the edit form). */
  async applyBulkEdit(): Promise<void> {
    const rows = this.selectedRows();
    const catId = this.bulkCategoryId();
    const tag = this.bulkTag().trim().replace(/^#/, '').toLowerCase().slice(0, 30);
    if (rows.length === 0 || (!catId && !tag) || this.bulkBusy()) return;
    this.bulkBusy.set(true);
    let done = 0, skipped = 0, failed = 0;
    try {
      for (const tx of rows) {
        const existing = this.bulkCategories().find(c => c.name === tx.categoryName);
        const categoryId = catId ?? existing?.id ?? null;
        const tags = Array.from(new Set([...(tx.tags ?? []), ...(tag ? [tag] : [])]));
        if (!categoryId && tx.categoryName) { skipped++; continue; }      // can't keep its current category: leave it alone
        if (tags.length > 8) { skipped++; continue; }
        try {
          await firstValueFrom(this.transactionService.upsertTransaction(this.accountId()!, {
            id: tx.id,
            description: tx.description,
            amount: tx.amount,
            date: toDateOnlyString(fromDateOnlyString(tx.date as any) ?? new Date(tx.date as any))!,
            type: tx.type,
            transactionCategoryId: categoryId,
            merchantId: (tx as any).merchantId ?? null,
            notes: tx.notes ?? null,
            tags,
            accountCategoryId: undefined
          } as any));
          done++;
        } catch { failed++; }
      }
      this.lastQueryKey = null;
      await this.accountState.refresh();
      await this.loadData(null, true);
      this.selectedIds.set(new Set());
      this.bulkCategoryId.set(null);
      this.bulkTag.set('');
      const extra = (skipped ? `, ${skipped} skipped` : '') + (failed ? `, ${failed} failed` : '');
      this.messageService.add({ severity: failed ? 'warn' : 'success', summary: 'Bulk edit', detail: `Updated ${done} transaction${done === 1 ? '' : 's'}${extra}.` });
    } finally { this.bulkBusy.set(false); }
  }

  /** Deletes every ticked row; one Undo brings them all back (10 minutes, same as a single delete). */
  bulkDelete(): void {
    const rows = this.selectedRows();
    if (rows.length === 0) return;
    this.confirmationService.confirm({
      message: `Delete ${rows.length} transaction${rows.length === 1 ? '' : 's'}? You can undo this for 10 minutes.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.bulkBusy.set(true);
        const deleted: Transaction[] = [];
        try {
          for (const tx of rows) {
            try { await firstValueFrom(this.transactionService.deleteTransaction(this.accountId()!, tx.id)); deleted.push(tx); } catch { /* counted below */ }
          }
          if (deleted.length) {
            this.undo.offer(`${deleted.length} transaction${deleted.length === 1 ? '' : 's'} deleted`, async () => {
              for (const tx of deleted) {
                try { await firstValueFrom(this.transactionService.restoreTransaction(this.accountId()!, tx.id)); } catch { /* ignore */ }
              }
              this.lastQueryKey = null;
              await this.accountState.refresh();
              await this.loadData(null, true);
            });
          }
          if (deleted.length < rows.length) this.notificationService.showError(`${rows.length - deleted.length} could not be deleted.`);
          this.selectedIds.set(new Set());
          this.lastQueryKey = null;
          await this.accountState.refresh();
          await this.loadData(null, true);
        } finally { this.bulkBusy.set(false); }
      }
    });
  }

  deleteTransaction(transaction: Transaction): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this transaction "${transaction.description}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await firstValueFrom(this.transactionService.deleteTransaction(this.accountId()!, transaction.id));
          if (!transaction.transferGroupId) {
            this.undo.offer(`"${transaction.description}" was deleted`, async () => {
              try {
                await firstValueFrom(this.transactionService.restoreTransaction(this.accountId()!, transaction.id));
                this.lastQueryKey = null;
                await this.accountState.refresh();
                await this.loadData(null, true);
              } catch (e: any) {
                this.notificationService.showError(e?.description || e?.message || 'Could not undo.');
              }
            });
          } else {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Transaction deleted' });
          }
          this.lastQueryKey = null;
          await this.accountState.refresh();
          await this.loadData(null, true);
        } catch (err) {
          this.notificationService.showError('Failed to delete transaction');
        }
      }
    });
  }

  async showSwitchAccountForm(transaction: Transaction): Promise<void> {
    this.ref = this.dialogService.open(TransactionSwitchForm, {
      header: 'Switch Target Account',
      width: '450px',
      modal: true,
      data: { currentAccountId: this.accountId() }
    });

    if (this.ref) {
      const result = await firstValueFrom(this.ref.onClose);

      if (result && result.destinationAccountId) {
        try {
          await firstValueFrom(this.transactionService.switchAccount(this.accountId()!, transaction.id, result.destinationAccountId));
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Transaction transferred successfully' });
          this.lastQueryKey = null;
          await this.accountState.refresh();
          await this.loadData(null, true);
        } catch (err: any) {
          this.notificationService.showError('Failed to switch transaction target');
        }
      }
    }
  }

  openAdjustBalance(): void {
    const acc = this.currentAccount();
    if (!acc) return;

    this.ref = this.dialogService.open(AdjustBalance, {
      header: 'Adjust Balance',
      width: '28rem',
      modal: true,
      data: {
        accountId: acc.id,
        accountName: acc.name,
        currentBalance: acc.balance
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe(async (changed: boolean) => {
        if (changed) {
          this.lastQueryKey = null;
          await this.accountState.refresh();
          await this.loadData(null, true);
        }
      });
    }
  }

  openRecordCcBill(): void {
    const acc = this.currentAccount();
    if (!acc) return;

    this.ref = this.dialogService.open(RecordCcBill, {
      header: 'Record Credit Card Bill',
      width: '28rem',
      modal: true,
      data: {
        accountId: acc.id,
        accountName: acc.name
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe(async (changed: boolean) => {
        if (changed) {
          this.lastQueryKey = null;
          await this.accountState.refresh();
          await this.loadData(null, true);
        }
      });
    }
  }

  openPayCcBill(): void {
    const acc = this.currentAccount();
    if (!acc) return;

    const breakdown = this.ccBreakdown();
    const remaining = breakdown?.remainingBillAmount ?? 0;
    const billToPay = (!breakdown?.latestBillIsPaid && remaining > 0) ? remaining : 0;

    this.ref = this.dialogService.open(PayCcBill, {
      header: 'Pay Credit Card Bill',
      width: '92vw',
      styleClass: 'max-w-2xl text-left pay-cc-dialog',
      breakpoints: {
        '960px': '90vw',
        '640px': '95vw'
      },
      modal: true,
      data: {
        accountId: acc.id,
        accountName: acc.name,
        outstandingBalance: billToPay
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe(async (changed: boolean) => {
        if (changed) {
          this.lastQueryKey = null;
          await this.accountState.refresh();
          await this.loadData(null, true);
        }
      });
    }
  }
}