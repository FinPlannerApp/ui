import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction, TransactionService, TransactionPageResult, TransactionQueryParams } from '../transaction';
import { ColumnDefinition, DataTable } from '../../../shared/components/data-table/data-table';
import { firstValueFrom } from 'rxjs';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService, SelectItem } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TransactionForm } from '../transaction-form/transaction-form';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { Router } from '@angular/router';
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { FieldsetModule } from 'primeng/fieldset';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

interface MonthOption {
  label: string;
  value: number;
}

interface YearOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-transactions-page',
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    PaginatorModule,
    ProgressSpinnerModule,
    DataTable,
    MultiSelectModule,
    InputTextModule,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    FieldsetModule,
    IconFieldModule,
    InputIconModule
  ],
  providers: [DialogService],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsPage implements OnInit {
  private transactionService = inject(TransactionService);
  private cdr = inject(ChangeDetectorRef);
  private dialogService = inject(DialogService); // Added
  private messageService = inject(MessageService); // Added
  private confirmationService = inject(ConfirmationService); // Added
  private router = inject(Router); // Added

  // --- Filter state ---
  selectedDate: Date = new Date();
  selectedCategory: string | null = null;
  globalSearch: string = '';
  categoryOptions: { label: string; value: string }[] = [];

  // --- Data state ---
  transactions: Transaction[] = [];
  totalRecords = 0;
  pageSize = 10;
  currentPage = 1;
  isLoading = false;
  ready = false;
  lastLazyLoadEvent: any;
  private lastQueryKey: string | null = null;

  // --- Summary ---
  balanceBF = 0;
  totalIncome = 0;
  totalExpenses = 0;
  totalSavings = 0;
  closingBalance = 0;

  // --- Table columns ---
  transactionColumns: ColumnDefinition[] = [
    { field: 'date', header: 'Date', isDate: true },
    { field: 'accountName', header: 'Account' },
    { field: 'description', header: 'Description' },
    { field: 'categoryName', header: 'Category' },
    { field: 'amount', header: 'Amount', isCurrency: true, isTransaction: true },
  ];

  constructor() {
    const now = new Date();
    this.selectedDate = new Date();
    this.selectedDate.setDate(1); // canonical start of month
  }

  ngOnInit(): void {
    this.ready = true;
  }

  onDateChange(event: any): void {
    if (event) {
      this.selectedDate = event;
      this.currentPage = 1;
      this.fetchTransactions();
    }
  }

  onCategoryChange(): void {
    this.currentPage = 1;
    this.fetchTransactions();
  }

  clearCategoryFilter(): void {
    this.selectedCategory = null;
    this.currentPage = 1;
    this.fetchTransactions();
  }

  onLazyLoad(event: any): void {
    if (this.isLoading) return;
    this.lastLazyLoadEvent = event;
    this.fetchTransactions(event);
  }

  async fetchTransactions(event?: any): Promise<void> {
    if (this.isLoading) return;
    
    // 1. Determine current state
    const pageNumber = event ? Math.floor(event.first / event.rows) + 1 : this.currentPage;
    const pageSize = event ? event.rows : this.pageSize;
    const sortBy = event?.sortField || this.lastLazyLoadEvent?.sortField || 'date';
    const sortOrder = event?.sortOrder === 1 ? 'asc' : (event?.sortOrder === -1 ? 'desc' : (this.lastLazyLoadEvent?.sortOrder === 1 ? 'asc' : 'desc'));
    
    const filters: { [key: string]: string } = {
      month: (this.selectedDate.getMonth() + 1).toString(),
      year: this.selectedDate.getFullYear().toString(),
    };
    if (this.selectedCategory) {
      filters['categoryName'] = this.selectedCategory;
    }

    // 2. Create a unique key for this query to prevent infinite loops
    const currentQueryKey = JSON.stringify({
      pageNumber,
      pageSize,
      sortBy,
      sortOrder,
      filters,
      globalSearch: this.globalSearch
    });

    if (this.lastQueryKey === currentQueryKey && this.transactions.length > 0) {
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      this.lastQueryKey = currentQueryKey;
      this.currentPage = pageNumber;
      this.pageSize = pageSize;

      const queryParams: TransactionQueryParams = {
        pageNumber,
        pageSize,
        filters,
        globalSearch: this.globalSearch,
        sortBy,
        sortOrder
      };

      const result = await firstValueFrom(this.transactionService.getAllTransactions(queryParams));

      // Update transaction data
      this.transactions = result.transactions.data;
      this.totalRecords = result.transactions.totalRecords;

      // Update summary
      this.balanceBF = result.balanceBroughtForward;
      this.totalIncome = result.totalIncome;
      this.totalExpenses = result.totalExpenses;
      this.totalSavings = result.totalSavings;
      this.closingBalance = this.balanceBF + this.totalSavings;

      // Update categories
      this.categoryOptions = result.availableCategories.map(c => ({ label: c, value: c }));

    } catch (err) {
      console.error('Failed to load transactions', err);
      this.lastQueryKey = null; // Allow retry on error
    } finally {
      this.isLoading = false;
      this.ready = true;
      this.cdr.markForCheck();
    }
  }

  // --- Actions ---

  goToDashboard() {
    this.router.navigate(['/app/dashboard']);
  }

  goToBulkAdd() {
    this.router.navigate(['/app/bulk-transaction-add']);
  }

  onFilterChange() {
    this.lastLazyLoadEvent = null;
    this.currentPage = 1;
    this.fetchTransactions();
  }

  onSearch() {
    this.lastLazyLoadEvent = null;
    this.currentPage = 1;
    this.fetchTransactions();
  }

  clearSearch() {
    this.globalSearch = '';
    this.onSearch();
  }

  editTransaction(transaction: Transaction) {
    const ref = this.dialogService.open(TransactionForm, {
      header: 'Edit Transaction',
      width: '50vw',
      data: {
        transaction: transaction,
        currentAccountId: transaction.accountId
      }
    });

    ref.onClose.subscribe((result: boolean) => {
      if (result) {
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Transaction updated successfully' });
        this.fetchTransactions();
      }
    });
  }

  deleteTransaction(transaction: Transaction) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this transaction: "${transaction.description}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.transactionService.deleteTransaction(transaction.accountId, transaction.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Transaction deleted successfully' });
            this.fetchTransactions();
          },
          error: (err) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to delete transaction' });
          }
        });
      }
    });
  }
}
