import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgTemplateOutlet } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';

interface Payment {
  id: number; date: string; amount: number; payingAccountName: string; paymentAppName?: string | null;
  principalPortion: number; interestPortion: number; cashbackAmount?: number | null; cashbackType?: string | null;
  cashbackAccountName?: string | null; walletApplied: number; walletEarned: number;
}
interface Statement {
  billId: number; statementDate: string; dueDate?: string | null; billAmount: number; minimumDue?: number | null;
  interestAndFees: number; otherCharges: number; paid: number; remaining: number; cashbackTotal: number;
  status: string; payments: Payment[];
}
interface History { statements: Statement[]; unlinkedPayments: Payment[]; }

/** Every statement of a card with how it was paid: account, payment app, cashback, wallet use. */
@Component({
  selector: 'app-cc-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DatePipe, NgTemplateOutlet],
  template: `
    <div class="glass-card p-4 sm:p-5 rounded-2xl border border-purple-500/30">
      <div class="font-extrabold text-sm sm:text-base text-purple-200 mb-3"><i class="pi pi-history mr-2"></i>Statements &amp; payment history</div>
      @if (loading()) { <p class="text-xs" style="color:var(--text-dim)">Loading…</p> }
      @if (history(); as h) {
        @if (!h.statements.length && !h.unlinkedPayments.length) {
          <p class="text-xs" style="color:var(--text-dim)">No statements recorded yet. Use “Record Statement Bill” to add one.</p>
        }
        @for (s of h.statements; track s.billId) {
          <div class="stmt" [class.current]="isSelected(s)">
            <button type="button" class="stmt-head" (click)="toggle(s.billId)" [attr.aria-expanded]="isOpen(s)">
              <span class="font-bold">{{ s.statementDate | date:'MMM yyyy' }}</span>
              <span class="muted">statement {{ s.statementDate | date:'d MMM' }}</span>
              <span class="grow"></span>
              <span class="font-bold">{{ s.billAmount | currency:'INR':'symbol':'1.2-2' }}</span>
              <span class="pill" [class]="'pill-' + s.status.split(' ')[0].toLowerCase()">{{ s.status }}</span>
              <i class="pi" [class.pi-chevron-down]="!isOpen(s)" [class.pi-chevron-up]="isOpen(s)"></i>
            </button>
            @if (isOpen(s)) {
              <div class="stmt-body">
                <div class="facts">
                  @if (s.dueDate) { <span>Due {{ s.dueDate | date:'d MMM yyyy' }}</span> }
                  @if (s.minimumDue) { <span>Min due {{ s.minimumDue | currency:'INR':'symbol':'1.0-0' }}</span> }
                  @if (s.interestAndFees) { <span>Interest+GST {{ s.interestAndFees | currency:'INR':'symbol':'1.0-0' }}</span> }
                  @if (s.otherCharges) { <span>Other charges {{ s.otherCharges | currency:'INR':'symbol':'1.0-0' }}</span> }
                  <span>Paid {{ s.paid | currency:'INR':'symbol':'1.0-0' }}</span>
                  <span>Pending {{ s.remaining | currency:'INR':'symbol':'1.0-0' }}</span>
                  @if (s.cashbackTotal) { <span>Cashback {{ s.cashbackTotal | currency:'INR':'symbol':'1.0-0' }}</span> }
                </div>
                @for (p of s.payments; track p.id) { <ng-container *ngTemplateOutlet="pay; context: { $implicit: p }" /> }
                @if (!s.payments.length) { <p class="muted">No payments recorded for this statement.</p> }
              </div>
            }
          </div>
        }
        @if (h.unlinkedPayments.length) {
          <div class="stmt">
            <button type="button" class="stmt-head" (click)="toggle(-1)">
              <span class="font-bold">Payments not linked to a statement</span><span class="grow"></span>
              <span class="muted">{{ h.unlinkedPayments.length }}</span>
              <i class="pi" [class.pi-chevron-down]="openId() !== -1" [class.pi-chevron-up]="openId() === -1"></i>
            </button>
            @if (openId() === -1) {
              <div class="stmt-body">
                @for (p of h.unlinkedPayments; track p.id) { <ng-container *ngTemplateOutlet="pay; context: { $implicit: p }" /> }
              </div>
            }
          </div>
        }
      }
    </div>

    <ng-template #pay let-p>
      <div class="pay">
        <div class="pay-main">
          <span>{{ p.date | date:'d MMM yyyy' }}</span>
          <span class="font-bold">{{ p.amount | currency:'INR':'symbol':'1.2-2' }}</span>
        </div>
        <div class="muted">
          from {{ p.payingAccountName }}@if (p.paymentAppName) { via {{ p.paymentAppName }} }
          @if (p.interestPortion) { · interest {{ p.interestPortion | currency:'INR':'symbol':'1.0-0' }} }
          @if (p.walletApplied) { · wallet used {{ p.walletApplied | currency:'INR':'symbol':'1.0-0' }} }
          @if (p.cashbackAmount) {
            · cashback {{ p.cashbackAmount | currency:'INR':'symbol':'1.0-0' }}
            @if (p.cashbackType) { ({{ p.cashbackType }}@if (p.cashbackAccountName) { → {{ p.cashbackAccountName }} }) }
          }
          @if (p.walletEarned) { · wallet earned {{ p.walletEarned | currency:'INR':'symbol':'1.0-0' }} }
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .stmt { border: 1px solid var(--border, #334155); border-radius: 12px; margin-bottom: .5rem; overflow: hidden; }
    .stmt.current { border-color: #a78bfa; }
    .stmt-head { display: flex; align-items: center; gap: .6rem; width: 100%; padding: .6rem .8rem; background: transparent; border: 0; color: inherit; cursor: pointer; text-align: left; font: inherit; flex-wrap: wrap; }
    .grow { flex: 1; } .muted { font-size: .75rem; color: var(--text-dim, #94a3b8); }
    .stmt-body { padding: .25rem .8rem .8rem; }
    .facts { display: flex; flex-wrap: wrap; gap: .25rem .9rem; font-size: .75rem; color: var(--text-dim, #94a3b8); margin-bottom: .5rem; }
    .pay { padding: .4rem 0; border-top: 1px dashed var(--border, #334155); }
    .pay-main { display: flex; justify-content: space-between; font-size: .85rem; }
    .pill { font-size: .65rem; padding: .1rem .5rem; border-radius: 999px; background: rgba(148,163,184,.2); }
    .pill-paid { background: rgba(52,211,153,.2); color: #34d399; } .pill-unpaid { background: rgba(248,113,113,.2); color: #f87171; } .pill-partly { background: rgba(251,191,36,.2); color: #fbbf24; }
  `],
})
export class CcHistory {
  private readonly api = inject(GenericApi);
  readonly accountId = input.required<number>();
  /** The month the page is showing; its statement is highlighted and opened. */
  readonly selectedDate = input<Date | null>(null);
  /** Change this value to force a reload (e.g. after a payment). */
  readonly refreshKey = input<unknown>(null);

  readonly history = signal<History | null>(null);
  readonly loading = signal(false);
  readonly openId = signal<number | null>(null);

  constructor() {
    effect(() => { this.accountId(); this.refreshKey(); void this.load(); });
  }

  isSelected(s: Statement): boolean {
    const d = this.selectedDate();
    if (!d) return false;
    const sd = new Date(s.statementDate);
    return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
  }
  isOpen(s: Statement): boolean { return this.openId() === s.billId || (this.openId() === null && this.isSelected(s)); }
  toggle(id: number): void { this.openId.set(this.openId() === id ? 0 : id); }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.api.get<History>(`Accounts/${this.accountId()}/credit-card-history`));
      if (res.isSuccess) this.history.set(res.value);
    } catch { /* supplementary panel */ } finally { this.loading.set(false); }
  }
}
