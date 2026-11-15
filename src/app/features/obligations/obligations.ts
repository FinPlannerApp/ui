import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { RouterLink } from '@angular/router';
import { GenericApi } from '../../core/services/generic-api';
import { sharedPrimeModules } from '../../shared/prime-imports';

interface Item {
  key: string; source: string; recurringId?: number | null; name: string; group: string; amount: number; frequencyLabel: string;
  nextDate?: string | null; fromAccount?: string | null; toAccount?: string | null; mustPay: boolean; isPaused: boolean;
  isInsurance: boolean; canChange: boolean; monthlyEquivalent: number;
}
interface Ev { date: string; name: string; group: string; amount: number; mustPay: boolean; }
interface Overview {
  items: Item[]; upcoming: Ev[]; mustPayMonthly: number; investingMonthly: number; optionalMonthly: number; next30DaysOutflow: number;
}

@Component({
  selector: 'app-obligations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './obligations.html',
})
export class Obligations {
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  data = signal<Overview | null>(null);
  loading = signal(true);
  failed = signal(false);
  busy = signal<string | null>(null);

  readonly groups = ['Bills', 'Debt', 'Investing'];
  readonly groupHint: Record<string, string> = {
    Bills: 'Real spending: rent, utilities, insurance.',
    Debt: 'Paying down what you owe: EMIs and card bills.',
    Investing: 'A transfer into your investments, not spending.',
  };
  active = computed(() => (this.data()?.items ?? []).filter(i => !i.isPaused));
  paused = computed(() => (this.data()?.items ?? []).filter(i => i.isPaused));
  byGroup = (g: string) => this.active().filter(i => i.group === g);

  /** Upcoming events grouped by day for the next 60 days. */
  days = computed(() => {
    const map = new Map<string, Ev[]>();
    for (const e of this.data()?.upcoming ?? []) {
      const k = e.date.slice(0, 10);
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return [...map.entries()].map(([date, events]) => ({ date, events, total: events.reduce((s, e) => s + e.amount, 0) }));
  });

  constructor() { this.load(); }

  load() {
    this.loading.set(true); this.failed.set(false);
    this.api.get<Overview>('Flow/obligations').subscribe({
      next: r => { if (r.isSuccess) this.data.set(r.value as Overview); else this.failed.set(true); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }

  act(i: Item, what: 'pause' | 'resume' | 'cancel') {
    if (!i.recurringId) return;
    if (what === 'cancel' && !confirm(`Cancel "${i.name}"? Past payments stay in your records and it will not run again.`)) return;
    this.busy.set(i.key);
    this.api.post<boolean>(`Flow/obligation-${what}`, { recurringId: i.recurringId }).subscribe({
      next: r => {
        this.busy.set(null);
        if (!r.isSuccess) { this.toast.add({ severity: 'error', summary: 'Not changed', detail: (r as any)?.error?.description ?? 'Could not change it.' }); return; }
        this.toast.add({ severity: 'success', summary: what === 'pause' ? 'Paused' : what === 'resume' ? 'Resumed' : 'Cancelled' });
        this.load();
      },
      error: () => { this.busy.set(null); this.toast.add({ severity: 'error', summary: 'Network problem', detail: 'Nothing was changed.' }); },
    });
  }
}
