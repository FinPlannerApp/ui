import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-adjust-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './adjust-balance.html',
  styleUrl: './adjust-balance.scss'
})
export class AdjustBalance {
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);

  currentBalance: number = this.config.data?.currentBalance ?? 0;
  accountName: string = this.config.data?.accountName ?? '';
  accountId: number = this.config.data?.accountId;

  newBalance = signal<number | null>(this.currentBalance);
  reason = signal('');
  isSubmitting = signal(false);

  delta = computed(() => {
    const nb = this.newBalance();
    return nb === null ? 0 : nb - this.currentBalance;
  });

  async save(): Promise<void> {
    const nb = this.newBalance();
    if (nb === null) return;

    if (nb === this.currentBalance) {
      this.notificationService.showError('New balance matches the current balance — nothing to adjust.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.api.post<any>('Accounts/adjust-balance', {
        accountId: this.accountId,
        newBalance: nb,
        reason: this.reason().trim() || null
      }));
      this.notificationService.showSuccess('Balance adjusted.');
      this.ref.close(true);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to adjust balance.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
