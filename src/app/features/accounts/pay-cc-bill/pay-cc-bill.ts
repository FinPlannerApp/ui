import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountState } from '../../../core/state/account-state.service';
import { AccountType } from '../../../core/models/account-type.model';

export interface PaymentRow {
  payingAccountId: number | null;
  amount: number | null;
  paymentAppName: string;
  cashbackAmount: number | null;
  cashbackType: number | null; // 0 = Direct, 1 = Indirect
  cashbackAccountId: number | null;
  interestCategoryId: number | null;
  suggestions: AccountSuggestion[];
  showSuggestions: boolean;
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
  templateUrl: './pay-cc-bill.html'
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
  result = signal<CreditCardPaymentBatchResult | null>(null);
  categories = signal<{ id: number; name: string }[]>([]);

  rows = signal<PaymentRow[]>([this.newRow()]);

  eligibleAccounts = computed(() =>
    this.accountState.accounts().filter(a => a.accountType !== AccountType.CreditCard)
  );

  totalEntered = computed(() =>
    this.rows().reduce((sum, r) => sum + (r.amount ?? 0), 0)
  );

  exceedsOutstanding = computed(() => this.totalEntered() > this.outstandingBalance);

  async ngOnInit(): Promise<void> {
    await this.accountState.loadAccounts();
    const result = await firstValueFrom(this.api.get<{ id: number; name: string }[]>('TransactionCategories'));
    if (result.isSuccess) this.categories.set(result.value ?? []);
  }

  private newRow(): PaymentRow {
    return {
      payingAccountId: null,
      amount: null,
      paymentAppName: '',
      cashbackAmount: null,
      cashbackType: null,
      cashbackAccountId: null,
      interestCategoryId: null,
      suggestions: [],
      showSuggestions: false
    };
  }

  addRow(): void {
    this.rows.update(rows => [...rows, this.newRow()]);
  }

  removeRow(index: number): void {
    if (this.rows().length === 1) return;
    this.rows.update(rows => rows.filter((_, i) => i !== index));
  }

  updateRow(index: number, patch: Partial<PaymentRow>): void {
    this.rows.update(rows => rows.map((r, i) => i === index ? { ...r, ...patch } : r));
  }

  async loadSuggestionsFor(index: number): Promise<void> {
    const row = this.rows()[index];
    if (!row.amount || row.amount <= 0) {
      this.notificationService.showError('Enter an amount first to see suggestions.');
      return;
    }

    try {
      const res = await firstValueFrom(
        this.api.get<AccountSuggestion[]>(`Accounts/${this.accountId}/payment-suggestions?amount=${row.amount}`)
      );
      if (res.isSuccess) {
        this.updateRow(index, { suggestions: res.value ?? [], showSuggestions: true });
      }
    } catch {
      // Supplementary
    }
  }

  selectSuggestion(index: number, accountId: number): void {
    this.updateRow(index, { payingAccountId: accountId, showSuggestions: false });
  }

  async pay(): Promise<void> {
    const rows = this.rows();

    for (const row of rows) {
      if (!row.payingAccountId || row.amount === null || row.amount <= 0) {
        this.notificationService.showError('Every payment needs an account and an amount greater than zero.');
        return;
      }
      if (row.cashbackType === 0 && !row.cashbackAccountId) {
        this.notificationService.showError('Direct cashback needs an account to credit it to.');
        return;
      }
    }

    if (this.exceedsOutstanding()) {
      this.notificationService.showError(
        `These payments total ₹${this.totalEntered().toFixed(2)}, more than the ₹${this.outstandingBalance.toFixed(2)} owed.`
      );
      return;
    }

    this.isSubmitting.set(true);
    try {
      const payload = {
        creditCardAccountId: this.accountId,
        payments: rows.map(r => ({
          payingAccountId: r.payingAccountId,
          amount: r.amount,
          date: new Date().toISOString(),
          paymentAppName: r.paymentAppName || null,
          cashbackAmount: r.cashbackAmount,
          cashbackType: r.cashbackType,
          cashbackAccountId: r.cashbackAccountId,
          interestCategoryId: r.interestCategoryId
        }))
      };

      const res = await firstValueFrom(
        this.api.post<CreditCardPaymentBatchResult>('Accounts/make-credit-card-payment-batch', payload)
      );

      if (res.isSuccess) {
        this.result.set(res.value);
        this.notificationService.showSuccess('Payment recorded.');
        await this.accountState.refresh();
      }
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Payment failed.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close(): void {
    this.ref.close(!!this.result());
  }
}
