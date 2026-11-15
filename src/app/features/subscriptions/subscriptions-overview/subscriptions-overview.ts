import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SubscriptionService } from '../subscription.service';
import { Subscription } from '../../../core/models/subscription.model';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { DEFAULT_SUBSCRIPTION_SETTINGS, SubscriptionSettings } from '../../../core/models/user-settings.model';
import { NotificationService } from '../../../core/services/notification.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { SUBSCRIPTIONS_TABS } from '../subscriptions-tabs';
import { daysBetween, monthlyFactor, occurrencesBetween, startOfToday, toFrequency } from '../../../core/utils/recurrence-math';

const PALETTE = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16', '#f97316'];
const HORIZON_DAYS = 60;

interface Renewal { id: number; name: string; amount: number; date: Date; daysLeft: number; }

@Component({
  selector: 'app-subscriptions-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, ModuleTabs, CurrencyPipe, DatePipe, DecimalPipe, ...sharedPrimeModules],
  templateUrl: './subscriptions-overview.html',
  styleUrl: './subscriptions-overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubscriptionsOverview implements OnInit {
  private service = inject(SubscriptionService);
  private settingsApi = inject(UserSettingsService);
  private notify = inject(NotificationService);

  readonly tabs = SUBSCRIPTIONS_TABS;
  subs = signal<Subscription[]>([]);
  settings = signal<SubscriptionSettings>({ ...DEFAULT_SUBSCRIPTION_SETTINGS });
  loading = signal(true);
  animated = signal(false);

  /** Per-subscription monthly cost, highest first. */
  ranked = computed(() => this.subs()
    .map(s => ({ s, monthly: s.amount * monthlyFactor(toFrequency(s.frequency)) }))
    .sort((a, b) => b.monthly - a.monthly));
  monthly = computed(() => this.ranked().reduce((t, r) => t + r.monthly, 0));
  yearly = computed(() => this.monthly() * 12);
  maxMonthly = computed(() => this.ranked()[0]?.monthly || 1);

  targetPct = computed(() => {
    const t = this.settings().monthlyTarget;
    return t > 0 ? this.monthly() / t * 100 : 0;
  });
  targetColor = computed(() => this.targetPct() > 100 ? '#ef4444' : this.targetPct() >= 80 ? '#f59e0b' : '#10b981');

  /** Every renewal in the next 60 days, soonest first. */
  renewals = computed<Renewal[]>(() => {
    const today = startOfToday();
    const to = new Date(today); to.setDate(to.getDate() + HORIZON_DAYS);
    const out: Renewal[] = [];
    for (const s of this.subs()) {
      const f = toFrequency(s.frequency);
      for (const d of occurrencesBetween(new Date(s.nextProcessDate), f, to, null, 12)) {
        d.setHours(0, 0, 0, 0);
        if (d >= today) out.push({ id: s.id, name: s.name, amount: s.amount, date: d, daysLeft: daysBetween(today, d) });
      }
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  });
  renewingSoon = computed(() => {
    const n = this.settings().renewalAlertDays;
    return n > 0 ? this.renewals().filter(r => r.daysLeft <= n) : [];
  });
  soonTotal = computed(() => this.renewingSoon().reduce((t, r) => t + r.amount, 0));
  /** Renewals bucketed into 8 weeks for the timeline. */
  weeks = computed(() => {
    const buckets = Array.from({ length: 8 }, (_, i) => ({ i, total: 0, items: [] as Renewal[] }));
    for (const r of this.renewals()) {
      const b = buckets[Math.min(7, Math.floor(r.daysLeft / 7))];
      b.total += r.amount; b.items.push(r);
    }
    return buckets;
  });
  maxWeek = computed(() => Math.max(1, ...this.weeks().map(w => w.total)));

  tagChart = computed(() => {
    const t = new Map<string, number>();
    for (const r of this.ranked()) { const k = r.s.tag?.trim() || 'Untagged'; t.set(k, (t.get(k) ?? 0) + r.monthly); }
    const rows = [...t.entries()].sort((a, b) => b[1] - a[1]);
    return { labels: rows.map(r => r[0]), datasets: [{ data: rows.map(r => Math.round(r[1])), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 0 }] };
  });
  readonly donutOptions = {
    maintainAspectRatio: false, cutout: '66%',
    plugins: { legend: { position: 'bottom', labels: { color: 'rgba(148,163,184,0.95)', usePointStyle: true } } }
  };

  async ngOnInit(): Promise<void> {
    try {
      const [subs, settings] = await Promise.all([this.service.getActive(), this.settingsApi.getSubscriptions()]);
      this.subs.set(subs);
      this.settings.set(settings);
    } catch {
      this.notify.showError('Could not load subscriptions.');
    } finally {
      this.loading.set(false);
      requestAnimationFrame(() => requestAnimationFrame(() => this.animated.set(true)));
    }
  }

  w(v: number): number { return this.animated() ? Math.min(100, v) : 0; }
  dueLabel(d: number): string { return d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`; }
}
