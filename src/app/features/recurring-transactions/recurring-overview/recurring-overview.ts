import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { DEFAULT_RECURRING_SETTINGS, RecurringSettings } from '../../../core/models/user-settings.model';
import { RecurringTransaction, RecurrenceFrequency } from '../../../core/models/recurring-transaction.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { RECURRING_TABS } from '../recurring-tabs';
import { daysBetween, monthlyFactor, occurrencesBetween, startOfToday } from '../../../core/utils/recurrence-math';

interface Occurrence { id: number; description: string; account: string; amount: number; isIncome: boolean; date: Date; daysLeft: number; }

@Component({
  selector: 'app-recurring-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, ModuleTabs, CurrencyPipe, DatePipe, ...sharedPrimeModules],
  templateUrl: './recurring-overview.html',
  styleUrl: './recurring-overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringOverview implements OnInit {
  private api = inject(GenericApi);
  private settingsApi = inject(UserSettingsService);
  private notify = inject(NotificationService);

  readonly tabs = RECURRING_TABS;
  items = signal<RecurringTransaction[]>([]);
  settings = signal<RecurringSettings>({ ...DEFAULT_RECURRING_SETTINGS });
  loading = signal(true);
  animated = signal(false);

  active = computed(() => this.items().filter(i => i.isActive));
  paused = computed(() => this.items().filter(i => !i.isActive));
  listed = computed(() => this.settings().showPaused ? this.items() : this.items().filter(i => i.isActive));

  /** Average monthly money out / in from active, repeating items. */
  monthlyOut = computed(() => this.active().filter(i => i.type === 1).reduce((t, i) => t + i.amount * monthlyFactor(i.frequency), 0));
  monthlyIn = computed(() => this.active().filter(i => i.type === 0).reduce((t, i) => t + i.amount * monthlyFactor(i.frequency), 0));
  monthlyNet = computed(() => this.monthlyIn() - this.monthlyOut());

  horizon = computed(() => this.settings().lookAheadDays);

  occurrences = computed<Occurrence[]>(() => {
    const today = startOfToday();
    const to = new Date(today); to.setDate(to.getDate() + this.horizon());
    const out: Occurrence[] = [];
    for (const i of this.active()) {
      const end = i.endDate ? new Date(i.endDate) : null;
      for (const d of occurrencesBetween(new Date(i.nextProcessDate), i.frequency, to, end, 60)) {
        d.setHours(0, 0, 0, 0);
        if (d >= today) out.push({ id: i.id, description: i.description, account: i.accountName, amount: i.amount, isIncome: i.type === 0, date: d, daysLeft: daysBetween(today, d) });
      }
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  });
  outInWindow = computed(() => this.occurrences().filter(o => !o.isIncome).reduce((t, o) => t + o.amount, 0));
  inInWindow = computed(() => this.occurrences().filter(o => o.isIncome).reduce((t, o) => t + o.amount, 0));
  next10 = computed(() => this.occurrences().slice(0, 10));

  /** Week buckets across the look-ahead window: money out and in per week. */
  weeks = computed(() => {
    const n = Math.max(1, Math.ceil(this.horizon() / 7));
    const b = Array.from({ length: n }, (_, i) => ({ i, out: 0, inc: 0 }));
    for (const o of this.occurrences()) {
      const w = b[Math.min(n - 1, Math.floor(o.daysLeft / 7))];
      if (o.isIncome) w.inc += o.amount; else w.out += o.amount;
    }
    return b;
  });
  maxWeek = computed(() => Math.max(1, ...this.weeks().flatMap(w => [w.out, w.inc])));

  async ngOnInit(): Promise<void> {
    try {
      const [s, res] = await Promise.all([
        this.settingsApi.getRecurring(),
        firstValueFrom(this.api.search<RecurringTransaction>('RecurringTransactions', { pageNumber: 1, pageSize: 999 }))
      ]);
      this.settings.set(s);
      this.items.set(res.value?.data ?? []);
    } catch {
      this.notify.showError('Could not load recurring transactions.');
    } finally {
      this.loading.set(false);
      requestAnimationFrame(() => requestAnimationFrame(() => this.animated.set(true)));
    }
  }

  h(v: number): number { return this.animated() ? Math.min(100, v) : 0; }
  freqLabel(f: RecurrenceFrequency): string { return RecurrenceFrequency[f] ?? ''; }
  dueLabel(d: number): string { return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`; }
}
