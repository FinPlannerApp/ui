import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericApi } from '../../core/services/generic-api';
import { sharedPrimeModules } from '../../shared/prime-imports';

interface Month { month: string; income: number; spending: number; savingsRatePercent: number | null; }
interface Forecast {
  history: Month[];
  nextMonth: {
    label: string; expectedIncome: number; incomeFromHistory: boolean; fixedBills: number; investing: number;
    variableTypical: number; variableLow: number; variableHigh: number; leftTypical: number; leftLow: number; leftHigh: number;
    monthsOfData: number; confidence: string; topCategories: { name: string; typical: number }[];
  };
  runway: { startBalance: number; lowestBalance: number; lowestOn: string; shortOn: string | null; horizonDays: number; dailyVariable: number } | null;
  insights: { kind: string; severity: string; title: string; detail: string }[];
  liquidBalance: { month: string; balance: number }[];
}

@Component({
  selector: 'app-forecast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ...sharedPrimeModules],
  templateUrl: './forecast.html',
})
export class Outlook {
  private api = inject(GenericApi);
  data = signal<Forecast | null>(null);
  loading = signal(true);
  failed = signal(false);

  maxHist = computed(() => Math.max(1, ...(this.data()?.history ?? []).flatMap(h => [h.income, h.spending])));
  maxBal = computed(() => Math.max(1, ...(this.data()?.liquidBalance ?? []).map(b => Math.abs(b.balance))));
  hasHistory = computed(() => (this.data()?.history ?? []).some(h => h.income > 0 || h.spending > 0));

  label = (k: string) => k === 'now' ? 'Now' : new Date(k + '-01T00:00:00').toLocaleString('en-IN', { month: 'short' });
  pct = (v: number, max: number) => Math.max(2, Math.round(Math.abs(v) / max * 100));

  constructor() { this.load(); }
  load() {
    this.loading.set(true); this.failed.set(false);
    this.api.get<Forecast>('Forecast/overview').subscribe({
      next: r => { if (r.isSuccess) this.data.set(r.value as Forecast); else this.failed.set(true); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }
}
