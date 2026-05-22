import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { IssueService } from '../services/issue.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  template: `
    <div class="p-4 md:p-6" style="max-width: 1200px; margin: 0 auto;">
      <div class="flex align-items-center justify-content-between mb-4">
        <div class="flex align-items-center gap-3">
          <i class="pi pi-chart-bar text-3xl text-primary"></i>
          <h1 class="m-0 text-3xl font-bold">Feedback Analytics Dashboard</h1>
        </div>
        <p-button label="Back to Issues" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" routerLink="/app/issues"></p-button>
      </div>

      @if (loading()) {
        <div class="flex justify-content-center p-6"><p-progressSpinner></p-progressSpinner></div>
      } @else {
        <div class="grid">
          <!-- Summary Cards -->
          <div class="col-12 md:col-6 lg:col-3">
            <p-card styleClass="shadow-2 border-round-xl h-full border-top-3 border-blue-500">
              <div class="text-color-secondary font-semibold uppercase text-sm mb-2">Total Issues</div>
              <div class="text-4xl font-bold text-blue-500">{{stats().totalIssues}}</div>
            </p-card>
          </div>
          <div class="col-12 md:col-6 lg:col-3">
            <p-card styleClass="shadow-2 border-round-xl h-full border-top-3 border-orange-500">
              <div class="text-color-secondary font-semibold uppercase text-sm mb-2">Open Issues</div>
              <div class="text-4xl font-bold text-orange-500">{{stats().openIssues}}</div>
            </p-card>
          </div>
          <div class="col-12 md:col-6 lg:col-3">
            <p-card styleClass="shadow-2 border-round-xl h-full border-top-3 border-green-500">
              <div class="text-color-secondary font-semibold uppercase text-sm mb-2">Closed Issues</div>
              <div class="text-4xl font-bold text-green-500">{{stats().closedIssues}}</div>
            </p-card>
          </div>
          <div class="col-12 md:col-6 lg:col-3">
            <p-card styleClass="shadow-2 border-round-xl h-full border-top-3 border-purple-500">
              <div class="text-color-secondary font-semibold uppercase text-sm mb-2">Avg Resolve Time</div>
              <div class="text-4xl font-bold text-purple-500">{{stats().avgResolveTimeHours | number:'1.1-1'}} <span class="text-lg">hrs</span></div>
            </p-card>
          </div>

          <!-- Charts -->
          <div class="col-12 md:col-6 mt-4">
            <p-card styleClass="shadow-2 h-full">
              <h3 class="mt-0 mb-3 text-xl font-bold">Issues by Status</h3>
              <p-chart type="pie" [data]="statusChartData" [options]="chartOptions" [style]="{'width': '100%'}"></p-chart>
            </p-card>
          </div>
          <div class="col-12 md:col-6 mt-4">
            <p-card styleClass="shadow-2 h-full">
              <h3 class="mt-0 mb-3 text-xl font-bold">Issues by Type</h3>
              <p-chart type="doughnut" [data]="typeChartData" [options]="chartOptions" [style]="{'width': '100%'}"></p-chart>
            </p-card>
          </div>
        </div>
      }
    </div>
  `
})
export class AnalyticsDashboardComponent implements OnInit {
  private issueService = inject(IssueService);
  loading = signal(true);
  stats = signal<any>({});
  
  statusChartData: any;
  typeChartData: any;
  chartOptions: any;

  ngOnInit() {
    this.issueService.getAnalytics().subscribe(data => {
      this.stats.set(data);
      this.initCharts(data);
      this.loading.set(false);
    });

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: textColor } }
      }
    };
  }

  initCharts(data: any) {
    this.statusChartData = {
      labels: data.issuesByStatus.map((x: any) => x.status),
      datasets: [{
        data: data.issuesByStatus.map((x: any) => x.count),
        backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#64748b', '#14b8a6']
      }]
    };

    this.typeChartData = {
      labels: data.issuesByType.map((x: any) => x.type),
      datasets: [{
        data: data.issuesByType.map((x: any) => x.count),
        backgroundColor: ['#ef4444', '#10b981', '#3b82f6']
      }]
    };
  }
}
