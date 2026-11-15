import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AccountState } from '../../../core/state/account-state.service';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { AccountSettings, DEFAULT_ACCOUNT_SETTINGS } from '../../../core/models/user-settings.model';
import { AccountType } from '../../../core/models/account-type.model';
import { Account } from '../account';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { ACCOUNTS_TABS } from '../accounts-tabs';

const PALETTE = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#84cc16', '#f97316'];
const MS_PER_DAY = 86_400_000;

@Component({
  selector: 'app-accounts-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, ModuleTabs, CurrencyPipe, DecimalPipe, ...sharedPrimeModules],
  templateUrl: './accounts-overview.html',
  styleUrl: './accounts-overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountsOverview implements OnInit {
  private state = inject(AccountState);
  private settingsApi = inject(UserSettingsService);

  readonly tabs = ACCOUNTS_TABS;
  settings = signal<AccountSettings>({ ...DEFAULT_ACCOUNT_SETTINGS });
  /** Temporarily reveal balances even when "hide balances" is on. */
  revealed = signal(false);
  hidden = computed(() => this.settings().hideBalances && !this.revealed());
  loading = this.state.isLoading;
  animated = signal(false);

  accounts = this.state.accounts;

  private isLiability = (a: Account) => !!a.isLiability || a.accountType === AccountType.CreditCard || a.accountType === AccountType.Loan;

  assets = computed(() => this.accounts().filter(a => !this.isLiability(a) && a.balance > 0).reduce((s, a) => s + a.balance, 0));
  liabilities = computed(() => this.accounts().reduce((s, a) => this.isLiability(a) || a.balance < 0 ? s + Math.abs(a.balance) : s, 0));
  netWorth = computed(() => this.assets() - this.liabilities());

  /** Money you can spend now: bank + cash accounts only (not investments, cards or loans). */
  liquid = computed(() => this.accounts()
    .filter(a => a.accountType === AccountType.Bank || a.accountType === AccountType.Cash)
    .reduce((s, a) => s + a.balance, 0));
  cardDebt = computed(() => this.cards().reduce((s, a) => s + Math.abs(a.balance), 0));
  loanDebt = computed(() => this.accounts().filter(a => a.accountType === AccountType.Loan).reduce((s, a) => s + Math.abs(a.balance), 0));

  cards = computed(() => this.accounts().filter(a => a.accountType === AccountType.CreditCard));

  /** Credit utilisation per card (outstanding ÷ limit), highest first. */
  cardUse = computed(() => this.cards()
    .filter(c => (c.creditCardDetails?.creditLimit ?? 0) > 0)
    .map(c => {
      const limit = c.creditCardDetails!.creditLimit!;
      const used = Math.abs(c.balance);
      return { id: c.id, name: c.name, used, limit, pct: Math.min(100, used / limit * 100), raw: used / limit * 100 };
    })
    .sort((a, b) => b.raw - a.raw));

  lowBalance = computed(() => {
    const t = this.settings().lowBalanceThreshold;
    if (t <= 0) return [];
    return this.accounts()
      .filter(a => (a.accountType === AccountType.Bank || a.accountType === AccountType.Cash) && a.balance < t)
      .sort((a, b) => a.balance - b.balance);
  });

  cardsDueSoon = computed(() => {
    const days = this.settings().cardDueReminderDays;
    if (days <= 0) return [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.cards()
      .filter(c => !!c.creditCardDetails?.dueDate && !c.creditCardDetails.isPaid && (c.creditCardDetails.remainingBillAmount ?? 0) > 0)
      .map(c => {
        const due = new Date(c.creditCardDetails!.dueDate!); due.setHours(0, 0, 0, 0);
        return { id: c.id, name: c.name, due, daysLeft: Math.round((due.getTime() - today.getTime()) / MS_PER_DAY), amount: c.creditCardDetails!.remainingBillAmount ?? 0 };
      })
      .filter(c => c.daysLeft <= days)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  });

  topAccounts = computed(() => [...this.accounts()].filter(a => !this.isLiability(a) && a.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5));
  maxTop = computed(() => this.topAccounts()[0]?.balance ?? 1);

  categoryChart = computed(() => {
    const totals = new Map<string, number>();
    for (const a of this.accounts()) {
      if (this.isLiability(a) || a.balance <= 0) continue;
      const k = a.accountCategoryName || 'Other';
      totals.set(k, (totals.get(k) ?? 0) + a.balance);
    }
    const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    return {
      labels: rows.map(r => r[0]),
      datasets: [{ data: rows.map(r => r[1]), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 0 }]
    };
  });
  hasCategoryData = computed(() => this.categoryChart().labels.length > 0);

  readonly donutOptions = {
    maintainAspectRatio: false,
    cutout: '66%',
    plugins: { legend: { position: 'bottom', labels: { color: 'rgba(148,163,184,0.95)', usePointStyle: true } } }
  };

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.state.loadAccounts(),
      this.settingsApi.getAccounts().then(s => this.settings.set(s)).catch(() => { /* defaults */ })
    ]);
    requestAnimationFrame(() => requestAnimationFrame(() => this.animated.set(true)));
  }

  barWidth(pct: number): number { return this.animated() ? pct : 0; }

  utilColor(pct: number): string { return pct >= 75 ? '#ef4444' : pct >= 30 ? '#f59e0b' : '#10b981'; }

  dueLabel(days: number): string {
    return days < 0 ? `${-days}d overdue` : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`;
  }
}
