import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, computed, signal, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardState } from '../../../core/state/dashboard-state.service';
import { BudgetProgressWidget } from '../../budgets/budget-progress-widget/budget-progress-widget';
import { FinancialHealthWidget } from '../financial-health-widget/financial-health-widget';
import { UpcomingObligationsWidget } from '../upcoming-obligations-widget/upcoming-obligations-widget';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';

@Component({
  selector: 'app-dashboard',
  imports: [
    ...sharedPrimeModules,
    CurrencyPipe,
    DatePipe,
    NgClass,
    RouterLink,
    FormsModule,
    BudgetProgressWidget,
    FinancialHealthWidget,
    UpcomingObligationsWidget,
    StatCard
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  public state = inject(DashboardState);
  private cdr = inject(ChangeDetectorRef);
  readonly Math = Math;

  // Dashboard version state (persisted in localStorage, default: modern)
  dashboardVersion = signal<'modern' | 'classic'>(
    (typeof localStorage !== 'undefined' && (localStorage.getItem('finplanner_dashboard_version') as 'modern' | 'classic')) || 'modern'
  );

  setDashboardVersion(version: 'modern' | 'classic') {
    this.dashboardVersion.set(version);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('finplanner_dashboard_version', version);
    }
    this.cdr.markForCheck();
  }

  // Expose signals for easier template access
  summary = this.state.summary;
  isLoading = this.state.isLoading;
  insights = this.state.insights;
  selectedGlobalDate = this.state.selectedDate;

  // Modern dashboard computed helpers
  netSavings = computed(() => {
    const s = this.summary();
    if (!s) return 0;
    return (s.monthlyIncome || 0) - (s.monthlyExpenses || 0);
  });

  savingsRate = computed(() => {
    const s = this.summary();
    if (!s || !s.monthlyIncome || s.monthlyIncome <= 0) return 0;
    const net = (s.monthlyIncome || 0) - (s.monthlyExpenses || 0);
    return Math.round((net / s.monthlyIncome) * 100);
  });

  topSpendingCategories = computed(() => {
    const data = this.state.spending();
    if (!data || data.length === 0) return [];
    const total = data.reduce((sum: number, item: any) => sum + (item.totalAmount || 0), 0);
    const colors = [
      '#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
    ];
    return data.slice(0, 5).map((item: any, idx: number) => ({
      categoryName: item.categoryName,
      totalAmount: item.totalAmount,
      percentage: total > 0 ? Math.round((item.totalAmount / total) * 100) : 0,
      color: colors[idx % colors.length]
    }));
  });

  // Local Insights UI State
  insightType = signal<'amount' | 'timeline' | 'category' | 'account'>('amount');
  isAscending = signal<boolean>(false);

  // Date Picker model
  localDate = new Date();

  // Compute chart data from the state signal
  spendingChartData = computed(() => {
    const data = this.state.spending();
    if (!data) return { labels: [], datasets: [] };

    const colors = [
      '#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316'
    ];

    const hoverColors = [
      '#34d399', '#7dd3fc', '#fbbf24', '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c'
    ];

    return {
      labels: data.map((item: any) => item.categoryName),
      datasets: [
        {
          data: data.map((item: any) => item.totalAmount),
          backgroundColor: colors,
          hoverBackgroundColor: hoverColors,
          borderWidth: 0,
          borderRadius: 6,
        }
      ]
    };
  });

  hasChartData = computed(() => {
    const d = this.spendingChartData();
    return d.datasets[0].data.length > 0;
  });

  spendingChartOptions: any;
  modernChartOptions: any;

  constructor() {
    this.localDate = this.selectedGlobalDate();
    this.state.refresh();

    // Breadcrumbs
    const breadcrumbService = inject(BreadcrumbService);
    breadcrumbService.setItems([
      { label: 'Dashboard', icon: 'pi pi-home' }
    ]);

    // Soft Reset Subscription
    breadcrumbService.refresh$.subscribe(() => {
      this.state.refresh();
    });
  }

  ngOnInit() {
    this.setupSpendingChartOptions();
    this.setupModernChartOptions();
    this.cdr.markForCheck();
  }

  setupModernChartOptions(): void {
    this.modernChartOptions = {
      cutout: '72%',
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f4f4f5',
          bodyColor: '#38bdf8',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 10,
          boxPadding: 4,
          usePointStyle: true
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    };
  }

  onDateChange(newDate: any) {
    if (newDate instanceof Date) {
      this.state.updateDate(newDate);
    }
  }

  toggleInsight(type: 'amount' | 'timeline' | 'category' | 'account') {
    if (this.insightType() === type) {
      this.isAscending.set(!this.isAscending());
    } else {
      this.insightType.set(type);
      this.isAscending.set(false); // default to descending for the new type
    }
  }

  setupSpendingChartOptions(): void {
    this.spendingChartOptions = {
      cutout: '68%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            color: '#f4f4f5', // High-contrast white/light-gray text for dark screens!
            padding: 16,
            font: {
              size: 13,
              weight: '600',
              family: 'Outfit, sans-serif'
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f4f4f5',
          bodyColor: '#38bdf8',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true
        }
      },
      animation: {
        animateScale: true,
        animateRotate: true
      }
    };
  }
}
