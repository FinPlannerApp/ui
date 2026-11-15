import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AccountState } from '../../../core/state/account-state.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TransactionService } from '../../../features/transactions/transaction';
import { Category } from '../../../features/categories/category';
import { TransactionType } from '../../../core/models/transaction-type';
import { toDateOnlyString } from '../../../core/utils/date-utils';
import { sharedPrimeModules } from '../../prime-imports';
import { QuickAddService } from './quick-add.service';

const LAST_KEY = 'finplanner_quickadd_last';

/**
 * Fast entry: amount first, everything else remembered. The account and category default to what you used last
 * (or your defaults from Transaction settings). Rules still fill category/merchant/tags on the server when left empty.
 */
@Component({
  selector: 'app-quick-add',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './quick-add.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickAdd {
  readonly svc = inject(QuickAddService);
  private accountState = inject(AccountState);
  private transactions = inject(TransactionService);
  private categoryService = inject(Category);
  private settings = inject(UserSettingsService);
  private notify = inject(NotificationService);

  readonly TransactionType = TransactionType;
  amount = signal<number | null>(null);
  description = signal('');
  type = signal<TransactionType>(TransactionType.Expense);
  accountId = signal<number | null>(null);
  categoryId = signal<number | null>(null);
  saving = signal(false);
  categories = signal<any[]>([]);
  private loaded = false;

  accounts = computed(() => this.accountState.accounts().filter((a: any) => !a.isArchived));
  canSave = computed(() => !!this.amount() && this.amount()! > 0 && !!this.description().trim() && !!this.accountId() && !this.saving());

  constructor() {
    effect(() => { if (this.svc.visible()) void this.prepare(); });
  }

  private readLast(): { accountId?: number; categoryId?: number } {
    try { return JSON.parse(localStorage.getItem(LAST_KEY) ?? '{}') ?? {}; } catch { return {}; }
  }

  private async prepare(): Promise<void> {
    this.amount.set(null); this.description.set(''); this.type.set(TransactionType.Expense);
    if (!this.loaded) {
      this.loaded = true;
      try { await this.accountState.loadAccounts(); } catch { /* picker may be empty */ }
      try {
        const cats = await firstValueFrom(this.categoryService.getTransactionCategories());
        this.categories.set((cats ?? []).map((c: any) => ({ ...c, path: c.path ?? c.name })));
      } catch { /* optional */ }
    }
    let def: { defaultAccountId?: number | null; defaultCategoryId?: number | null } = {};
    try { def = await this.settings.getTransactions(); } catch { /* defaults */ }
    const last = this.readLast();
    const ids = new Set(this.accounts().map((a: any) => a.id));
    const acc = [last.accountId, def.defaultAccountId, this.accounts()[0]?.id].find(x => x && ids.has(x)) ?? null;
    this.accountId.set(acc as number | null);
    const cats = new Set(this.categories().map(c => c.id));
    const cat = [last.categoryId, def.defaultCategoryId].find(x => x && cats.has(x)) ?? null;
    this.categoryId.set(cat as number | null);
  }

  async save(again = false): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.transactions.upsertTransaction(this.accountId()!, {
        description: this.description().trim(),
        amount: this.amount()!,
        date: toDateOnlyString(new Date())!,
        type: this.type(),
        transactionCategoryId: this.categoryId(),
        merchantId: null,
        notes: null,
        tags: []
      } as any));
      try { localStorage.setItem(LAST_KEY, JSON.stringify({ accountId: this.accountId(), categoryId: this.categoryId() })); } catch { /* storage blocked */ }
      await this.accountState.refresh();
      this.notify.showSuccess('Transaction added.');
      if (again) { this.amount.set(null); this.description.set(''); } else this.svc.close();
    } catch (err: any) {
      this.notify.showError(err?.error?.message || err?.message || 'Could not save the transaction.');
    } finally { this.saving.set(false); }
  }
}
