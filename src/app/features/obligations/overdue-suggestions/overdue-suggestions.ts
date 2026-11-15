import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { GenericApi } from '../../../core/services/generic-api';
import { sharedPrimeModules } from '../../../shared/prime-imports';

interface Suggestion {
  source: 'CreditCard' | 'Loan' | 'Recurring';
  description: string;
  accountName: string;
  accountId: number | null;
  creditCardBillId: number | null;
  dueDate: string;
  amount: number;
  confidence: 'high' | 'medium';
  reason: string;
  candidateTransactionId: number;
  candidateDate: string;
  candidateAmount: number;
  candidateDescription: string;
  candidateAccountName: string;
  canMarkPaid: boolean;
}

const DISMISSED_KEY = 'finplanner_dismissed_overdue_suggestions';

/**
 * "May already be paid": overdue obligations that a recent transaction looks like it settled, but that were never
 * marked as paid. The user decides: mark a card statement paid in one tap, look at the transaction, or say it is not paid.
 */
@Component({
  selector: 'app-overdue-suggestions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  template: `
@if (visible().length > 0) {
  <section class="glass-card p-4 rounded-2xl border border-amber-500/30 flex flex-col gap-3" aria-label="Overdue items that may already be paid">
    <div class="flex items-start gap-2">
      <i class="pi pi-question-circle text-amber-400 mt-0.5"></i>
      <div class="min-w-0">
        <div class="font-bold text-[var(--text-main)]">May already be paid</div>
        <div class="text-xs text-[var(--text-muted)]">These are overdue, but a payment that looks like them is already in your records. Confirm so they stop showing as overdue.</div>
      </div>
    </div>
    <div class="flex flex-col divide-y divide-[var(--surface-border)]">
      @for (s of visible(); track key(s)) {
        <div class="py-3 flex flex-wrap items-center justify-between gap-3">
          <div class="min-w-0 grow">
            <div class="text-sm font-semibold text-[var(--text-main)] truncate">
              {{ s.description }}
              <span class="ml-1 text-[10px] px-1.5 py-0.5 rounded-full border"
                [class]="s.confidence === 'high' ? 'text-emerald-400 border-emerald-500/40' : 'text-amber-400 border-amber-500/40'">
                {{ s.confidence === 'high' ? 'likely paid' : 'possibly paid' }}</span>
            </div>
            <div class="text-xs text-[var(--text-muted)]">Due {{ s.dueDate | date:'dd MMM yyyy' }} · {{ s.amount | currency:'INR':'symbol':'1.0-0' }}</div>
            <div class="text-xs text-[var(--text-main)] mt-0.5">{{ s.reason }}</div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            @if (s.canMarkPaid && s.creditCardBillId) {
              <p-button label="Mark as paid" icon="pi pi-check" size="small" [loading]="busy() === key(s)" (onClick)="markPaid(s)"></p-button>
            }
            @if (s.accountId) {
              <a [routerLink]="['/app/accounts', s.accountId, 'transactions']" class="no-underline"><p-button label="See transactions" [outlined]="true" severity="secondary" size="small"></p-button></a>
            }
            <p-button label="Not paid" [text]="true" severity="secondary" size="small" (onClick)="dismiss(s)"></p-button>
          </div>
        </div>
      }
    </div>
  </section>
}`,
})
export class OverdueSuggestions {
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  private all = signal<Suggestion[]>([]);
  private dismissed = signal<Set<string>>(this.readDismissed());
  busy = signal<string | null>(null);
  visible = computed(() => this.all().filter(s => !this.dismissed().has(this.key(s))));

  constructor() { this.load(); }

  key(s: Suggestion): string { return `${s.source}:${s.creditCardBillId ?? s.accountId ?? s.description}:${s.candidateTransactionId}`; }

  load(): void {
    this.api.get<Suggestion[]>('RecurringTransactions/overdue-suggestions').subscribe({
      next: r => { if (r.isSuccess && Array.isArray(r.value)) this.all.set(r.value); },
      error: () => { /* optional hint: stay hidden */ },
    });
  }

  markPaid(s: Suggestion): void {
    if (!s.creditCardBillId) return;
    this.busy.set(this.key(s));
    this.api.post<boolean>(`Accounts/credit-card-bills/${s.creditCardBillId}/mark-paid`, {}).subscribe({
      next: r => {
        this.busy.set(null);
        if (!r.isSuccess) {
          this.toast.add({ severity: 'error', summary: 'Not changed', detail: (r as any)?.error?.description ?? 'Could not mark it as paid.' });
          return;
        }
        this.toast.add({ severity: 'success', summary: 'Marked as paid', detail: s.description });
        this.all.update(list => list.filter(x => this.key(x) !== this.key(s)));
      },
      error: () => { this.busy.set(null); this.toast.add({ severity: 'error', summary: 'Network problem', detail: 'Nothing was changed.' }); },
    });
  }

  /** "Not paid": hide this suggestion on this device; the obligation itself is untouched. */
  dismiss(s: Suggestion): void {
    const next = new Set(this.dismissed());
    next.add(this.key(s));
    this.dismissed.set(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])); } catch { /* private mode: dismissal lasts this visit */ }
  }

  private readDismissed(): Set<string> {
    try { return new Set<string>(JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')); } catch { return new Set<string>(); }
  }
}
