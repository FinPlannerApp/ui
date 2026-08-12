import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import {
  ExpenseParticipantLine, GroupBalances, SettlementMethod, SimplifiedDebt,
  SplitExpense, SplitGroup, SplitType
} from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';
import { OnlineStatusService } from '../../../core/services/online-status.service';

@Component({
  selector: 'app-split-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './split-group-detail.html',
  styleUrl: './split-group-detail.scss'
})
export class SplitGroupDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private splitService = inject(SplitService);
  private notificationService = inject(NotificationService);
  public onlineStatus = inject(OnlineStatusService);

  readonly SplitType = SplitType;

  groupId = Number(this.route.snapshot.paramMap.get('id'));
  group = signal<SplitGroup | null>(null);
  expenses = signal<SplitExpense[]>([]);
  balances = signal<GroupBalances | null>(null);
  isLoading = signal(true);
  activeTab = signal<'expenses' | 'balances'>('expenses');

  // ── Add member ──────────────────────────────────────────────────────────────
  showAddMember = signal(false);
  newMemberName = signal('');
  newMemberUpi = signal('');

  // ── Add expense ──────────────────────────────────────────────────────────────
  showAddExpense = signal(false);
  expDescription = signal('');
  expAmount = signal<number | null>(null);
  expDate = signal<Date>(new Date());
  expSplitType = signal<SplitType>(SplitType.Equal);
  expPayerId = signal<number | null>(null);
  expParticipantIds = signal<Set<number>>(new Set());
  expExactAmounts = signal<Record<number, number>>({});
  expPercentages = signal<Record<number, number>>({});
  expShares = signal<Record<number, number>>({});

  splitTypeOptions = [
    { label: 'Equal', value: SplitType.Equal },
    { label: 'Exact', value: SplitType.Exact },
    { label: 'Percentage', value: SplitType.Percentage },
    { label: 'Shares', value: SplitType.Shares }
  ];

  memberOptions = computed(() =>
    (this.group()?.members ?? []).map(m => ({ label: m.name, value: m.id }))
  );

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  private async loadAll(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [group, expenses, balances] = await Promise.all([
        this.splitService.getGroup(this.groupId),
        this.splitService.getExpenses(this.groupId),
        this.splitService.getBalances(this.groupId)
      ]);
      this.group.set(group);
      this.expenses.set(expenses);
      this.balances.set(balances);
    } catch {
      this.notificationService.showError('Could not load this group.');
    } finally {
      this.isLoading.set(false);
    }
  }

  shareLink(): string {
    const token = this.group()?.shareToken;
    return token ? `${window.location.origin}/split/public/${token}` : '';
  }

  async copyShareLink(): Promise<void> {
    await navigator.clipboard.writeText(this.shareLink());
    this.notificationService.showSuccess('Share link copied.');
  }

  // ── Add member ──────────────────────────────────────────────────────────────

  async addMember(): Promise<void> {
    const name = this.newMemberName().trim();
    if (!name) return;
    try {
      await this.splitService.addMember(this.groupId, name, this.newMemberUpi().trim() || null);
      this.newMemberName.set('');
      this.newMemberUpi.set('');
      this.showAddMember.set(false);
      await this.loadAll();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to add member.');
    }
  }

  // ── Add expense ──────────────────────────────────────────────────────────────

  openAddExpense(): void {
    this.expDescription.set('');
    this.expAmount.set(null);
    this.expDate.set(new Date());
    this.expSplitType.set(SplitType.Equal);
    this.expPayerId.set(this.group()?.members[0]?.id ?? null);
    this.expParticipantIds.set(new Set((this.group()?.members ?? []).map(m => m.id)));
    this.expExactAmounts.set({});
    this.expPercentages.set({});
    this.expShares.set({});
    this.showAddExpense.set(true);
  }

  toggleParticipant(memberId: number): void {
    const current = new Set(this.expParticipantIds());
    if (current.has(memberId)) current.delete(memberId); else current.add(memberId);
    this.expParticipantIds.set(current);
  }

  updateExactAmount(memberId: number, value: number): void {
    this.expExactAmounts.update(m => ({ ...m, [memberId]: value }));
  }

  updatePercentage(memberId: number, value: number): void {
    this.expPercentages.update(m => ({ ...m, [memberId]: value }));
  }

  updateShares(memberId: number, value: number): void {
    this.expShares.update(m => ({ ...m, [memberId]: value }));
  }

  async saveExpense(): Promise<void> {
    const amount = this.expAmount();
    const description = this.expDescription().trim();
    const payerId = this.expPayerId();
    const participantIds = Array.from(this.expParticipantIds());

    if (!description || amount === null || amount <= 0 || payerId === null || participantIds.length === 0) {
      this.notificationService.showError('Description, amount, payer, and at least one participant are required.');
      return;
    }

    const type = this.expSplitType();
    const participants: ExpenseParticipantLine[] = participantIds.map(id => {
      if (type === SplitType.Exact) return { memberId: id, exactAmount: this.expExactAmounts()[id] ?? 0 };
      if (type === SplitType.Percentage) return { memberId: id, percentage: this.expPercentages()[id] ?? 0 };
      if (type === SplitType.Shares) return { memberId: id, shares: this.expShares()[id] ?? 1 };
      return { memberId: id };
    });

    try {
      await this.splitService.addExpense({
        groupId: this.groupId,
        description,
        amount,
        date: this.expDate().toISOString(),
        category: null,
        splitType: type,
        payers: [{ memberId: payerId, amountPaid: amount }],
        participants
      });
      this.showAddExpense.set(false);
      await this.loadAll();
      this.notificationService.showSuccess('Expense added.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to add expense.');
    }
  }

  // ── Settle ───────────────────────────────────────────────────────────────────

  async settleDebt(debt: SimplifiedDebt): Promise<void> {
    try {
      const settlement = await this.splitService.createSettlement({
        groupId: this.groupId,
        fromMemberId: debt.fromMemberId,
        toMemberId: debt.toMemberId,
        amount: debt.amount,
        method: SettlementMethod.Upi
      });

      try {
        const paymentRequest = await this.splitService.getPaymentRequest(settlement.id);
        window.open(paymentRequest.upiDeepLink, '_blank');
      } catch {
        this.notificationService.showError(`${debt.toMemberName} hasn't added a UPI ID — mark this paid manually once settled.`);
      }

      await this.loadAll();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create settlement.');
    }
  }
}
