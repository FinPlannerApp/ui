import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { DEFAULT_TRANSACTION_SETTINGS, TransactionSettings } from '../../../core/models/user-settings.model';
import { BasicTransactionDto, DashboardInsightsDto } from '../../../core/models/dashboard-insights';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { TRANSACTIONS_TABS } from '../transactions-tabs';

interface Period { label: string; value: number; start: string; end: string; days: number; }
interface Summary { monthlyIncome: number; monthlyExpenses: number; }
interface CategorySpend { categoryName: string; totalAmount: number; }
interface DayCell { date: string; day: number; total: number; count: number; level: number; inPeriod: boolean; }
interface MerchantSpend { merchantId: number; merchantName: string; totalSpent: number; transactionCount: number; }
interface TrendPoint { year: number; month: number; income: number; expense: number; }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const dateOnly = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

@Component({
  selector: 'app-transactions-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ModuleTabs, CurrencyPipe, DatePipe, ...sharedPrimeModules],
  templateUrl: './transactions-overview.html',
  styleUrl: './transactions-overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsOverview implements OnInit {
  private api = inject(GenericApi);
  private notify = inject(NotificationService);
  private settingsApi = inject(UserSettingsService);

  readonly tabs = TRANSACTIONS_TABS;
  settings = signal<TransactionSettings>({ ...DEFAULT_TRANSACTION_SETTINGS });
  periods = signal<Period[]>([]);
  periodIndex = signal(0);
  loading = signal(true);
  animated = signal(false);

  summary = signal<Summary>({ monthlyIncome: 0, monthlyExpenses: 0 });
  categories = signal<CategorySpend[]>([]);
  insights = signal<DashboardInsightsDto | null>(null);
  trend = signal<TrendPoint[]>([]);
  dailySpend = signal<{ date: string; total: number; count: number }[]>([]);
  merchants = signal<MerchantSpend[]>([]);
  topMerchants = computed(() => this.merchants().slice(0, 6));
  maxMerchant = computed(() => this.topMerchants()[0]?.totalSpent ?? 1);
  readonly weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  /** Weeks (Mon→Sun columns) covering the selected money month; days outside it are blank. */
  heatmap = computed<DayCell[][]>(() => {
    const p = this.period();
    if (!p) return [];
    const byDate = new Map(this.dailySpend().map(d => [d.date.slice(0, 10), d]));
    const max = Math.max(0, ...this.dailySpend().map(d => d.total));
    const start = new Date(p.start + 'T00:00:00'), end = new Date(p.end + 'T00:00:00');
    const lead = (start.getDay() + 6) % 7;                       // Monday = 0
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate() - lead);
    const weeks: DayCell[][] = [];
    while (cursor <= end) {
      const week: DayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const key = dateOnly(cursor);
        const inPeriod = cursor >= start && cursor <= end;
        const d = inPeriod ? byDate.get(key) : undefined;
        const total = d?.total ?? 0;
        const level = total <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil(total / max * 4));
        week.push({ date: key, day: cursor.getDate(), total, count: d?.count ?? 0, level, inPeriod });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  });
  busiestDay = computed(() => this.dailySpend().reduce<{ date: string; total: number } | null>((m, d) => !m || d.total > m.total ? d : m, null));

  cellTitle(c: DayCell): string {
    if (!c.inPeriod) return '';
    return c.total > 0 ? `${c.date}: ₹${c.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} in ${c.count} expense${c.count === 1 ? '' : 's'}` : `${c.date}: no spending`;
  }

  period = computed(() => this.periods()[this.periodIndex()]);
  net = computed(() => this.summary().monthlyIncome - this.summary().monthlyExpenses);
  savingsRate = computed(() => {
    const i = this.summary().monthlyIncome;
    return i > 0 ? Math.round(this.net() / i * 100) : null;
  });
  perDay = computed(() => {
    const p = this.period();
    return p ? this.summary().monthlyExpenses / Math.max(1, p.days) : 0;
  });
  topCategories = computed(() => this.categories().filter(c => c.totalAmount > 0).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 7));
  maxCategory = computed(() => this.topCategories()[0]?.totalAmount ?? 1);
  largeSpends = computed<BasicTransactionDto[]>(() => {
    const t = this.settings().largeExpenseThreshold;
    if (t <= 0) return [];
    return (this.insights()?.highestAmountTransactions ?? []).filter(x => x.amount >= t && x.type === 1 /* Expense */);
  });
  biggest = computed(() => (this.insights()?.highestAmountTransactions ?? []).slice(0, 5));
  latest = computed(() => (this.insights()?.latestTransactions ?? []).slice(0, 6));

  trendChart = computed(() => ({
    labels: this.trend().map(p => MONTHS[p.month - 1]),
    datasets: [
      { label: 'Income', data: this.trend().map(p => p.income), backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 8, maxBarThickness: 26 },
      { label: 'Expenses', data: this.trend().map(p => p.expense), backgroundColor: 'rgba(244,63,94,0.8)', borderRadius: 8, maxBarThickness: 26 }
    ]
  }));
  readonly chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: 'rgba(148,163,184,0.95)', usePointStyle: true } } },
    scales: {
      x: { ticks: { color: 'rgba(148,163,184,0.95)' }, grid: { display: false } },
      y: { ticks: { color: 'rgba(148,163,184,0.95)' }, grid: { color: 'rgba(148,163,184,0.15)' }, beginAtZero: true }
    }
  };

  async ngOnInit(): Promise<void> {
    let startDay = 1;
    try {
      const [g, s] = await Promise.all([this.settingsApi.getGeneral(), this.settingsApi.getTransactions()]);
      startDay = g.monthStartDay;
      this.settings.set(s);
    } catch { /* defaults */ }
    this.periods.set(this.buildPeriods(startDay));
    await Promise.all([this.loadPeriod(), this.loadTrend()]);
  }

  /** The last six "money months": calendar months, or startDay→startDay−1 when a month start day is set. */
  private buildPeriods(startDay: number): Period[] {
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth() - (today.getDate() >= startDay ? 0 : 1), startDay);
    const out: Period[] = [];
    for (let i = 0; i < 6; i++) {
      const start = new Date(base.getFullYear(), base.getMonth() - i, startDay);
      const nextStart = new Date(start.getFullYear(), start.getMonth() + 1, startDay);
      const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1);
      const days = Math.round((nextStart.getTime() - start.getTime()) / 86_400_000);
      const label = startDay === 1
        ? `${MONTHS[start.getMonth()]} ${start.getFullYear()}`
        : `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
      out.push({ label: i === 0 ? `This month · ${label}` : label, value: i, start: dateOnly(start), end: dateOnly(end), days });
    }
    return out;
  }

  async onPeriodChange(i: number): Promise<void> {
    this.periodIndex.set(i);
    await this.loadPeriod();
  }

  private async loadPeriod(): Promise<void> {
    const p = this.period();
    if (!p) return;
    this.loading.set(true);
    this.animated.set(false);
    const q = `?startDate=${p.start}&endDate=${p.end}`;
    try {
      void this.loadExtras(p.start, p.end);
      const [s, c, ins] = await Promise.all([
        firstValueFrom(this.api.get<Summary>(`Dashboard/summary${q}`)),
        firstValueFrom(this.api.get<CategorySpend[]>(`Dashboard/spending-by-category${q}`)),
        firstValueFrom(this.api.get<DashboardInsightsDto>(`Dashboard/insights${q}`))
      ]);
      if (s.isSuccess) this.summary.set(s.value);
      if (c.isSuccess) this.categories.set(c.value ?? []);
      if (ins.isSuccess) this.insights.set(ins.value);
      if (!s.isSuccess) throw new Error(s.error?.description || 'Could not load.');
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not load the overview.');
    } finally {
      this.loading.set(false);
      requestAnimationFrame(() => requestAnimationFrame(() => this.animated.set(true)));
    }
  }

  /** Heatmap + top merchants for the selected period; failures just leave those cards empty. */
  private async loadExtras(start: string, end: string): Promise<void> {
    try {
      const [d, m] = await Promise.all([
        firstValueFrom(this.api.get<{ date: string; total: number; count: number }[]>(`Transactions/daily-spend?startDate=${start}&endDate=${end}`)),
        firstValueFrom(this.api.get<MerchantSpend[]>(`Merchants/spending?startDate=${start}&endDate=${end}`))
      ]);
      this.dailySpend.set(d.isSuccess ? (d.value ?? []) : []);
      this.merchants.set(m.isSuccess ? (m.value ?? []) : []);
    } catch { this.dailySpend.set([]); this.merchants.set([]); }
  }

  private async loadTrend(): Promise<void> {
    try {
      const r = await firstValueFrom(this.api.get<TrendPoint[]>('Dashboard/monthly-trend?monthsBack=6'));
      if (r.isSuccess) this.trend.set(r.value ?? []);
    } catch { /* chart simply stays empty */ }
  }

  barWidth(v: number): number { return this.animated() ? v : 0; }
}
