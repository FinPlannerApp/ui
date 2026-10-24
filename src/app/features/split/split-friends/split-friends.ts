import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { DashboardPerson, DashboardTotal, SettlementMethod, SplitDashboard } from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Auth } from '../../../core/services/auth';
import { currencySymbol } from '../split-currency';

/** Everyone you owe or are owed, across all groups and one-to-one friend ledgers. */
@Component({
  selector: 'app-split-friends',
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './split-friends.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplitFriends implements OnInit {
  private splitService = inject(SplitService);
  private notificationService = inject(NotificationService);
  private auth = inject(Auth);
  private router = inject(Router);

  dashboard = signal<SplitDashboard | null>(null);
  isLoading = signal(true);
  expandedKey = signal<string | null>(null);
  filter = signal<'all' | 'owe' | 'owed'>('all');

  // Add friend
  showAddFriend = signal(false);
  friendName = signal('');
  isAddingFriend = signal(false);

  // Settle everything with one person
  settleTarget = signal<{ person: DashboardPerson; total: DashboardTotal } | null>(null);
  settleMethod = signal<SettlementMethod>(SettlementMethod.Cash);
  isSettling = signal(false);

  readonly methodOptions = [
    { label: 'Cash', value: SettlementMethod.Cash },
    { label: 'UPI (already paid)', value: SettlementMethod.Upi },
    { label: 'Bank transfer', value: SettlementMethod.BankTransfer },
    { label: 'Other', value: SettlementMethod.Other }
  ];

  people = computed(() => {
    const all = this.dashboard()?.people ?? [];
    switch (this.filter()) {
      case 'owe': return all.filter(p => p.totals.some(t => t.net < 0));
      case 'owed': return all.filter(p => p.totals.some(t => t.net > 0));
      default: return all;
    }
  });

  sym(code: string): string {
    return currencySymbol(code);
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    try {
      this.dashboard.set(await this.splitService.getDashboard());
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to load balances.');
    } finally {
      this.isLoading.set(false);
    }
  }

  toggle(key: string): void {
    this.expandedKey.set(this.expandedKey() === key ? null : key);
  }

  openAddFriend(): void {
    this.friendName.set('');
    this.showAddFriend.set(true);
  }

  async addFriend(): Promise<void> {
    const name = this.friendName().trim();
    if (!name) {
      this.notificationService.showError("Enter your friend's name.");
      return;
    }
    const myName = this.auth.currentUserDetails()?.name || this.auth.currentUser() || 'Me';
    this.isAddingFriend.set(true);
    try {
      const group = await this.splitService.createFriend({ friendName: name, myName });
      this.showAddFriend.set(false);
      this.notificationService.showSuccess(`${name} added — add your first expense with them.`);
      this.router.navigate(['/app/split', group.id]);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Could not add this friend.');
    } finally {
      this.isAddingFriend.set(false);
    }
  }

  openSettle(person: DashboardPerson, total: DashboardTotal): void {
    this.settleTarget.set({ person, total });
    this.settleMethod.set(SettlementMethod.Cash);
  }

  /** The lines in the settle dialog: one payment per group, in the direction the money is owed. */
  settleLines = computed(() => {
    const t = this.settleTarget();
    return t ? t.person.lines.filter(l => l.currency === t.total.currency && l.amount !== 0) : [];
  });

  async confirmSettle(): Promise<void> {
    const t = this.settleTarget();
    if (!t) return;
    this.isSettling.set(true);
    try {
      const res = await this.splitService.settleWithPerson({
        personKey: t.person.key, currency: t.total.currency, method: this.settleMethod()
      });
      this.settleTarget.set(null);
      this.notificationService.showSuccess(
        `Recorded ${res.paymentsRecorded} payment${res.paymentsRecorded === 1 ? '' : 's'} with ${t.person.name}.`);
      await this.load();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Could not settle up.');
      await this.load();
    } finally {
      this.isSettling.set(false);
    }
  }
}
