import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';

export interface CreditCardBillResult {
  recordedBillAmount: number;
  computedFromTransactions: number;
  impliedInterestAndFees: number;
  statementDate: string;
}

@Component({
  selector: 'app-record-cc-bill',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './record-cc-bill.html',
  styleUrl: './record-cc-bill.scss'
})
export class RecordCcBill {
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);

  accountId: number = this.config.data?.accountId;
  accountName: string = this.config.data?.accountName ?? '';

  billAmount = signal<number | null>(null);
  minimumDue = signal<number | null>(null);
  dueDate = signal<Date | null>(null);

  isSubmitting = signal(false);
  result = signal<CreditCardBillResult | null>(null);

  async save(): Promise<void> {
    const amount = this.billAmount();
    if (amount === null || amount < 0) {
      this.notificationService.showError('Please enter a valid bill amount.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const res = await firstValueFrom(this.api.post<CreditCardBillResult>('Accounts/record-credit-card-bill', {
        accountId: this.accountId,
        billAmount: amount,
        minimumDue: this.minimumDue(),
        dueDate: this.dueDate() ? this.dueDate()!.toISOString() : null
      }));

      if (res.isSuccess) {
        this.result.set(res.value);
        this.notificationService.showSuccess('Credit card bill recorded.');
      }
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to record credit card bill.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  close(): void {
    this.ref.close(!!this.result());
  }
}
