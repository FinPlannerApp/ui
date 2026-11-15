import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { BUDGET_STATUS_COLORS, BudgetDashboard, BudgetProgress, BudgetStatus, BudgetAlertPatterns, BudgetBreakdown, BudgetBreakdownRow } from '../../../core/models/budget.model';

const GAUGE_RADIUS = 52;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

@Component({
  selector: 'app-budgets-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, PageHeader, CurrencyPipe, DecimalPipe, DatePipe, ...sharedPrimeModules],
  templateUrl: './budgets-dashboard.html',
  styleUrl: './budgets-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetsDashboard implements OnInit {
  private api = inject(GenericApi);
  private notify = inject(NotificationService);

  readonly circumference = GAUGE_CIRCUMFERENCE;
  readonly radius = GAUGE_RADIUS;

  data = signal<BudgetDashboard | null>(null);
  loading = signal(true);
  patterns = signal<BudgetAlertPatterns | null>(null);
  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  maxWeekday = computed(() => Math.max(1, ...(this.patterns()?.byWeekday ?? [0])));
  maxMonth = computed(() => Math.max(1, ...(this.patterns()?.byMonth.map(m => m.warnings + m.breaches) ?? [0])));
  // Drill-down drawer: where a budget's spend went, by sub-category.
  drawerOpen = false;
  drawerBudget = signal<BudgetProgress | null>(null);
  breakdown = signal<BudgetBreakdown | null>(null);
  breakdownLoading = signal(false);
  /** Drill path: each entry is a category we stepped into (for the breadcrumb). */
  trail = signal<{ id: number; name: string }[]>([]);
  readonly rowColors = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16', '#f97316'];

  /** Flips to true one frame after the data arrives so bars and the gauge animate from empty. */
  animated = signal(false);

  budgets = computed(() => this.data()?.budgets ?? []);
  atRisk = computed(() => this.budgets().filter(b => b.status !== 'safe').slice(0, 5));
  gaugeOffset = computed(() => {
    const pct = Math.min(100, this.data()?.percentUsed ?? 0);
    return this.animated() ? this.circumference * (1 - pct / 100) : this.circumference;
  });
  gaugeStatus = computed<BudgetStatus>(() => {
    const d = this.data();
    if (!d) return 'safe';
    const threshold = d.settings.defaultAlertPercent;
    return d.percentUsed > 100 ? 'over' : d.percentUsed >= 100 ? 'limit' : d.percentUsed >= threshold ? 'alert' : 'safe';
  });
  safePerDay = computed(() => {
    const d = this.data();
    return d && d.totalRemaining > 0 ? d.totalRemaining / Math.max(1, d.daysLeft) : 0;
  });

  historyChart = computed(() => {
    const h = this.data()?.history ?? [];
    return {
      labels: h.map(p => p.label),
      datasets: [
        { type: 'bar', label: 'Spent', data: h.map(p => p.spent), backgroundColor: 'rgba(16,185,129,0.75)', borderRadius: 8, maxBarThickness: 34 },
        { type: 'line', label: 'Budgeted', data: h.map(p => p.budgeted), borderColor: '#f59e0b', backgroundColor: '#f59e0b', borderDash: [6, 5], tension: 0.3, pointRadius: 3 }
      ]
    };
  });

  shareChart = computed(() => {
    const monthly = this.budgets().filter(b => b.period === 1 && b.spentAmount > 0);
    const palette = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16', '#f97316'];
    return {
      labels: monthly.map(b => b.categoryName || 'Overall'),
      datasets: [{ data: monthly.map(b => b.spentAmount), backgroundColor: monthly.map((_, i) => palette[i % palette.length]), borderWidth: 0 }]
    };
  });

  readonly chartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: 'rgba(148,163,184,0.95)', usePointStyle: true } } },
    scales: {
      x: { ticks: { color: 'rgba(148,163,184,0.95)' }, grid: { display: false } },
      y: { ticks: { color: 'rgba(148,163,184,0.95)' }, grid: { color: 'rgba(148,163,184,0.15)' }, beginAtZero: true }
    }
  };
  readonly donutOptions = {
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { position: 'bottom', labels: { color: 'rgba(148,163,184,0.95)', usePointStyle: true } } }
  };

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.api.get<BudgetDashboard>('Budgets/dashboard'));
      if (!res.isSuccess) throw new Error(res.error?.description || 'Could not load budgets.');
      this.animated.set(false);
      this.data.set(res.value);
      void this.loadPatterns();
      // Next frame: let the empty state paint first so the CSS transitions have something to animate from.
      requestAnimationFrame(() => requestAnimationFrame(() => this.animated.set(true)));
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not load budgets.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadPatterns(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.get<BudgetAlertPatterns>('Budgets/alert-patterns?months=6'));
      if (res.isSuccess) this.patterns.set(res.value);
    } catch { /* supplementary */ }
  }

  openBreakdown(b: BudgetProgress): void {
    this.drawerBudget.set(b);
    this.trail.set([]);
    this.breakdown.set(null);
    this.drawerOpen = true;
    void this.loadBreakdown(b.budgetId);
  }

  async drillInto(row: BudgetBreakdownRow): Promise<void> {
    const b = this.drawerBudget();
    if (!b || !row.categoryId || !row.hasSubCategories) return;
    this.trail.update(t => [...t, { id: row.categoryId!, name: row.name }]);
    await this.loadBreakdown(b.budgetId, row.categoryId);
  }

  async drillTo(index: number): Promise<void> {
    const b = this.drawerBudget();
    if (!b) return;
    const t = this.trail().slice(0, index);
    this.trail.set(t);
    await this.loadBreakdown(b.budgetId, t.length ? t[t.length - 1].id : undefined);
  }

  private async loadBreakdown(budgetId: number, categoryId?: number): Promise<void> {
    this.breakdownLoading.set(true);
    try {
      const q = categoryId ? `?categoryId=${categoryId}` : '';
      const res = await firstValueFrom(this.api.get<BudgetBreakdown>(`Budgets/${budgetId}/breakdown${q}`));
      if (!res.isSuccess) throw new Error(res.error?.description || 'Could not load the breakdown.');
      this.breakdown.set(res.value);
    } catch (err: any) {
      this.notify.showError(err?.message || 'Could not load the breakdown.');
    } finally {
      this.breakdownLoading.set(false);
    }
  }

  color(status: BudgetStatus): string {
    return BUDGET_STATUS_COLORS[status];
  }

  barWidth(b: BudgetProgress): number {
    return this.animated() ? Math.min(100, b.percentageUsed) : 0;
  }

  statusLabel(s: BudgetStatus): string {
    return { safe: 'On track', alert: 'Heads-up', limit: 'Limit reached', over: 'Over budget' }[s];
  }

  periodLabel(p: number): string {
    return p === 1 ? 'Monthly' : p === 2 ? 'Yearly' : 'Weekly';
  }

  /** True when the current pace would finish the period over budget (needs a few days of data to mean anything). */
  willOverspend(b: BudgetProgress): boolean {
    return b.daysElapsed >= 3 && b.status !== 'over' && b.projectedSpend > b.budgetAmount;
  }
}
