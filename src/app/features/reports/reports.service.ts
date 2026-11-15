import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toDateOnlyString } from '../../core/utils/date-utils';
import { GenericApi } from '../../core/services/generic-api';

export interface PeriodReport {
  mode: 'month' | 'year';
  label: string;
  year: number;
  month: number | null;
  income: number;
  expenses: number;
  net: number;
  savingsRate: number;
  netWorthNow: number;
  categories: { name: string; amount: number; percent: number }[];
  months: { month: number; label: string; income: number; expenses: number; net: number }[];
}

/**
 * Deliberately separate from GenericApi — that service's methods all expect
 * JSON (ApiResult<T> responses). These 5 endpoints return raw CSV bytes with
 * a text/csv content type, which needs `responseType: 'blob'` on the request
 * and a different handling path afterward (trigger a browser download,
 * nothing to parse). Mixing the two response shapes into GenericApi would
 * make its return type lie about what callers actually get back.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private http = inject(HttpClient);
  private api = inject(GenericApi);
  private apiBaseUrl = environment.apiBaseUrl;

  private async downloadAndSave(url: string, filename: string): Promise<void> {
    const blob = await firstValueFrom(
      this.http.get(url, { responseType: 'blob' })
    );

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
  }

  /** On-screen report: nothing is generated or stored, so it costs almost nothing. */
  async getPeriod(year: number, month: number | null): Promise<PeriodReport> {
    const q = `Reports/period?year=${year}` + (month ? `&month=${month}` : '');
    const result = await firstValueFrom(this.api.get<PeriodReport>(q));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Could not load the report.');
    return result.value;
  }

  /** File exports are built by the server only when the user asks. */
  async exportPeriod(kind: 'excel' | 'pdf', year: number, month: number | null): Promise<void> {
    const q = `year=${year}` + (month ? `&month=${month}` : '');
    const blob = await firstValueFrom(this.http.get(`${this.apiBaseUrl}/reports/period/${kind}?${q}`, { responseType: 'blob' }));
    // A failed export comes back as a small JSON body, not a file.
    if (blob.type.includes('json')) {
      const body = JSON.parse(await blob.text());
      throw new Error(body?.error?.description || 'Could not create the file.');
    }
    const ext = kind === 'excel' ? 'xlsx' : 'pdf';
    const name = month ? `report-${year}-${String(month).padStart(2, '0')}.${ext}` : `report-${year}.${ext}`;
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = name;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
  }

  async downloadMonthlySummary(month: number, year: number): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/monthly-summary?month=${month}&year=${year}`;
    await this.downloadAndSave(url, `monthly-summary-${year}-${String(month).padStart(2, '0')}.csv`);
  }

  async downloadCategoryAnalysis(startDate: Date, endDate: Date): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/category-analysis?startDate=${toDateOnlyString(startDate)}&endDate=${toDateOnlyString(endDate)}`;
    await this.downloadAndSave(url, `category-analysis-${this.formatDate(startDate)}-to-${this.formatDate(endDate)}.csv`);
  }

  async downloadBudgetVsActual(asOfDate: Date | null): Promise<void> {
    const dateParam = asOfDate ? `?asOfDate=${toDateOnlyString(asOfDate)}` : '';
    const url = `${this.apiBaseUrl}/reports/budget-vs-actual${dateParam}`;
    await this.downloadAndSave(url, `budget-vs-actual-${this.formatDate(asOfDate ?? new Date())}.csv`);
  }

  async downloadAccountStatement(accountId: number, startDate: Date, endDate: Date): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/account-statement/${accountId}?startDate=${toDateOnlyString(startDate)}&endDate=${toDateOnlyString(endDate)}`;
    await this.downloadAndSave(url, `account-statement-${accountId}-${this.formatDate(startDate)}-to-${this.formatDate(endDate)}.csv`);
  }

  async downloadNetWorth(): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/net-worth`;
    await this.downloadAndSave(url, `net-worth-${this.formatDate(new Date())}.csv`);
  }

  private formatDate(date: Date): string {
    return toDateOnlyString(date) ?? '';
  }
}
