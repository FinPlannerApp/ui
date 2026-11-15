import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { DEFAULT_SUBSCRIPTION_SETTINGS, SubscriptionSettings } from '../../../core/models/user-settings.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { SUBSCRIPTIONS_TABS } from '../subscriptions-tabs';

@Component({
  selector: 'app-subscription-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleTabs, ...sharedPrimeModules],
  templateUrl: './subscription-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionSettingsPage implements OnInit {
  private api = inject(UserSettingsService);
  private notify = inject(NotificationService);

  readonly tabs = SUBSCRIPTIONS_TABS;
  readonly alertOptions = [
    { label: 'Off', value: 0 }, { label: '1 day before', value: 1 }, { label: '3 days before', value: 3 }, { label: '7 days before', value: 7 },
    { label: '14 days before', value: 14 }, { label: '30 days before', value: 30 }
  ];
  settings = signal<SubscriptionSettings>({ ...DEFAULT_SUBSCRIPTION_SETTINGS });
  loading = signal(true);
  saving = signal(false);

  async ngOnInit(): Promise<void> {
    try { this.settings.set(await this.api.getSubscriptions()); }
    catch (err: any) { this.notify.showError(err?.message || 'Could not load settings.'); }
    finally { this.loading.set(false); }
  }

  patch(p: Partial<SubscriptionSettings>): void { this.settings.update(s => ({ ...s, ...p })); }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const s = this.settings();
      this.settings.set(await this.api.saveSubscriptions({ ...s, monthlyTarget: Number(s.monthlyTarget) || 0 }));
      this.notify.showSuccess('Subscription settings saved.');
    } catch (err: any) { this.notify.showError(err?.message || 'Could not save.'); }
    finally { this.saving.set(false); }
  }
}
