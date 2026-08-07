import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { UpcomingObligation } from '../../../core/models/obligation.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
  selector: 'app-upcoming-obligations-widget',
  standalone: true,
  imports: [CommonModule, ...sharedPrimeModules],
  templateUrl: './upcoming-obligations-widget.html',
})
export class UpcomingObligationsWidget implements OnInit {
  private api = inject(GenericApi);

  obligations = signal<UpcomingObligation[]>([]);
  isLoading = signal(true);
  showDrawer = signal(false);

  // Max 4 items on the main dashboard row
  displayedObligations = computed(() => this.obligations().slice(0, 4));
  totalCount = computed(() => this.obligations().length);
  hasMore = computed(() => this.obligations().length > 4);
  totalUpcomingAmount = computed(() => this.obligations().reduce((acc, curr) => acc + (curr.amount ?? curr.minimumDueAmount ?? 0), 0));

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.get<UpcomingObligation[]>('RecurringTransactions/upcoming-obligations?daysAhead=30'));
      this.obligations.set(result.value ?? []);
    } catch (err) {
      // Non-critical dashboard widget — fail quietly, leave it empty
      // rather than disrupting the rest of the dashboard.
    } finally {
      this.isLoading.set(false);
    }
  }

  daysUntil(dateStr: string): number {
    const days = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(days));
  }

  displayAmount(obligation: UpcomingObligation): string {
    if (obligation.source === 'CreditCard') {
      return obligation.minimumDueAmount != null
        ? `Min. due: ₹${obligation.minimumDueAmount.toLocaleString('en-IN')}`
        : 'Amount not set';
    }
    return obligation.amount != null ? `₹${obligation.amount.toLocaleString('en-IN')}` : '';
  }
}
