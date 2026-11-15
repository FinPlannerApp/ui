import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { GenericApi } from '../../../core/services/generic-api';
import { AccountState } from '../../../core/state/account-state.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';

interface InterestRow {
  accountId: number; accountName: string; periodStart: string; periodEnd: string;
  days: number; averageBalance: number; ratePercent: number; estimatedAmount: number;
  amount: number; busy?: boolean;
}
interface Overview {
  due: InterestRow[]; earnedThisMonth: number; earnedThisYear: number; paidThisMonth: number; paidThisYear: number;
}

/** Interest the bank has probably credited for finished periods — confirm (and edit) to record it. */
@Component({
  selector: 'app-interest-due',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  template: `
@if (view(); as o) {
  @if (always() || o.due.length > 0 || (!accountId() && (o.earnedThisYear > 0 || o.paidThisYear > 0))) {
    <div class="glass-card p-4 rounded-2xl flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="font-bold text-[var(--text-main)] flex items-center gap-2"><i class="pi pi-percentage text-[var(--primary-color)]"></i> {{ accountId() ? 'Interest to record' : 'Interest' }}</div>
        @if (!accountId()) {<div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
          <span>Earned this month <b class="text-green-600">{{ o.earnedThisMonth | currency:'INR' }}</b></span>
          <span>this year <b class="text-green-600">{{ o.earnedThisYear | currency:'INR' }}</b></span>
          @if (o.paidThisYear > 0) { <span>Loan interest paid this year <b class="text-red-500">{{ o.paidThisYear | currency:'INR' }}</b></span> }
        </div>}
      </div>
      @if (o.due.length > 0) {
        <div class="text-xs text-[var(--text-muted)]">Estimated from your daily balances and the rate on each account. Change the amount to match your bank's credit, then record it. Nothing is added until you confirm.</div>
        <div class="flex flex-col gap-2">
          @for (d of o.due; track d.accountId + d.periodEnd) {
            <div class="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[var(--glass-border)]">
              <div class="min-w-0 grow">
                <div class="font-medium text-[var(--text-main)] truncate">{{ d.accountName }}</div>
                <div class="text-xs text-[var(--text-muted)]">{{ d.periodStart | date:'dd MMM' }} – {{ d.periodEnd | date:'dd MMM yyyy' }} · avg balance {{ d.averageBalance | currency:'INR' }} @ {{ d.ratePercent }}%</div>
              </div>
              <p-inputnumber [(ngModel)]="d.amount" mode="currency" currency="INR" locale="en-IN" [minFractionDigits]="2" inputStyleClass="w-[140px]"></p-inputnumber>
              <p-button label="Record" icon="pi pi-check" size="small" [loading]="d.busy" (onClick)="post(d)"></p-button>
            </div>
          }
        </div>
      } @else if (always()) {
        <div class="text-sm text-[var(--text-muted)]">Nothing to record right now. When a bank credits interest for a finished period, it shows up here for you to confirm.</div>
      }
    </div>
  }
}`,
})
export class InterestDue {
  private api = inject(GenericApi);
  private toast = inject(MessageService);
  private accounts = inject(AccountState);
  /** When set (account page), only that account's due interest is shown. */
  accountId = input<number | null>(null);
  /** Page mode: always show the card, with an empty state, instead of hiding when nothing is due. */
  always = input(false);
  overview = signal<Overview | null>(null);
  view = computed(() => {
    const o = this.overview();
    const id = this.accountId();
    return o && id ? { ...o, due: o.due.filter(d => d.accountId === id) } : o;
  });

  constructor() { this.load(); }

  load() {
    this.api.get<Overview>('Accounts/interest-overview').subscribe({
      next: r => {
        if (!r.isSuccess || !r.value) return;
        r.value.due.forEach(d => (d.amount = d.estimatedAmount));
        this.overview.set(r.value);
      },
      error: () => { /* optional card: stay hidden */ },
    });
  }

  post(d: InterestRow) {
    d.busy = true; this.overview.update(o => (o ? { ...o } : o));
    this.api.post<boolean>('Accounts/interest-post', { accountId: d.accountId, periodEnd: d.periodEnd, amount: d.amount }).subscribe({
      next: r => {
        if (!r.isSuccess) {
          d.busy = false; this.overview.update(o => (o ? { ...o } : o));
          this.toast.add({ severity: 'error', summary: 'Not recorded', detail: (r as any).error?.description ?? 'Could not record the interest.' });
          return;
        }
        this.toast.add({ severity: 'success', summary: 'Interest recorded', detail: `${d.accountName}: ₹${d.amount}` });
        this.load();
        this.accounts.loadAccounts?.();
      },
      error: () => { d.busy = false; this.overview.update(o => (o ? { ...o } : o)); this.toast.add({ severity: 'error', summary: 'Not recorded', detail: 'Network problem. Nothing was saved.' }); },
    });
  }
}
