import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { AccountState } from '../../../core/state/account-state.service';
import { Account } from '../account';
import { AccountForm } from '../account-form/account-form';
import { AdjustBalance } from '../adjust-balance/adjust-balance';
import { NotificationService } from '../../../core/services/notification.service';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';
import { Category, AccountCategory } from '../../categories/category';
import { AutoMarqueeDirective } from '../../../shared/directives/auto-marquee.directive';
import { firstValueFrom } from 'rxjs';

export interface CategoryFilterOption {
  label: string;
  value: string;
  icon: string;
}

import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { StatCard } from '../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AutoMarqueeDirective, EmptyState, StatCard, ...sharedPrimeModules],
  templateUrl: './accounts-page.html',
  providers: [DialogService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsPage implements OnInit {
  public accountState = inject(AccountState);
  private categoryService = inject(Category);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);
  private breadcrumbService = inject(BreadcrumbService);
  private router = inject(Router);

  // State & Filter Signals
  searchTerm = signal<string>('');
  selectedCategoryFilter = signal<string>('all'); // 'all' or category ID/name
  viewMode = signal<'grid' | 'table'>('grid');
  sortBy = signal<'name' | 'balance_desc' | 'balance_asc' | 'category'>('balance_desc');
  ref: DynamicDialogRef | null = null;
  userCategories = signal<AccountCategory[]>([]);

  sortOptions = [
    { label: 'Highest Balance', value: 'balance_desc' },
    { label: 'Lowest Balance', value: 'balance_asc' },
    { label: 'Account Name', value: 'name' },
    { label: 'Category', value: 'category' }
  ];

  // Dynamic category filter options created directly from user's account categories
  categoryFilterOptions = computed<CategoryFilterOption[]>(() => {
    const options: CategoryFilterOption[] = [
      { label: 'All Categories', value: 'all', icon: 'pi pi-th-large' }
    ];

    const cats = this.userCategories();
    cats.forEach(cat => {
      options.push({
        label: cat.name,
        value: cat.id ? cat.id.toString() : cat.name,
        icon: this.getCategoryIconByName(cat.name)
      });
    });

    return options;
  });

  // Computed Financial Overview KPIs
  rawAccounts = this.accountState.accounts;
  isLoading = this.accountState.isLoading;

  totalAssetBalance = computed(() => {
    return this.rawAccounts()
      .filter(a => !this.isLiabilityAccount(a) && a.balance > 0)
      .reduce((sum, a) => sum + a.balance, 0);
  });

  totalLiabilities = computed(() => {
    return this.rawAccounts()
      .reduce((sum, a) => {
        if (this.isLiabilityAccount(a)) {
          return sum + Math.abs(a.balance);
        } else if (a.balance < 0) {
          return sum + Math.abs(a.balance);
        }
        return sum;
      }, 0);
  });

  netWorth = computed(() => {
    return this.totalAssetBalance() - this.totalLiabilities();
  });

  totalAccountsCount = computed(() => this.rawAccounts().length);
  assetAccountsCount = computed(() => this.rawAccounts().filter(a => !this.isLiabilityAccount(a)).length);
  liabilityAccountsCount = computed(() => this.rawAccounts().filter(a => this.isLiabilityAccount(a)).length);

  // Filtered & Sorted Accounts List
  filteredAccounts = computed(() => {
    let list = [...this.rawAccounts()];

    // Search filter
    const query = this.searchTerm().trim().toLowerCase();
    if (query) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(query) ||
        (a.accountCategoryName && a.accountCategoryName.toLowerCase().includes(query))
      );
    }

    // Category filter
    const catFilter = this.selectedCategoryFilter();
    if (catFilter !== 'all') {
      const catId = parseInt(catFilter, 10);
      if (!isNaN(catId)) {
        list = list.filter(a => a.accountCategoryId === catId);
      } else {
        list = list.filter(a => a.accountCategoryName && a.accountCategoryName.toLowerCase() === catFilter.toLowerCase());
      }
    }

    // Sort
    const sort = this.sortBy();
    list.sort((a, b) => {
      if (sort === 'balance_desc') return b.balance - a.balance;
      if (sort === 'balance_asc') return a.balance - b.balance;
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'category') return (a.accountCategoryName || '').localeCompare(b.accountCategoryName || '');
      return 0;
    });

    return list;
  });

  async ngOnInit(): Promise<void> {
    this.breadcrumbService.setItems([
      { label: 'Accounts & Balances' }
    ]);

    // Handle soft refresh from breadcrumb button
    this.breadcrumbService.refresh$.subscribe(() => {
      this.refreshData();
    });

    await Promise.all([
      this.loadCategories(),
      this.accountState.loadAccounts()
    ]);
  }

  async loadCategories(): Promise<void> {
    try {
      const cats = await firstValueFrom(this.categoryService.getAccountCategories());
      if (cats) {
        this.userCategories.set(cats);
      }
    } catch {
      // Non-critical categories load
    }
  }

  async refreshData(): Promise<void> {
    await Promise.all([
      this.loadCategories(),
      this.accountState.refresh()
    ]);
  }

  isLiabilityAccount(acc: Account): boolean {
    if (acc.isLiability) return true;
    const catLower = (acc.accountCategoryName || '').toLowerCase();
    return catLower.includes('card') || catLower.includes('credit') || catLower.includes('loan') || catLower.includes('mortgage') || catLower.includes('debt');
  }

  getCategoryIconByName(catName: string): string {
    const lower = (catName || '').toLowerCase();
    if (lower.includes('card') || lower.includes('credit')) return 'pi pi-credit-card';
    if (lower.includes('bank') || lower.includes('savings') || lower.includes('checking')) return 'pi pi-wallet';
    if (lower.includes('cash') || lower.includes('wallet')) return 'pi pi-money-bill';
    if (lower.includes('loan') || lower.includes('debt') || lower.includes('mortgage')) return 'pi pi-building-columns';
    if (lower.includes('investment') || lower.includes('stock')) return 'pi pi-chart-line';
    return 'pi pi-box';
  }

  getAccountIcon(acc: Account): string {
    return this.getCategoryIconByName(acc.accountCategoryName || '');
  }

  getAccountBadgeColor(acc: Account): { bg: string, text: string, border: string, badgeSeverity: 'success' | 'warn' | 'danger' | 'info' | 'secondary' } {
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

  getCreditUtilizationPercent(acc: Account): number {
    if (!acc.creditCardDetails || !acc.creditCardDetails.creditLimit || acc.creditCardDetails.creditLimit <= 0) return 0;
    const used = Math.abs(acc.balance);
    const percent = Math.round((used / acc.creditCardDetails.creditLimit) * 100);
    return Math.min(percent, 100);
  }

  openCreateForm(): void {
    this.ref = this.dialogService.open(AccountForm, {
      header: 'Create New Account',
      width: '560px',
      style: { maxWidth: '94vw' },
      modal: true,
      closable: true,
      dismissableMask: false
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: boolean) => {
        if (result) {
          this.refreshData();
        }
      });
    }
  }

  openEditForm(acc: Account): void {
    this.ref = this.dialogService.open(AccountForm, {
      header: `Edit "${acc.name}"`,
      width: '560px',
      style: { maxWidth: '94vw' },
      modal: true,
      closable: true,
      dismissableMask: false,
      data: {
        itemToEdit: acc
      }
    });

    if (this.ref) {
      this.ref.onClose.subscribe((result: boolean) => {
        if (result) {
          this.refreshData();
        }
      });
    }
  }

  confirmDelete(acc: Account): void {
    this.confirmationService.confirm({
      header: 'Delete Account',
      message: `Are you sure you want to delete account "${acc.name}"? Transactions associated with this account will remain saved.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.accountState.deleteAccount(acc.id);
          this.notificationService.showSuccess(`Account "${acc.name}" deleted successfully.`);
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to delete account.');
        }
      }
    });
  }

  viewTransactions(acc: Account): void {
    this.router.navigate(['/app/accounts', acc.id, 'transactions']);
  }

  openAdjustBalance(acc: Account): void {
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
          this.refreshData();
        }
      });
    }
  }
}
