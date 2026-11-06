import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountState } from '../../../core/state/account-state.service';
import { AccountType } from '../../../core/models/account-type.model';

/** Round to paise so JS float residue (0.1 + 0.2) never reaches the API or the UI. */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

let rowUid = 0;

export interface PaymentRow {
  uid: number;
  payingAccountId: number | null;
  amount: number | null;
  paymentAppName: string;
  appliedWalletAmount: number | null;
  cashbackAmount: number | null;
  cashbackType: number | null; // 0 = Direct, 1 = Indirect
  cashbackAccountId: number | null;
  suggestions: AccountSuggestion[];
  showSuggestions: boolean;
  isLoadingSuggestions?: boolean;
  showOptional?: boolean;
}

export interface AccountSuggestion {
  accountId: number;
  accountName: string;
  balance: number;
  hasSufficientBalance: boolean;
  shortfall: number;
}

export interface SinglePaymentResult {
  interestPortion: number;
  principalPortion: number;
  cashbackAmount: number | null;
}

export interface CreditCardPaymentBatchResult {
  payments: SinglePaymentResult[];
  totalPaid: number;
  totalInterestPaid: number;
  totalCashbackReceived: number;
  remainingBalance: number;
  billMarkedPaid: boolean;
}

@Component({
  selector: 'app-pay-cc-bill',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './pay-cc-bill.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col min-h-0 flex-1' }
})
export class PayCcBill implements OnInit {
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);
  private accountState = inject(AccountState);

  accountId: number = this.config.data?.accountId;
  accountName: string = this.config.data?.accountName ?? '';
  outstandingBalance: number = this.config.data?.outstandingBalance ?? 0;

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  result = signal<CreditCardPaymentBatchResult | null>(null);
  knownPaymentApps = signal<string[]>([]);
  filteredPaymentApps = signal<string[]>([]);
  walletBalances = signal<Record<string, number>>({});

  rows = signal<PaymentRow[]>([this.newRow()]);

  eligibleAccounts = computed(() =>
    this.accountState.accounts().filter(a => a.accountType !== AccountType.CreditCard)
  );

  totalEntered = computed(() =>
    r2(this.rows().reduce((sum, r) => sum + (r.amount ?? 0), 0))
  );

  /** Wallet money used across all rows — reduces what leaves the bank, not the bill. */
  totalFromWallet = computed(() =>
    r2(this.rows().reduce((sum, r) => sum + (r.appliedWalletAmount ?? 0), 0))
  );

  /** Cash that actually leaves bank/cash accounts. */
  totalFromBank = computed(() => r2(this.totalEntered() - this.totalFromWallet()));

  /** Per-row cash leaving the paying account (amount minus wallet applied). */
  bankAmount(row: PaymentRow): number {
    return r2((row.amount ?? 0) - (row.appliedWalletAmount ?? 0));
  }

  /** Wallet balance of this row's app still unspent by rows above it. */
  walletLeft(index: number): number {
    const rows = this.rows();
    const app = (rows[index]?.paymentAppName ?? '').trim();
    if (!app) return 0;
    let used = 0;
    for (let i = 0; i < index; i++) {
      if ((rows[i].paymentAppName ?? '').trim() === app) used += rows[i].appliedWalletAmount ?? 0;
    }
    return Math.max(0, r2(this.availableWalletBalance(app) - used));
  }

  /** Most wallet this row may apply: its app's remaining balance, capped at the payment itself. */
  walletCap(index: number): number {
    return r2(Math.min(this.walletLeft(index), this.rows()[index]?.amount ?? 0));
  }

  exceedsOutstanding = computed(() => this.totalEntered() > r2(this.outstandingBalance + 0.01));

  remainingBalance = computed(() =>
    Math.max(0, r2(this.outstandingBalance - this.totalEntered()))
  );

  coveragePercent = computed(() => {
    if (!this.outstandingBalance || this.outstandingBalance <= 0) return 0;
    const pct = Math.round((this.totalEntered() / this.outstandingBalance) * 100);
    return Math.min(pct, 100);
  });

  async ngOnInit(): Promise<void> {
    try {
      // Independent requests — run together instead of one after another.
      const [, appsRes, walletsRes] = await Promise.all([
        this.accountState.loadAccounts(),
        firstValueFrom(this.api.get<string[]>('Accounts/payment-app-names')),
        firstValueFrom(
          this.api.get<{ paymentAppName: string; currentBalance: number }[]>('Accounts/payment-app-wallets')
        )
      ]);

      if (appsRes.isSuccess) this.knownPaymentApps.set(appsRes.value ?? []);

      if (walletsRes.isSuccess) {
        const map: Record<string, number> = {};
        for (const w of walletsRes.value ?? []) {
          map[w.paymentAppName] = w.currentBalance;
        }
        this.walletBalances.set(map);
      }
    } catch {
      // Wallets/app names are conveniences; the payment itself still works without them.
      this.errorMessage.set('Could not load payment apps and wallet balances. You can still pay from an account.');
    }

    // Default first row amount to full outstanding balance for convenience
    if (this.outstandingBalance > 0) {
      this.updateRow(0, { amount: r2(this.outstandingBalance) });
    }
  }

  private newRow(): PaymentRow {
    return {
      uid: ++rowUid,
      payingAccountId: null,
      amount: null,
      paymentAppName: '',
      appliedWalletAmount: null,
      cashbackAmount: null,
      cashbackType: null,
      cashbackAccountId: null,
      suggestions: [],
      showSuggestions: false,
      isLoadingSuggestions: false,
      showOptional: false
    };
  }

  addRow(): void {
    const remaining = this.remainingBalance();
    const nextRow = this.newRow();
    if (remaining > 0) {
      nextRow.amount = r2(remaining);
    }
    this.rows.update(rows => [...rows, nextRow]);
  }

  removeRow(index: number): void {
    if (this.rows().length === 1) return;
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  updateRow(index: number, patch: Partial<PaymentRow>): void {
    this.rows.update(rows => this.normalizeWallets(rows.map((r, i) => i === index ? { ...r, ...patch } : r)));
  }

  /** Changing the app invalidates any wallet amount that was applied for the old one. */
  setPaymentApp(index: number, name: string | null): void {
    this.updateRow(index, { paymentAppName: name ?? '', appliedWalletAmount: null });
  }

  /**
   * Keeps every row's applied wallet amount legal after any edit: zero when
   * there's no app / no balance, never above the payment amount, and never
   * above what the app's wallet still holds after rows above it.
   */
  private normalizeWallets(rows: PaymentRow[]): PaymentRow[] {
    const used: Record<string, number> = {};
    return rows.map(r => {
      const app = (r.paymentAppName ?? '').trim();
      if (!app || !r.appliedWalletAmount || r.appliedWalletAmount <= 0) {
        return r.appliedWalletAmount ? { ...r, appliedWalletAmount: null } : r;
      }
      const left = Math.max(0, r2(this.availableWalletBalance(app) - (used[app] ?? 0)));
      const cap = r2(Math.min(left, r.amount ?? 0));
      const applied = r2(Math.min(r.appliedWalletAmount, cap));
      used[app] = (used[app] ?? 0) + applied;
      return applied === r.appliedWalletAmount ? r : { ...r, appliedWalletAmount: applied > 0 ? applied : null };
    });
  }

  async loadSuggestionsFor(index: number): Promise<void> {
    const row = this.rows()[index];
    const targetAmount = row.amount && row.amount > 0 ? row.amount : (this.outstandingBalance - (this.totalEntered() - (row.amount ?? 0)));
    const amountToFetch = targetAmount > 0 ? targetAmount : (this.outstandingBalance || 1000);

    // Toggle off if already showing
    if (row.showSuggestions) {
      this.updateRow(index, { showSuggestions: false });
      return;
    }

    this.updateRow(index, { isLoadingSuggestions: true });

    try {
      const res = await firstValueFrom(
        this.api.get<AccountSuggestion[]>(`Accounts/${this.accountId}/payment-suggestions?amount=${amountToFetch}`)
      );
      if (res.isSuccess) {
        this.updateRow(index, {
          suggestions: res.value ?? [],
          showSuggestions: true,
          isLoadingSuggestions: false
        });
      } else {
        this.updateRow(index, { isLoadingSuggestions: false });
      }
    } catch {
      this.updateRow(index, { isLoadingSuggestions: false });
    }
  }

  selectSuggestion(index: number, accountId: number): void {
    this.updateRow(index, { payingAccountId: accountId, showSuggestions: false });
  }

  fillFullAmount(index: number): void {
    const currentEnteredOther = this.rows().reduce((sum, r, i) => i === index ? sum : sum + (r.amount ?? 0), 0);
    const fillAmount = Math.max(0, r2(this.outstandingBalance - currentEnteredOther));
    this.updateRow(index, { amount: fillAmount });
  }

  filterPaymentApps(event: any) {
    const query = event.query.toLowerCase();
    this.filteredPaymentApps.set(
      this.knownPaymentApps().filter(a => a.toLowerCase().includes(query))
    );
  }

  availableWalletBalance(appName: string | null): number {
    if (!appName) return 0;
    return this.walletBalances()[appName] ?? 0;
  }

  async pay(): Promise<void> {
    const rows = this.rows();

    for (const row of rows) {
      if (!row.payingAccountId || row.amount === null || row.amount <= 0) {
        this.notificationService.showError('Every payment needs an account and an amount greater than zero.');
        return;
      }
      if ((row.appliedWalletAmount ?? 0) < 0 || (row.appliedWalletAmount ?? 0) > row.amount) {
        this.notificationService.showError('Wallet amount must be between 0 and the payment amount.');
        return;
      }
      if ((row.cashbackAmount ?? 0) > 0 && row.cashbackType === null) {
        this.notificationService.showError('Choose a cashback type (direct, indirect or statement credit).');
        return;
      }
      if (row.cashbackType === 0 && !row.cashbackAccountId) {
        this.notificationService.showError('Direct cashback needs an account to credit it to.');
        return;
      }
    }

    // Cash leaving each account, summed across rows, must fit its balance.
    const perAccount = new Map<number, number>();
    for (const row of rows) {
      perAccount.set(row.payingAccountId!, r2((perAccount.get(row.payingAccountId!) ?? 0) + this.bankAmount(row)));
    }
    for (const [accId, cash] of perAccount) {
      const acc = this.eligibleAccounts().find(a => a.id === accId);
      if (acc && cash > acc.balance) {
        this.notificationService.showError(
          `${acc.name} has ₹${acc.balance.toFixed(2)} but ₹${cash.toFixed(2)} would leave it.`
        );
        return;
      }
    }

    if (this.exceedsOutstanding()) {
      this.notificationService.showError(
        `These payments total ₹${this.totalEntered().toFixed(2)}, more than the ₹${this.outstandingBalance.toFixed(2)} owed.`
      );
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);
    try {
      const payload = {
        creditCardAccountId: this.accountId,
        payments: rows.map(r => ({
          payingAccountId: r.payingAccountId,
          amount: r.amount,
          appliedWalletAmount: r.appliedWalletAmount ?? 0,
          date: new Date().toISOString(),
          paymentAppName: r.paymentAppName.trim() || null,
          cashbackAmount: r.cashbackAmount,
          cashbackType: r.cashbackType,
          cashbackAccountId: r.cashbackAccountId
        }))
      };

      const res = await firstValueFrom(
        this.api.post<CreditCardPaymentBatchResult>('Accounts/make-credit-card-payment-batch', payload)
      );

      if (res.isSuccess) {
        this.result.set(res.value);
        this.notificationService.showSuccess('Payment recorded.');
        await this.accountState.refresh();
      } else {
        const errorMsg = res.error?.description || 'Payment failed.';
        this.errorMessage.set(errorMsg);
        this.notificationService.showError(errorMsg, 'Payment Failed');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Payment failed.';
      this.errorMessage.set(errorMsg);
      this.notificationService.showError(errorMsg, 'Payment Failed');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close(): void {
    this.ref.close(!!this.result());
  }
}
