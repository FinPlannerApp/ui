import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Transaction, TransactionService } from '../transaction';
import { Category } from '../../categories/category';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TransactionForm } from '../transaction-form/transaction-form';
import { TransactionSwitchForm } from '../transaction-switch-form/transaction-switch-form';
import { AdjustBalance } from '../../accounts/adjust-balance/adjust-balance';
import { RecordCcBill } from '../../accounts/record-cc-bill/record-cc-bill';
import { PayCcBill } from '../../accounts/pay-cc-bill/pay-cc-bill';
import { AccountSummary } from '../../dashboard/dashboard';
import { DashboardService } from '../../dashboard/dashboard';
import { AccountState } from '../../../core/state/account-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { AccountBucketBreakdown } from '../../../core/models/savings-bucket.model';
import { InputNumberModule } from 'primeng/inputnumber';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AccountType, InterestFrequency } from '../../../core/models/account-type.model';
import { Account } from '../../accounts/account';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    InputNumberModule,
    TooltipModule,
    FloatLabelModule,
    ...sharedPrimeModules
  ],
  templateUrl: './transaction-list.html',
  providers: [DialogService, MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionList implements OnInit {
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

  transactions = signal<Transaction[]>([]);
  isLoading = signal(false);
  accountId = signal<number | null>(null);
  ref: DynamicDialogRef | null = null;
  summary = signal<AccountSummary | null>(null);

  bucketBreakdown = signal<AccountBucketBreakdown | null>(null);
  cashbackInsights = signal<any | null>(null);
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
      case InterestFrequency.Yearly: return 'year';
      default: return 'period';
    }
  }

  interestFrequencyAdverb(freq: InterestFrequency | null | undefined): string {
    switch (freq) {
      case InterestFrequency.Daily: return 'Daily';
      case InterestFrequency.Monthly: return 'Monthly';
      case InterestFrequency.Quarterly: return 'Quarterly';
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
  rows = signal(10);
  lastLazyLoadEvent: any;
  ready = signal(false);

  // Filter state
  selectedDate = signal<Date>(new Date());
  selectedCategory = signal<string | null>(null);
  globalSearch = signal<string>('');
  categoryOptions = signal<{ label: string; value: string }[]>([]);

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

    // Load available categories for filtering
    try {
      const categories = await firstValueFrom(this.categoryService.getTransactionCategories());
      this.categoryOptions.set(categories.map(c => ({ label: c.name, value: c.name })));
    } catch (e) {
      console.warn('Could not load category options');
    }

    this.ready.set(true);
    this.cdr.markForCheck();
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
    try {
      const result = await firstValueFrom(this.api.get<any>('Accounts/cashback-insights'));
      if (result.isSuccess) {
        this.cashbackInsights.set(result.value);
        this.cdr.markForCheck();
      }
    } catch (err) {
      // Non-critical supplementary data
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

  async loadData(event?: any): Promise<void> {
    const id = this.accountId();
    if (id === null || this.isLoading()) return;

    const pageNumber = event ? (event.first / event.rows + 1) : (this.lastLazyLoadEvent ? (this.lastLazyLoadEvent.first / this.lastLazyLoadEvent.rows + 1) : 1);
    const pageSize = event ? event.rows : (this.lastLazyLoadEvent ? this.lastLazyLoadEvent.rows : this.rows());
    const sortBy = event?.sortField || this.lastLazyLoadEvent?.sortField || 'date';
    const sortOrder = event?.sortOrder === 1 ? 'asc' : (event?.sortOrder === -1 ? 'desc' : (this.lastLazyLoadEvent?.sortOrder === 1 ? 'asc' : 'desc'));

    const filters: { [key: string]: string } = {
      month: (this.selectedDate().getMonth() + 1).toString(),
      year: this.selectedDate().getFullYear().toString(),
    };
    if (this.selectedCategory()) {
      filters['categoryName'] = this.selectedCategory()!;
    }

    const startOfMonth = new Date(this.selectedDate().getFullYear(), this.selectedDate().getMonth(), 1, 0, 0, 0);
    const endOfMonth = new Date(this.selectedDate().getFullYear(), this.selectedDate().getMonth() + 1, 0, 23, 59, 59, 999);

    const currentQueryKey = JSON.stringify({
      accountId: id,
      pageNumber,
      pageSize,
      sortBy,
      sortOrder,
      filters,
      globalSearch: this.globalSearch(),
    });

    if (this.lastQueryKey === currentQueryKey) {
      return;
    }

    this.isLoading.set(true);
    if (event) this.lastLazyLoadEvent = event;

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

  onDateChange(event: any): void {
    if (event) {
      this.selectedDate.set(event);
      this.loadData();
    }
  }

  onCategoryChange(): void {
    this.loadData();
  }

  onSearch(): void {
    this.loadData();
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
        await this.accountState.refresh();
        this.loadData();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Transaction saved successfully' });
      }
    }
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
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Transaction deleted' });
          await this.accountState.refresh();
          await this.loadData();
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
          await this.accountState.refresh();
          await this.loadData();
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
      this.ref.onClose.subscribe((changed: boolean) => {
        if (changed) {
          this.loadData();
          this.accountState.refresh();
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
      this.ref.onClose.subscribe((changed: boolean) => {
        if (changed) {
          this.loadData();
          this.accountState.refresh();
        }
      });
    }
  }

  openPayCcBill(): void {
    const acc = this.currentAccount();
    if (!acc) return;

    this.ref = this.dialogService.open(PayCcBill, {
      header: 'Pay Credit Card Bill',
      width: '28rem',
      modal: true,
      data: {
        accountId: acc.id,
        accountName: acc.name,
        outstandingBalance: Math.abs(acc.balance)
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((changed: boolean) => {
        if (changed) {
          this.loadData();
          this.accountState.refresh();
        }
      });
    }
  }
}