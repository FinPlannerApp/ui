import { Component, OnInit, computed, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { UpcomingObligation } from '../../../core/models/obligation.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-upcoming-obligations-widget',
  standalone: true,
  imports: [CommonModule, ...sharedPrimeModules],
  templateUrl: './upcoming-obligations-widget.html',
})
export class UpcomingObligationsWidget implements OnInit {
  private api = inject(GenericApi);
  private confirm = inject(ConfirmationService);
  private toast = inject(MessageService);

  /** Layout mode: 'row' (grid for full-width) or 'stack' (vertical list for side column) */
  layout = input<'row' | 'stack'>('row');

  busyLoanId = signal<number | null>(null);

  obligations = signal<UpcomingObligation[]>([]);
  isLoading = signal(true);
  showDrawer = signal(false);

  // In stack mode (side column), show up to 6 obligations with smooth scrolling
  // In row mode (full-width grid), show 4 cards for a clean grid
  maxDisplayed = computed(() => this.layout() === 'stack' ? 6 : 4);
  displayedObligations = computed(() => this.obligations().slice(0, this.maxDisplayed()));
  totalCount = computed(() => this.obligations().length);
  hasMore = computed(() => this.obligations().length > this.maxDisplayed());
  remainingCount = computed(() => Math.max(0, this.totalCount() - this.maxDisplayed()));
  totalUpcomingAmount = computed(() => this.obligations().reduce((acc, curr) => acc + (curr.amount ?? curr.minimumDueAmount ?? 0), 0));

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
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

  /** Overdue loan EMIs the user can mark as already paid (auto-debited by the bank). */
  canMarkPaid(o: UpcomingObligation): boolean {
    return o.source === 'Loan' && !!o.isOverdue && !!o.loanAccountId && (o.overdueInstallments ?? 0) > 0;
  }

  markLoanPaid(o: UpcomingObligation): void {
    const n = Math.max(1, o.overdueInstallments ?? 1);
    this.confirm.confirm({
      header: 'Mark EMI as already paid?',
      message: `This moves "${o.accountName}" forward by ${n} month${n > 1 ? 's' : ''} without recording any payment or changing any balance. ` +
        `Use it only when your bank already took the money and your balances already reflect it.`,
      icon: 'pi pi-info-circle',
      acceptLabel: `Yes, mark ${n} paid`,
      rejectLabel: 'Cancel',
      accept: async () => {
        this.busyLoanId.set(o.loanAccountId!);
        try {
          const res = await firstValueFrom(this.api.post<string>(`Accounts/${o.loanAccountId}/advance-due-date`, { months: n }));
          if (res.isSuccess) {
            this.toast.add({ severity: 'success', summary: 'Updated', detail: 'EMI schedule moved forward.' });
            await this.load();
          } else {
            this.toast.add({ severity: 'error', summary: 'Could not update', detail: res.error?.description ?? 'Please try again.' });
          }
        } catch {
          this.toast.add({ severity: 'error', summary: 'Could not update', detail: 'Please try again.' });
        } finally {
          this.busyLoanId.set(null);
        }
      }
    });
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
