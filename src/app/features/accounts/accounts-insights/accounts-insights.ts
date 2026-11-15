import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GenericApi } from '../../../core/services/generic-api';
import { sharedPrimeModules } from '../../../shared/prime-imports';

interface Item {
  accountId: number; name: string; balance: number; lowestIn90Days: number; lowestOn: string | null; interestLast12Months: number;
  months: { month: string; in: number; out: number }[];
}
interface Overview { accounts: Item[]; totalBalance: number; }

@Component({
  selector: 'app-accounts-insights',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './accounts-insights.html',
})
export class AccountsInsights {
  private api = inject(GenericApi);
  data = signal<Overview | null>(null);
  loading = signal(true);
  failed = signal(false);
  label = (k: string) => new Date(k + '-01T00:00:00').toLocaleString('en-IN', { month: 'short' });
  maxOf = (a: Item) => Math.max(1, ...a.months.flatMap(m => [m.in, m.out]));
  pct = (v: number, max: number) => v <= 0 ? 0 : Math.max(3, Math.round(v / max * 100));
  constructor() { this.load(); }
  load() {
    this.loading.set(true); this.failed.set(false);
    this.api.get<Overview>('Forecast/accounts').subscribe({
      next: r => { if (r.isSuccess) this.data.set(r.value as Overview); else this.failed.set(true); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }
}
