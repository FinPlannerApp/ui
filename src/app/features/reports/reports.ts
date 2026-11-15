import { PageHeader } from '../../shared/components/page-header/page-header';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PeriodReport, ReportsService } from './reports.service';
import { AccountState } from '../../core/state/account-state.service';
import { NotificationService } from '../../core/services/notification.service';
import { FormField } from '../../shared/components/form-field/form-field';
import { sharedPrimeModules } from '../../shared/prime-imports';

type ReportType = 'monthly-summary' | 'category-analysis' | 'budget-vs-actual' | 'account-statement' | 'net-worth';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [PageHeader, CommonModule, FormsModule, ReactiveFormsModule, FormField, ...sharedPrimeModules],
  templateUrl: './reports.html',
})
export class Reports {
  private fb = inject(FormBuilder);
  private reportsService = inject(ReportsService);
  private notificationService = inject(NotificationService);
  // AccountState self-loads on construction (confirmed — same pattern used
  // directly in transaction-list.ts with no manual trigger needed here either).
  accountState = inject(AccountState);

  isDownloading = signal(false);

  // ── On-screen report (month or whole year), exported on demand ──
  readonly periodModes = [{ label: 'Month', value: 'month' }, { label: 'Whole year', value: 'year' }];
  periodMode = signal<'month' | 'year'>('month');
  periodMonth = signal(new Date().getMonth() + 1);
  periodYear = signal(new Date().getFullYear());
  readonly yearOptions = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i).map(y => ({ label: String(y), value: y }));
  period = signal<PeriodReport | null>(null);
  periodLoading = signal(false);
  exporting = signal<'excel' | 'pdf' | null>(null);

  async loadPeriod(): Promise<void> {
    this.periodLoading.set(true);
    try {
      this.period.set(await this.reportsService.getPeriod(this.periodYear(), this.periodMode() === 'month' ? this.periodMonth() : null));
    } catch (err: any) {
      this.period.set(null);
      this.notificationService.showError(err?.message || 'Could not load the report.');
    } finally {
      this.periodLoading.set(false);
    }
  }

  setPeriodMode(v: 'month' | 'year'): void { this.periodMode.set(v); void this.loadPeriod(); }
  setPeriodMonth(v: number): void { this.periodMonth.set(v); void this.loadPeriod(); }
  setPeriodYear(v: number): void { this.periodYear.set(v); void this.loadPeriod(); }

  maxCategory(): number {
    return Math.max(1, ...(this.period()?.categories.map(c => c.amount) ?? [1]));
  }

  async exportPeriod(kind: 'excel' | 'pdf'): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(kind);
    try {
      await this.reportsService.exportPeriod(kind, this.periodYear(), this.periodMode() === 'month' ? this.periodMonth() : null);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Could not create the file.');
    } finally {
      this.exporting.set(null);
    }
  }

  reportTypes: { label: string; value: ReportType }[] = [
    { label: 'Monthly Summary', value: 'monthly-summary' },
    { label: 'Category Analysis', value: 'category-analysis' },
    { label: 'Budget vs Actual', value: 'budget-vs-actual' },
    { label: 'Account Statement', value: 'account-statement' },
    { label: 'Net Worth', value: 'net-worth' }
  ];

  months = [
    { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
    { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
    { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
    { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 }
  ];

  form: FormGroup;

  constructor() {
    const now = new Date();
    this.form = this.fb.group({
      reportType: ['monthly-summary' as ReportType],
      month: [now.getMonth() + 1],
      year: [now.getFullYear()],
      startDate: [new Date(now.getFullYear(), now.getMonth(), 1)],
      endDate: [now],
      asOfDate: [now],
      accountId: [null]
    });
    void this.loadPeriod();
  }

  get selectedType(): ReportType {
    return this.form.get('reportType')?.value;
  }

  async downloadReport(): Promise<void> {
    if (this.isDownloading()) return;

    const values = this.form.getRawValue();
    this.isDownloading.set(true);

    try {
      switch (values.reportType as ReportType) {
        case 'monthly-summary':
          await this.reportsService.downloadMonthlySummary(values.month, values.year);
          break;
        case 'category-analysis':
          await this.reportsService.downloadCategoryAnalysis(values.startDate, values.endDate);
          break;
        case 'budget-vs-actual':
          await this.reportsService.downloadBudgetVsActual(values.asOfDate);
          break;
        case 'account-statement':
          if (!values.accountId) {
            this.notificationService.showError('Select an account first.');
            return;
          }
          await this.reportsService.downloadAccountStatement(values.accountId, values.startDate, values.endDate);
          break;
        case 'net-worth':
          await this.reportsService.downloadNetWorth();
          break;
      }
      this.notificationService.showSuccess('Report downloaded.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to generate report.');
    } finally {
      this.isDownloading.set(false);
    }
  }
}
