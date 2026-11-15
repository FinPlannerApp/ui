import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { DEFAULT_RECURRING_SETTINGS, RecurringSettings } from '../../../core/models/user-settings.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { RECURRING_TABS } from '../recurring-tabs';

@Component({
  selector: 'app-recurring-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleTabs, ...sharedPrimeModules],
  templateUrl: './recurring-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringSettingsPage implements OnInit {
  private api = inject(UserSettingsService);
  private notify = inject(NotificationService);

  readonly tabs = RECURRING_TABS;
  readonly lookOptions = [7, 14, 30, 60, 90, 180].map(v => ({ label: `${v} days`, value: v }));
  settings = signal<RecurringSettings>({ ...DEFAULT_RECURRING_SETTINGS });
  loading = signal(true);
  saving = signal(false);

  async ngOnInit(): Promise<void> {
    try { this.settings.set(await this.api.getRecurring()); }
    catch (err: any) { this.notify.showError(err?.message || 'Could not load settings.'); }
    finally { this.loading.set(false); }
  }

  patch(p: Partial<RecurringSettings>): void { this.settings.update(s => ({ ...s, ...p })); }

  async save(): Promise<void> {
    this.saving.set(true);
    try { this.settings.set(await this.api.saveRecurring(this.settings())); this.notify.showSuccess('Recurring settings saved.'); }
    catch (err: any) { this.notify.showError(err?.message || 'Could not save.'); }
    finally { this.saving.set(false); }
  }
}
