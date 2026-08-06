import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, finalize } from 'rxjs';
import { Transaction, TransactionService } from '../transaction';
import { ColumnDefinition, DataTable } from '../../../shared/components/data-table/data-table';
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
import { AccountSummary } from '../../dashboard/dashboard';
import { DashboardService } from '../../dashboard/dashboard';
import { AccountState } from '../../../core/state/account-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AccountType, InterestFrequency } from '../../../core/models/account-type.model';


@Component({
  selector: 'app-transaction-list',
  imports: [
    CommonModule,
    DataTable,
    FormsModule,
    StatCard,
    RouterLink,
    CardModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    ConfirmDialogModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    TooltipModule,
    FloatLabelModule,
    ...sharedPrimeModules
  ],
  templateUrl: './transaction-list.html',
  styleUrl: './transaction-list.scss',
  providers: [DialogService, MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionList implements OnInit {
  private route = inject(ActivatedRoute);
  private transactionService = inject(TransactionService);
  private dashboardService = inject(DashboardService);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private accountState = inject(AccountState);
  private notificationService = inject(NotificationService);
  private breadcrumbService = inject(BreadcrumbService);
  private cdr = inject(ChangeDetectorRef);

  transactions = signal<Transaction[]>([]);
  isLoading = signal(false);
  accountId = signal<number | null>(null);
  ref: DynamicDialogRef | null = null;
  summary = signal<AccountSummary | null>(null);

  // Exposes the enum to the template for the @if checks below.
  readonly AccountType = AccountType;

  // Looks up the FULL account object (with type/details) from the
  // already-loaded AccountState — no new API call needed, this data has
  // been flowing through the existing accounts endpoint since the
  // account-type backend package. Recomputes automatically whenever
  // either accountId or the account list itself changes.
  currentAccount = computed(() => {
    const id = this.accountId();
    if (id === null) return null;
    return this.accountState.accounts().find(a => a.id === id) ?? null;
  });

  // "How much would accrue in ONE period at today's balance and rate" —
  // deliberately labeled as an estimate in the template, not a precise
  // guarantee. Real interest calculations depend on exact compounding
  // method and day-count convention, which isn't something this app
  // tracks — this is a simple, clearly-approximate figure, not meant to
  // replace what the bank itself actually credits.
  estimatedInterest = computed(() => {
    const account = this.currentAccount();
    const details = account?.bankAccountDetails;
    if (!details?.interestRate) return null;

    const periodsPerYear = details.interestFrequency === InterestFrequency.Daily ? 365
      : details.interestFrequency === InterestFrequency.Monthly ? 12
      : details.interestFrequency === InterestFrequency.Quarterly ? 4
      : 1; // Yearly

    return (account!.balance * (details.interestRate / 100)) / periodsPerYear;
  });

  interestFrequencyLabel(freq: InterestFrequency | null | undefined): string {
    switch (freq) {
      case InterestFrequency.Daily: return 'day';
      case InterestFrequency.Monthly: return 'month';
      case InterestFrequency.Quarterly: return 'quarter';
      case InterestFrequency.Yearly: return 'year';
      default: return 'period';
    }
  }

  // Separate from the noun form above ("per day") — "day" + "ly" isn't
  // "daily", so this can't just concatenate "ly" onto interestFrequencyLabel.
  interestFrequencyAdverb(freq: InterestFrequency | null | undefined): string {
    switch (freq) {
      case InterestFrequency.Daily: return 'Daily';
      case InterestFrequency.Monthly: return 'Monthly';
      case InterestFrequency.Quarterly: return 'Quarterly';
      case InterestFrequency.Yearly: return 'Yearly';
      default: return '—';
    }
  }
  totalRecords = signal(0);
  rows = signal(10);
  lastLazyLoadEvent: any;
  ready = signal(false);

  // Filter state (Using Signals)
  selectedDate = signal<Date>(new Date());
  selectedCategory = signal<string | null>(null);
  globalSearch = signal<string>('');
  categoryOptions = signal<{ label: string; value: string }[]>([]);

  private lastQueryKey: string | null = null;

  transactionColumns: ColumnDefinition[] = [
    { field: 'date', header: 'Date', isDate: true, sortable: true },
    { field: 'description', header: 'Description', sortable: true },
    { field: 'categoryName', header: 'Category', sortable: true },
    { field: 'amount', header: 'Amount', isCurrency: true, isTransaction: true, sortable: true },
  ];

  constructor() {
    this.selectedDate.update(d => {
      const startOfMonth = new Date(d);
      startOfMonth.setDate(1);
      return startOfMonth;
    }); // canonical start of month — creates a new Date and notifies the signal properly,
    // instead of mutating the held object in place with no change notification
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

    // Load available categories for filtering
    try {
      const result = await firstValueFrom(this.transactionService.getAllTransactions({ pageNumber: 1, pageSize: 1, filters: {} }));
      this.categoryOptions.set(result.availableCategories.map(c => ({ label: c, value: c })));
    } catch (e) {
      console.warn('Could not load category options');
    }

    this.ready.set(true);
    this.cdr.markForCheck();
  }

  async loadData(event?: any): Promise<void> {
    const id = this.accountId();
    if (id === null || this.isLoading()) return;

    // 1. Determine current state
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

    // 2. Create a unique key for this query to prevent infinite loops
    const currentQueryKey = JSON.stringify({
      accountId: id,
      pageNumber,
      pageSize,
      sortBy,
      sortOrder,
      filters,
      globalSearch: this.globalSearch(),
    });

    if (this.lastQueryKey === currentQueryKey && this.transactions().length > 0) {
      return;
    }

    this.isLoading.set(true);
    if (event) this.lastLazyLoadEvent = event;

    try {
      this.lastQueryKey = currentQueryKey;

      // --- FETCH BOTH DATASETS IN PARALLEL ---
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

      // Update Breadcrumbs
      const accountName = this.accountState.accounts().find(a => a.id === id)?.name || 'Account';
      this.breadcrumbService.setItems([
        { label: 'Accounts', routerLink: '/app/accounts' },
        { label: accountName },
        { label: 'Transactions' }
      ]);
    } catch (err) {
      console.error('Failed to load account transactions', err);
      this.lastQueryKey = null; // Allow retry on error
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
    if (this.accountId() === null) return; // Guard against early calls
    this.loadData(event);
  }

  onFilterChange(): void {
    this.loadData(this.lastLazyLoadEvent);
  }

  async showTransactionForm(transactionToEdit?: Transaction): Promise<void> {
    const isEditMode = !!transactionToEdit;
    this.ref = this.dialogService.open(TransactionForm, {
      header: isEditMode ? 'Edit Transaction' : 'Add a New Transaction',
      width: '400px',
      modal: true,
      closable: true,
      data: {
        transaction: transactionToEdit,
        currentAccountId: this.accountId() // Pass the current account ID to the form
      }
    });

    if (this.ref) {
      const result = await firstValueFrom(this.ref.onClose);
      if (result) {
        this.loadData();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Operation successful' });
      }
    }
  }

  deleteTransaction(transaction: Transaction): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this transaction?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
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
      header: 'Switch Transaction Account',
      width: '400px',
      modal: true,
      data: { currentAccountId: this.accountId() }
    });

    if (this.ref) {
      const result = await firstValueFrom(this.ref.onClose);

      if (result && result.destinationAccountId) {
        try {
          await firstValueFrom(this.transactionService.switchAccount(this.accountId()!, transaction.id, result.destinationAccountId));
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Transaction switched successfully' });
          await this.accountState.refresh();
          await this.loadData();
        } catch (err: any) {
          this.notificationService.showError('Failed to switch transaction target');
        }
      }
    }
  }
}