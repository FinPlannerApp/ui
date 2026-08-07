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
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  public state = inject(DashboardState);
  private cdr = inject(ChangeDetectorRef);

  // Expose signals for easier template access
  summary = this.state.summary;
  isLoading = this.state.isLoading;
  insights = this.state.insights;
  selectedGlobalDate = this.state.selectedDate;

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
      '#3B82F6', '#8B5CF6', '#14B8A6', '#F97316', '#EC4899', '#06B6D4', '#6366F1'
    ];

    const hoverColors = [
      '#60A5FA', '#A78BFA', '#2DD4BF', '#FB923C', '#F472B6', '#22D3EE', '#818CF8'
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
    // Delay slightly to ensure theme CSS variables are computed on the body
    setTimeout(() => {
      this.setupSpendingChartOptions();
      this.cdr.markForCheck();
    }, 50);
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
    const documentStyle = getComputedStyle(document.body);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#9ca3af'; // Fallback to accessible gray
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border') || '#4b5563';

    this.spendingChartOptions = {
      cutout: '70%', // Creates the elegant doughnut hole
      plugins: {
        legend: {
          position: 'right', // Move legend to the side rather than top
          labels: {
            usePointStyle: true,
            color: textColor,
            padding: 20,
            font: {
              size: 13,
              family: 'inherit'
            }
          }
        },
        tooltip: {
          backgroundColor: documentStyle.getPropertyValue('--surface-overlay'),
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: surfaceBorder,
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true
        }
      },
      animation: {
        animateScale: true, // Smooth pop-in animation
        animateRotate: true
      }
    };
  }
}
