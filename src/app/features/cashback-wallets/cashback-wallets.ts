import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../shared/prime-imports';
import { GenericApi } from '../../core/services/generic-api';
import { NotificationService } from '../../core/services/notification.service';

export interface WalletLedgerEntry {
  amount: number;
  type: string; // "Earned" or "Applied"
  date: string;
  creditCardPaymentId: number;
}

export interface PaymentAppWallet {
  paymentAppName: string;
  currentBalance: number;
  recentEntries: WalletLedgerEntry[];
}

@Component({
  selector: 'app-cashback-wallets',
  standalone: true,
  imports: [CommonModule, ...sharedPrimeModules],
  templateUrl: './cashback-wallets.html',
})
export class CashbackWallets implements OnInit {
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);

  wallets = signal<PaymentAppWallet[]>([]);
  isLoading = signal(true);
  expandedApp = signal<string | null>(null);
  totalAcrossApps = signal(0);

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(this.api.get<PaymentAppWallet[]>('Accounts/payment-app-wallets'));
      if (result.isSuccess) {
        const wallets = result.value ?? [];
        this.wallets.set(wallets);
        this.totalAcrossApps.set(wallets.reduce((sum, w) => sum + w.currentBalance, 0));
      }
    } catch {
      this.notificationService.showError('Could not load cashback wallet data.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleExpanded(appName: string): void {
    this.expandedApp.set(this.expandedApp() === appName ? null : appName);
  }
}
