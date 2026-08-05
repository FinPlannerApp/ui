import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  async downloadMonthlySummary(month: number, year: number): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/monthly-summary?month=${month}&year=${year}`;
    await this.downloadAndSave(url, `monthly-summary-${year}-${String(month).padStart(2, '0')}.csv`);
  }

  async downloadCategoryAnalysis(startDate: Date, endDate: Date): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/category-analysis?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    await this.downloadAndSave(url, `category-analysis-${this.formatDate(startDate)}-to-${this.formatDate(endDate)}.csv`);
  }

  async downloadBudgetVsActual(asOfDate: Date | null): Promise<void> {
    const dateParam = asOfDate ? `?asOfDate=${asOfDate.toISOString()}` : '';
    const url = `${this.apiBaseUrl}/reports/budget-vs-actual${dateParam}`;
    await this.downloadAndSave(url, `budget-vs-actual-${this.formatDate(asOfDate ?? new Date())}.csv`);
  }

  async downloadAccountStatement(accountId: number, startDate: Date, endDate: Date): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/account-statement/${accountId}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
    await this.downloadAndSave(url, `account-statement-${accountId}-${this.formatDate(startDate)}-to-${this.formatDate(endDate)}.csv`);
  }

  async downloadNetWorth(): Promise<void> {
    const url = `${this.apiBaseUrl}/reports/net-worth`;
    await this.downloadAndSave(url, `net-worth-${this.formatDate(new Date())}.csv`);
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
