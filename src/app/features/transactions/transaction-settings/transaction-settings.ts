import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { DEFAULT_TRANSACTION_SETTINGS, TransactionSettings } from '../../../core/models/user-settings.model';
import { GenericApi } from '../../../core/services/generic-api';
import { Category } from '../../categories/category';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { TRANSACTIONS_TABS } from '../transactions-tabs';

@Component({
  selector: 'app-transaction-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleTabs, ...sharedPrimeModules],
  templateUrl: './transaction-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionSettingsPage implements OnInit {
  private api = inject(UserSettingsService);
  private notify = inject(NotificationService);
  private apiService = inject(GenericApi);
  private categoryService = inject(Category);
  accounts = signal<any[]>([]);
  categories = signal<any[]>([]);

  readonly tabs = TRANSACTIONS_TABS;
  readonly guardOptions = [
    { label: 'Off', value: 0 }, { label: '3 seconds (default)', value: 3 }, { label: '10 seconds', value: 10 },
    { label: '30 seconds', value: 30 }, { label: '1 minute', value: 60 }, { label: '2 minutes', value: 120 }
  ];

  settings = signal<TransactionSettings>({ ...DEFAULT_TRANSACTION_SETTINGS });
  loading = signal(true);
  saving = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.settings.set(await this.api.getTransactions());
      try {
        const [accs, cats] = await Promise.all([
          firstValueFrom(this.apiService.search<any>('Accounts', { pageSize: 1000 })),
          firstValueFrom(this.categoryService.getTransactionCategories())
        ]);
        this.accounts.set(accs.value?.data ?? []);
        this.categories.set((cats ?? []).map((c: any) => ({ ...c, path: c.path ?? c.name })));
      } catch { /* pickers stay empty */ }
    }
    catch (err: any) { this.notify.showError(err?.message || 'Could not load settings.'); }
    finally { this.loading.set(false); }
  }

  patch(p: Partial<TransactionSettings>): void { this.settings.update(s => ({ ...s, ...p })); }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const s = this.settings();
      this.settings.set(await this.api.saveTransactions({ ...s, largeExpenseThreshold: Number(s.largeExpenseThreshold) || 0,
        quickCardsMax: Math.min(30, Math.max(0, Math.round(Number(s.quickCardsMax) || 0))),
        quickCardsMinUses: Math.min(20, Math.max(2, Math.round(Number(s.quickCardsMinUses) || 3))),
        quickCardsDays: Math.min(365, Math.max(14, Math.round(Number(s.quickCardsDays) || 120))) }));
      this.notify.showSuccess('Transaction settings saved.');
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not save.');
    } finally { this.saving.set(false); }
  }
}
