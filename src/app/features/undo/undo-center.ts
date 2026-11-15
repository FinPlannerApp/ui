import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { UndoService } from '../../core/services/undo.service';
import { NotificationService } from '../../core/services/notification.service';
import { AccountState } from '../../core/state/account-state.service';
import { UndoItem } from '../../core/models/undo.model';
import { sharedPrimeModules } from '../../shared/prime-imports';

const WINDOW_SECONDS = 600;

/** Every delete that can still be undone, with what undoing it would do to the account and the budget. */
@Component({
  selector: 'app-undo-center',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, ...sharedPrimeModules],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './undo-center.html',
  styleUrl: './undo-center.css'
})
export class UndoCenter implements OnInit {
  readonly undo = inject(UndoService);
  private notify = inject(NotificationService);
  private accounts = inject(AccountState);
  busyId = signal<number | null>(null);

  ngOnInit(): void { void this.undo.load(); }

  /** Ring progress 0..1 of the time still left. */
  ringFraction(i: UndoItem): number { return Math.min(1, this.undo.secondsLeft(i) / WINDOW_SECONDS); }
  clock(i: UndoItem): string {
    const s = this.undo.secondsLeft(i);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  urgent(i: UndoItem): boolean { return this.undo.secondsLeft(i) <= 60; }

  /** Width (%) of a balance bar relative to the larger of the two balances. */
  barPct(value: number, i: UndoItem): number {
    const max = Math.max(Math.abs(i.balanceNow), Math.abs(i.balanceAfter), 1);
    return Math.min(100, Math.abs(value) / max * 100);
  }

  budgetPct(spent: number, i: UndoItem): number {
    const b = i.budget; if (!b || b.budgetAmount <= 0) return 0;
    return spent / b.budgetAmount * 100;
  }
  budgetColor(pct: number, threshold: number): string {
    return pct > 100 ? '#ef4444' : pct >= 100 ? '#f97316' : pct >= threshold ? '#f59e0b' : '#22c55e';
  }
  /** One plain sentence about what the budget will do. */
  budgetNote(i: UndoItem): string {
    const b = i.budget!; const before = this.budgetPct(b.spentNow, i); const after = this.budgetPct(b.spentAfter, i);
    if (after > 100 && before <= 100) return `Puts ${b.name} over its budget (${Math.round(after)}%).`;
    if (after >= b.alertThresholdPercent && before < b.alertThresholdPercent) return `Takes ${b.name} past your ${b.alertThresholdPercent}% alert level.`;
    if (after > 100) return `${b.name} is already over budget; it goes further over.`;
    return `${b.name} goes from ${Math.round(before)}% to ${Math.round(after)}% of its budget.`;
  }

  async restore(i: UndoItem): Promise<void> {
    this.busyId.set(i.transactionId);
    const r = await this.undo.restore(i);
    this.busyId.set(null);
    if (r.ok) { this.notify.showSuccess(`Restored "${i.description}".`); await this.accounts.refresh(); }
    else this.notify.showError(r.message || 'Could not undo.');
  }
}
