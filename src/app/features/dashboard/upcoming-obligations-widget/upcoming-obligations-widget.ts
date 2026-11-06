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

  /** Whole calendar days until the due date; negative when it is already overdue. */
  daysUntil(dateStr: string): number {
    const due = new Date(dateStr);
    const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return Math.round((startOf(due) - startOf(new Date())) / (1000 * 60 * 60 * 24));
  }

  /** Badge text, e.g. "Overdue by 3 days", "Due today", "In 9 days". */
  dueLabel(o: UpcomingObligation): string {
    const d = this.daysUntil(o.dueDate);
    if (d < 0 || o.isOverdue) {
      const n = Math.abs(d);
      return n <= 1 ? 'Overdue' : `Overdue by ${n} days`;
    }
    if (d === 0) return 'Due today';
    return d === 1 ? 'Tomorrow' : `In ${d} days`;
  }

  isUrgent(o: UpcomingObligation): boolean {
    return !!o.isOverdue || this.daysUntil(o.dueDate) <= 0;
  }

  displayAmount(obligation: UpcomingObligation): string {
    if (obligation.source === 'CreditCard') {
      // `amount` is what is still unpaid on the latest statement.
      if (obligation.amount != null) return `₹${obligation.amount.toLocaleString('en-IN')} due`;
      return obligation.minimumDueAmount != null
        ? `Min. due: ₹${obligation.minimumDueAmount.toLocaleString('en-IN')}`
        : 'Amount not set';
    }
    return obligation.amount != null ? `₹${obligation.amount.toLocaleString('en-IN')}` : '';
  }
}
