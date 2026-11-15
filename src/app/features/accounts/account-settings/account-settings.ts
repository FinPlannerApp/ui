import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { AccountSettings, DEFAULT_ACCOUNT_SETTINGS } from '../../../core/models/user-settings.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { ACCOUNTS_TABS } from '../accounts-tabs';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModuleTabs, ...sharedPrimeModules],
  templateUrl: './account-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountSettingsPage implements OnInit {
  private api = inject(UserSettingsService);
  private notify = inject(NotificationService);

  readonly tabs = ACCOUNTS_TABS;
  readonly dueOptions = [
    { label: 'Off', value: 0 }, { label: '1 day', value: 1 }, { label: '3 days', value: 3 }, { label: '5 days', value: 5 },
    { label: '7 days', value: 7 }, { label: '10 days', value: 10 }, { label: '14 days', value: 14 }
  ];

  settings = signal<AccountSettings>({ ...DEFAULT_ACCOUNT_SETTINGS });
  loading = signal(true);
  saving = signal(false);

  async ngOnInit(): Promise<void> {
    try { this.settings.set(await this.api.getAccounts()); }
    catch (err: any) { this.notify.showError(err?.message || 'Could not load settings.'); }
    finally { this.loading.set(false); }
  }

  patch(p: Partial<AccountSettings>): void { this.settings.update(s => ({ ...s, ...p })); }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      this.settings.set(await this.api.saveAccounts({ ...this.settings(), lowBalanceThreshold: Number(this.settings().lowBalanceThreshold) || 0 }));
      this.notify.showSuccess('Account settings saved.');
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not save.');
    } finally { this.saving.set(false); }
  }
}
