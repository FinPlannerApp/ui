import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { PublicGroupView, SplitExpense } from '../../../core/models/split.model';
import { OnlineStatusService } from '../../../core/services/online-status.service';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { compareExpenses, groupExpensesByDay } from '../split-expense-utils';

@Component({
  selector: 'app-split-public-view',
  standalone: true,
  imports: [CommonModule, ...sharedPrimeModules, InfiniteScrollDirective],
  templateUrl: './split-public-view.html'
})
export class SplitPublicView implements OnInit {
  private route = inject(ActivatedRoute);
  private splitService = inject(SplitService);
  public onlineStatus = inject(OnlineStatusService);

  view = signal<PublicGroupView | null>(null);
  isLoading = signal(true);
  loadFailed = signal(false);

  expenses = signal<SplitExpense[]>([]);
  nextCursor = signal<string | null>(null);
  isLoadingMore = signal(false);
  moreFailed = signal(false);
  expenseGroups = computed(() => groupExpensesByDay(this.expenses()));

  private token: string | null = null;

  settledNet(b: { settledPaid?: number; settledReceived?: number }): number {
    return Math.round(((b.settledPaid ?? 0) - (b.settledReceived ?? 0)) * 100) / 100;
  }

  async ngOnInit(): Promise<void> {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.loadFailed.set(true);
      this.isLoading.set(false);
      return;
    }

    try {
      const view = await this.splitService.getPublicView(this.token);
      this.view.set(view);
      this.expenses.set([...(view.expenses ?? [])].sort(compareExpenses));
      this.nextCursor.set(view.nextCursor ?? null);
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || !this.token || this.isLoadingMore()) return;
    this.isLoadingMore.set(true);
    try {
      const page = await this.splitService.getPublicExpensesPage(this.token, cursor);
      this.expenses.update(list => {
        const byId = new Map<number, SplitExpense>();
        for (const e of [...list, ...page.items]) byId.set(e.id, e);
        return [...byId.values()].sort(compareExpenses);
      });
      this.nextCursor.set(page.nextCursor);
      this.moreFailed.set(false);
    } catch {
      this.moreFailed.set(true);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  retry(): void {
    this.moreFailed.set(false);
    void this.loadMore();
  }
}