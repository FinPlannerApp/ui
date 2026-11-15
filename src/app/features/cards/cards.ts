import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GenericApi } from '../../core/services/generic-api';
import { sharedPrimeModules } from '../../shared/prime-imports';

interface Card {
  accountId: number; name: string; limit: number | null; outstanding: number; utilisationPercent: number | null;
  remainingBill: number | null; dueDate: string | null; interestRate: number | null; avgMonthlySpend: number; purchases90d: number;
  months: { month: string; spend: number }[]; topCategories: { name: string; amount: number }[]; weekday: number[];
  biggest: { name: string; amount: number } | null;
}
interface Overview { cards: Card[]; totalLimit: number; totalOutstanding: number; utilisationPercent: number | null; }

@Component({
  selector: 'app-cards',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './cards.html',
})
export class Cards {
  private api = inject(GenericApi);
  data = signal<Overview | null>(null);
  loading = signal(true);
  failed = signal(false);
  readonly days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  label = (k: string) => new Date(k + '-01T00:00:00').toLocaleString('en-IN', { month: 'short' });
  maxOf = (xs: number[]) => Math.max(1, ...xs);
  maxSpend = (c: Card) => Math.max(1, ...c.months.map(m => m.spend));
  pct = (v: number, max: number) => v <= 0 ? 0 : Math.max(3, Math.round(v / max * 100));
  /** Under 30% is the commonly cited comfortable range; this is a rule of thumb, not a verdict. */
  utilClass = (p: number | null) => p === null ? '' : p >= 70 ? 'text-red-500' : p >= 30 ? 'text-amber-600' : 'text-green-600';
  worstDay = (c: Card) => { const m = Math.max(...c.weekday); return m > 0 ? this.days[c.weekday.indexOf(m)] : null; };

  constructor() { this.load(); }
  load() {
    this.loading.set(true); this.failed.set(false);
    this.api.get<Overview>('Forecast/cards').subscribe({
      next: r => { if (r.isSuccess) this.data.set(r.value as Overview); else this.failed.set(true); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }
}
