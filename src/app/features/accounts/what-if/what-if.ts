import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountState } from '../../../core/state/account-state.service';
import { AccountType } from '../../../core/models/account-type.model';
import { cardMinimum, emi, minimumOnlyPayoff, payoff, yearsMonths } from '../../../core/utils/debt-math';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { ACCOUNTS_TABS } from '../accounts-tabs';

/** Loan and card what-ifs: nothing is saved or changed, it only shows what different choices would cost. */
@Component({
  selector: 'app-what-if',
  standalone: true,
  imports: [CommonModule, FormsModule, ModuleTabs, CurrencyPipe, ...sharedPrimeModules],
  templateUrl: './what-if.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WhatIfPage implements OnInit {
  private accountState = inject(AccountState);
  readonly tabs = ACCOUNTS_TABS;
  readonly ym = yearsMonths;

  loans = computed(() => this.accountState.accounts().filter((a: any) => a.accountType === AccountType.Loan));
  cards = computed(() => this.accountState.accounts().filter((a: any) => a.accountType === AccountType.CreditCard));

  mode = signal<'loan' | 'card'>('loan');

  // ── Loan inputs ──
  loanOutstanding = signal<number | null>(1_000_000);
  loanRate = signal<number | null>(10);
  loanEmi = signal<number | null>(null);
  loanMonthsLeft = signal<number | null>(120);
  extraMonthly = signal<number | null>(2000);
  prepayment = signal<number | null>(100_000);
  newRate = signal<number | null>(9);

  // ── Card inputs ──
  cardBalance = signal<number | null>(50_000);
  cardApr = signal<number | null>(42);
  cardMinPct = signal<number | null>(5);
  cardMinFloor = signal<number | null>(200);
  cardPlanned = signal<number | null>(5000);
  emiMonths = signal<number | null>(12);
  emiRate = signal<number | null>(15);
  emiFeePct = signal<number | null>(1);

  async ngOnInit(): Promise<void> {
    try { await this.accountState.loadAccounts(); } catch { /* manual inputs still work */ }
    this.loanEmi.set(emi(this.loanOutstanding() ?? 0, this.loanRate() ?? 0, this.loanMonthsLeft() ?? 0));
  }

  pickLoan(id: number | null): void {
    const a: any = this.loans().find((x: any) => x.id === id);
    if (!a) return;
    const d = a.loanDetails ?? {};
    const out = Math.abs(a.balance ?? 0) || d.principalAmount || 0;
    this.loanOutstanding.set(out);
    this.loanRate.set(d.interestRate ?? 10);
    this.loanEmi.set(d.emiAmount ?? emi(out, d.interestRate ?? 10, d.tenureMonths ?? 120));
    this.loanMonthsLeft.set(d.tenureMonths ?? 120);
  }

  pickCard(id: number | null): void {
    const a: any = this.cards().find((x: any) => x.id === id);
    if (!a) return;
    const d = a.creditCardDetails ?? {};
    this.cardBalance.set(Math.abs(a.balance ?? 0) || d.remainingBillAmount || 0);
    if (d.interestRate) this.cardApr.set(d.interestRate);
  }

  private n(v: number | null): number { return Number.isFinite(v as number) ? (v as number) : 0; }

  loanBase = computed(() => payoff(this.n(this.loanOutstanding()), this.n(this.loanRate()), this.n(this.loanEmi())));
  loanExtra = computed(() => payoff(this.n(this.loanOutstanding()), this.n(this.loanRate()), this.n(this.loanEmi()) + this.n(this.extraMonthly())));
  loanPrepay = computed(() => payoff(this.n(this.loanOutstanding()), this.n(this.loanRate()), this.n(this.loanEmi()), this.n(this.prepayment())));
  /** Prepay and keep the remaining time: the EMI drops instead. */
  loanPrepayLowerEmi = computed(() => emi(Math.max(0, this.n(this.loanOutstanding()) - this.n(this.prepayment())), this.n(this.loanRate()), this.loanBase().months ?? this.n(this.loanMonthsLeft())));
  loanNewRateSameEmi = computed(() => payoff(this.n(this.loanOutstanding()), this.n(this.newRate()), this.n(this.loanEmi())));
  loanNewRateEmi = computed(() => emi(this.n(this.loanOutstanding()), this.n(this.newRate()), this.loanBase().months ?? this.n(this.loanMonthsLeft())));

  saved(base: { months: number | null; totalInterest: number }, alt: { months: number | null; totalInterest: number }): { months: number; interest: number } | null {
    if (base.months === null || alt.months === null) return null;
    return { months: base.months - alt.months, interest: base.totalInterest - alt.totalInterest };
  }

  cardMin = computed(() => cardMinimum(this.n(this.cardBalance()), this.n(this.cardMinPct()), this.n(this.cardMinFloor())));
  cardMinOnly = computed(() => minimumOnlyPayoff(this.n(this.cardBalance()), this.n(this.cardApr()), this.n(this.cardMinPct()), this.n(this.cardMinFloor())));
  cardFixed = computed(() => payoff(this.n(this.cardBalance()), this.n(this.cardApr()), this.n(this.cardPlanned())));
  cardEmiMonthly = computed(() => emi(this.n(this.cardBalance()), this.n(this.emiRate()), this.n(this.emiMonths())));
  cardEmiTotalCost = computed(() => {
    const m = this.n(this.emiMonths()), monthly = this.cardEmiMonthly();
    const fee = this.n(this.cardBalance()) * this.n(this.emiFeePct()) / 100;
    return Math.round((monthly * m - this.n(this.cardBalance()) + fee) * 100) / 100;
  });
}
