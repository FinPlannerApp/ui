import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SliderModule } from 'primeng/slider';
import { firstValueFrom } from 'rxjs';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { BudgetProgress } from '../../../core/models/budget.model';
import { BudgetSettings, DEFAULT_BUDGET_SETTINGS, GeneralSettings, MAX_ALERT_PERCENT, MIN_ALERT_PERCENT } from '../../../core/models/user-settings.model';

@Component({
  selector: 'app-budget-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeader, SliderModule, ...sharedPrimeModules],
  templateUrl: './budget-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetSettingsPage implements OnInit {
  private settingsApi = inject(UserSettingsService);
  private api = inject(GenericApi);
  private notify = inject(NotificationService);

  readonly min = MIN_ALERT_PERCENT;
  readonly max = MAX_ALERT_PERCENT;

  settings = signal<BudgetSettings>({ ...DEFAULT_BUDGET_SETTINGS });
  general = signal<GeneralSettings>({ monthStartDay: 1 });
  budgets = signal<BudgetProgress[]>([]);
  loading = signal(true);
  saving = signal(false);
  savingBudgetId = signal<number | null>(null);

  /** Draft per-budget levels (budgetId → %), so dragging a slider doesn't save on every tick. */
  drafts = signal<Record<number, number>>({});

  threshold = computed(() => this.settings().defaultAlertPercent);
  /** Colour-zone preview: green up to the alert level, amber to 100 %. */
  zoneGradient = computed(() => {
    const t = this.threshold();
    return `linear-gradient(90deg, #10b981 0%, #10b981 ${t}%, #f59e0b ${t}%, #f59e0b 99.5%, #ef4444 100%)`;
  });

  async ngOnInit(): Promise<void> {
    try {
      const [s, g, p] = await Promise.all([
        this.settingsApi.getBudgets(),
        this.settingsApi.getGeneral(),
        firstValueFrom(this.api.get<BudgetProgress[]>('Budgets/progress'))
      ]);
      this.settings.set(s);
      this.general.set(g);
      if (p.isSuccess) this.budgets.set(p.value ?? []);
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not load budget settings.');
    } finally {
      this.loading.set(false);
    }
  }

  patch(p: Partial<BudgetSettings>): void {
    this.settings.update(s => ({ ...s, ...p }));
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      this.settings.set(await this.settingsApi.saveBudgets(this.settings()));
      this.notify.showSuccess('Budget settings saved.');
      // Budgets that follow the default now have a new effective level.
      const p = await firstValueFrom(this.api.get<BudgetProgress[]>('Budgets/progress'));
      if (p.isSuccess) this.budgets.set(p.value ?? []);
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not save.');
    } finally {
      this.saving.set(false);
    }
  }

  draftFor(b: BudgetProgress): number {
    return this.drafts()[b.budgetId] ?? b.alertThresholdPercent;
  }

  setDraft(b: BudgetProgress, v: number | number[] | null | undefined): void {
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === 'number') this.drafts.update(d => ({ ...d, [b.budgetId]: value }));
  }

  isDirty(b: BudgetProgress): boolean {
    const d = this.drafts()[b.budgetId];
    return d !== undefined && d !== b.alertThresholdPercent;
  }

  /** Saves a custom level for one budget, or clears it (null) to follow the default again. */
  async saveOverride(b: BudgetProgress, value: number | null): Promise<void> {
    this.savingBudgetId.set(b.budgetId);
    try {
      const res = await firstValueFrom(this.api.put<number | null>(`Budgets/${b.budgetId}/alert-threshold`, { alertThresholdPercent: value }));
      if (!res.isSuccess) throw new Error(res.error?.description || 'Could not save.');
      const effective = res.value ?? this.settings().defaultAlertPercent;
      this.budgets.update(list => list.map(x => x.budgetId === b.budgetId
        ? { ...x, alertThresholdPercent: effective, hasThresholdOverride: res.value != null }
        : x));
      this.drafts.update(d => { const { [b.budgetId]: _removed, ...rest } = d; return rest; });
      this.notify.showSuccess(value == null ? 'Using your default alert level.' : `Alert level set to ${value}%.`);
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not save.');
    } finally {
      this.savingBudgetId.set(null);
    }
  }
}
