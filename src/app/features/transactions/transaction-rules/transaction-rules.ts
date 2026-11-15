import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { Category } from '../../categories/category';
import { MerchantService } from '../../merchants/merchant.service';
import { TransactionRule, UpsertTransactionRule } from '../../../core/models/transaction-rule.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { TRANSACTIONS_TABS } from '../transactions-tabs';

@Component({
  selector: 'app-transaction-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleTabs, ...sharedPrimeModules],
  templateUrl: './transaction-rules.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionRulesPage implements OnInit {
  private api = inject(GenericApi);
  private notify = inject(NotificationService);
  private categoryService = inject(Category);
  private merchantService = inject(MerchantService);

  readonly tabs = TRANSACTIONS_TABS;
  readonly modes = [{ label: 'contains', value: 0 }, { label: 'starts with', value: 1 }, { label: 'is exactly', value: 2 }];
  readonly types = [{ label: 'Any type', value: null }, { label: 'Expense only', value: 1 }, { label: 'Income only', value: 0 }];

  rules = signal<TransactionRule[]>([]);
  categories = signal<any[]>([]);
  merchants = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  editing = signal<UpsertTransactionRule | null>(null);
  tagText = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const [rules, cats, mers] = await Promise.all([
        firstValueFrom(this.api.get<TransactionRule[]>('transaction-rules')),
        firstValueFrom(this.categoryService.getTransactionCategories()),
        this.merchantService.getAll()
      ]);
      this.rules.set(rules.value ?? []);
      this.categories.set((cats ?? []).map((c: any) => ({ ...c, path: c.path ?? c.name })));
      this.merchants.set(mers);
    } catch (err: any) { this.notify.showError(err?.message || 'Could not load rules.'); }
    finally { this.loading.set(false); }
  }

  startNew(): void {
    this.tagText.set('');
    this.editing.set({ name: '', matchText: '', matchMode: 0, typeFilter: null, minAmount: null, maxAmount: null,
      transactionCategoryId: null, merchantId: null, tags: [], priority: (this.rules().at(-1)?.priority ?? 90) + 10, isActive: true });
  }

  edit(r: TransactionRule): void {
    this.tagText.set(r.tags.join(', '));
    this.editing.set({ ...r });
  }

  patch(p: Partial<UpsertTransactionRule>): void { this.editing.update(e => e ? { ...e, ...p } : e); }

  describe(r: TransactionRule): string {
    const parts: string[] = [];
    if (r.categoryName) parts.push('category ' + r.categoryName);
    if (r.merchantName) parts.push('merchant ' + r.merchantName);
    if (r.tags.length) parts.push('tags ' + r.tags.map(t => '#' + t).join(' '));
    return parts.join(' · ');
  }

  modeLabel(m: number): string { return this.modes.find(x => x.value === m)?.label ?? 'contains'; }

  async save(): Promise<void> {
    const e = this.editing();
    if (!e || this.saving()) return;
    if (!e.matchText?.trim()) { this.notify.showError('Enter the text to look for.'); return; }
    const tags = this.tagText().split(/[,\s]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
    if (!e.transactionCategoryId && !e.merchantId && tags.length === 0) { this.notify.showError('Choose a category, merchant or tag to apply.'); return; }
    this.saving.set(true);
    try {
      const res = await firstValueFrom(this.api.post<TransactionRule>('transaction-rules/upsert', { ...e, tags }));
      if (!res.isSuccess) { this.notify.showError((res as any).error?.description || (res as any).message || 'Could not save the rule.'); return; }
      this.rules.set((await firstValueFrom(this.api.get<TransactionRule[]>('transaction-rules'))).value ?? []);
      this.editing.set(null);
      this.notify.showSuccess('Rule saved.');
    } catch (err: any) { this.notify.showError(err?.error?.message || err?.message || 'Could not save the rule.'); }
    finally { this.saving.set(false); }
  }

  async toggle(r: TransactionRule): Promise<void> {
    try {
      await firstValueFrom(this.api.post<TransactionRule>('transaction-rules/upsert', { ...r, isActive: !r.isActive }));
      this.rules.update(l => l.map(x => x.id === r.id ? { ...x, isActive: !r.isActive } : x));
    } catch { this.notify.showError('Could not update the rule.'); }
  }

  async remove(r: TransactionRule): Promise<void> {
    if (!window.confirm(`Delete the rule "${r.name}"? Existing transactions are not changed.`)) return;
    try {
      await firstValueFrom(this.api.post<boolean>('transaction-rules/delete', { id: r.id }));
      this.rules.update(l => l.filter(x => x.id !== r.id));
    } catch { this.notify.showError('Could not delete the rule.'); }
  }
}
