import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { IssueService } from '../services/issue.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './analytics-dashboard.component.html'
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
