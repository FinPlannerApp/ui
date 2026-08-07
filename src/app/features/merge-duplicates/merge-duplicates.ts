import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Account } from '../accounts/account';
import { AccountCategory, Category } from '../categories/category';
import { AccountState } from '../../core/state/account-state.service';
import { GenericApi } from '../../core/services/generic-api';
import { NotificationService } from '../../core/services/notification.service';
import { sharedPrimeModules } from '../../shared/prime-imports';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-merge-duplicates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './merge-duplicates.html',
})
export class MergeDuplicates implements OnInit {
  accountState = inject(AccountState);
  private categoryService = inject(Category);
  private api = inject(GenericApi);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService);

  categories = signal<AccountCategory[]>([]);

  // Accounts section state
  sourceAccountId = signal<number | null>(null);
  targetAccountId = signal<number | null>(null);
  finalBalance = signal<number>(0);
  isMergingAccounts = signal(false);

  // Categories section state
  sourceCategoryId = signal<number | null>(null);
  targetCategoryId = signal<number | null>(null);
  isMergingCategories = signal(false);

  sourceAccount = computed(() =>
    this.accountState.accounts().find(a => a.id === this.sourceAccountId()) ?? null
  );
  targetAccount = computed(() =>
    this.accountState.accounts().find(a => a.id === this.targetAccountId()) ?? null
  );
  suggestedBalance = computed(() => {
    const s = this.sourceAccount();
    const t = this.targetAccount();
    if (!s || !t) return 0;
    return s.balance + t.balance;
  });

  affectedAccountsForCategory = computed(() => {
    const id = this.sourceCategoryId();
    if (!id) return [];
    // Matches by ID, not name — matching by name would be exactly wrong
    // given duplicate category names are the problem this feature exists
    // to fix in the first place.
    return this.accountState.accounts().filter(a => a.accountCategoryId === id);
  });

  async ngOnInit(): Promise<void> {
    const cats = await firstValueFrom(this.categoryService.getAccountCategories());
    this.categories.set(cats);
  }

  // Whenever source/target account selection changes, reset the
  // suggested balance to the sum — the user can still edit it afterward,
  // this just keeps the default sensible as selections change.
  onAccountSelectionChange(): void {
    this.finalBalance.set(this.suggestedBalance());
  }

  confirmMergeAccounts(): void {
    const source = this.sourceAccount();
    const target = this.targetAccount();
    if (!source || !target) return;

    this.confirmationService.confirm({
      header: 'Confirm Account Merge',
      message: `Move every transaction from "${source.name}" (${source.balance}) into "${target.name}" (${target.balance})? ` +
        `"${target.name}" will end up with a balance of ${this.finalBalance()}. "${source.name}" will be removed. This can't be easily undone.`,
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.isMergingAccounts.set(true);
        try {
          await firstValueFrom(this.api.post<boolean>('Accounts/merge', {
            sourceAccountId: source.id,
            targetAccountId: target.id,
            finalBalance: this.finalBalance()
          }));
          this.notificationService.showSuccess('Accounts merged.');
          this.sourceAccountId.set(null);
          this.targetAccountId.set(null);
          await this.accountState.refresh();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to merge accounts.');
        } finally {
          this.isMergingAccounts.set(false);
        }
      }
    });
  }

  confirmMergeCategories(): void {
    const sourceId = this.sourceCategoryId();
    const targetId = this.targetCategoryId();
    if (!sourceId || !targetId) return;

    const sourceName = this.categories().find(c => c.id === sourceId)?.name;
    const targetName = this.categories().find(c => c.id === targetId)?.name;
    const affectedCount = this.affectedAccountsForCategory().length;

    this.confirmationService.confirm({
      header: 'Confirm Category Merge',
      message: `Move ${affectedCount} account(s) from "${sourceName}" into "${targetName}"? "${sourceName}" will be removed. This can't be easily undone.`,
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.isMergingCategories.set(true);
        try {
          await firstValueFrom(this.api.post<boolean>('AccountCategories/merge', {
            sourceCategoryId: sourceId,
            targetCategoryId: targetId
          }));
          this.notificationService.showSuccess('Categories merged.');
          this.sourceCategoryId.set(null);
          this.targetCategoryId.set(null);
          const cats = await firstValueFrom(this.categoryService.getAccountCategories());
          this.categories.set(cats);
          await this.accountState.refresh();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to merge categories.');
        } finally {
          this.isMergingCategories.set(false);
        }
      }
    });
  }
}
