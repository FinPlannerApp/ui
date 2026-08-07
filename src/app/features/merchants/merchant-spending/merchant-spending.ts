import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { MerchantService } from '../merchant.service';
import { MerchantSpending } from '../../../core/models/merchant.model';

@Component({
  selector: 'app-merchant-spending',
  standalone: true,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './merchant-spending.html',
  styleUrl: './merchant-spending.scss'
})
export class MerchantSpendingPage implements OnInit {
  private merchantService = inject(MerchantService);

  spending = signal<MerchantSpending[]>([]);
  isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    try {
      this.spending.set(await this.merchantService.getSpending(startDate, endDate));
    } finally {
      this.isLoading.set(false);
    }
  }

  get maxSpent(): number {
    return Math.max(...this.spending().map(s => s.totalSpent), 1);
  }
}
