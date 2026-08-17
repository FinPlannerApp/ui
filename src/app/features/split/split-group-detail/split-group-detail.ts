import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import {
  ExpenseParticipantLine, GroupBalances, SettlementMethod, SimplifiedDebt,
  SplitExpense, SplitGroup, SplitMember, SplitType
} from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';
import { DraftPersistenceService } from '../../../core/services/draft-persistence.service';
import { OnlineStatusService } from '../../../core/services/online-status.service';
import { AccountState } from '../../../core/state/account-state.service';

import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'app-split-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules, EmptyState],
  providers: [ConfirmationService],
  templateUrl: './split-group-detail.html'
})
export class SplitGroupDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private splitService = inject(SplitService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private draftService = inject(DraftPersistenceService);

  private get draftKey(): string {
    return `split-add-expense-${this.groupId}`;
  }

  constructor() {
    this.draftService.autoSave(this.draftKey, () => ({
      description: this.expDescription(),
      amount: this.expAmount(),
      splitType: this.expSplitType(),
      participantIds: Array.from(this.expParticipantIds())
    }));
  }
  public onlineStatus = inject(OnlineStatusService);
  public accountState = inject(AccountState);

  readonly SplitType = SplitType;

  groupId = Number(this.route.snapshot.paramMap.get('id'));
  group = signal<SplitGroup | null>(null);
  expenses = signal<SplitExpense[]>([]);
  balances = signal<GroupBalances | null>(null);
  isLoading = signal(true);
  activeTab = signal<'expenses' | 'balances'>('expenses');

  // ── Close, Import, Settlement History ───────────────────────────────────────
  showImportDialog = signal(false);
  importAccountId = signal<number | null>(null);
  settlementHistory = signal<any[]>([]);
  isGroupClosed = computed(() => this.group()?.status !== 0); // 0 = Active

  qrCodeDataUrl = signal<string | null>(null);
  qrPaymentDetails = signal<{ upiDeepLink: string; payeeName: string; amount: number } | null>(null);

  closeQrDialog(): void {
    this.qrCodeDataUrl.set(null);
    this.qrPaymentDetails.set(null);
  }

  // ── Add member ──────────────────────────────────────────────────────────────
  showAddMember = signal(false);
  newMemberName = signal('');
  newMemberUpi = signal('');

  editingMemberId = signal<number | null>(null);
  editMemberUpi = signal('');

  startEditUpi(member: SplitMember): void {
    this.editingMemberId.set(member.id);
    this.editMemberUpi.set(member.upiId ?? '');
  }

  cancelEditUpi(): void {
    this.editingMemberId.set(null);
  }

  async saveEditUpi(memberId: number): Promise<void> {
    try {
      await this.splitService.updateMemberUpi(memberId, this.editMemberUpi().trim());
      this.notificationService.showSuccess('UPI updated.');
      this.editingMemberId.set(null);
      await this.loadAll();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to update UPI.');
    }
  }

  // ── Add expense ──────────────────────────────────────────────────────────────
  showAddExpense = signal(false);
  expDescription = signal('');
  expAmount = signal<number | null>(null);
  expDate = signal<Date>(new Date());
  expSplitType = signal<SplitType>(SplitType.Equal);
  expPayerId = signal<number | null>(null);
  splitPayment = signal(false); // opt-in toggle for multi-payer mode
  expPayers = signal<{ memberId: number | null; amount: number | null }[]>([{ memberId: null, amount: null }]);

  togglePaymentSplit(): void {
    this.splitPayment.update(v => !v);
    if (this.splitPayment()) {
      // Seed the first row with whatever was already selected in the
      // single-payer dropdown, so switching modes doesn't lose what
      // the user already picked.
      this.expPayers.set([{ memberId: this.expPayerId(), amount: this.expAmount() }]);
    }
  }

  addPayerRow(): void {
    this.expPayers.update(rows => [...rows, { memberId: null, amount: null }]);
  }

  removePayerRow(index: number): void {
    if (this.expPayers().length === 1) return;
    this.expPayers.update(rows => rows.filter((_, i) => i !== index));
  }

  updatePayerRow(index: number, patch: Partial<{ memberId: number | null; amount: number | null }>): void {
    this.expPayers.update(rows => rows.map((r, i) => i === index ? { ...r, ...patch } : r));
  }

  payersTotal = computed(() =>
    this.expPayers().reduce((sum, r) => sum + (r.amount ?? 0), 0)
  );
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
    this.accountState.loadAccounts();
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
      await this.loadSettlementHistory();
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

  // ── Invite link ──────────────────────────────────────────────────────────────
  generatedInviteLink = signal<string | null>(null);

  async createInvite(): Promise<void> {
    try {
      const created = await this.splitService.createInvite({
        groupId: this.groupId,
        expiresAt: null,
        maxUses: null
      });
      this.generatedInviteLink.set(`${window.location.origin}/split/join/${created.token}`);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create invite.');
    }
  }

  async copyInviteLink(): Promise<void> {
    const link = this.generatedInviteLink();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    this.notificationService.showSuccess('Invite link copied.');
  }

  // ── Close, Import & Summary ─────────────────────────────────────────────────

  async closeGroup(): Promise<void> {
    this.confirmationService.confirm({
      header: 'Close Group',
      message: 'This locks the group and makes it eligible for importing to your personal ledger. You can still view everything afterward — this just marks the trip as settled.',
      icon: 'pi pi-lock',
      accept: async () => {
        try {
          await this.splitService.closeGroup(this.groupId);
          this.notificationService.showSuccess('Group closed.');
          await this.loadAll();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to close group.');
        }
      }
    });
  }

  async openImportDialog(): Promise<void> {
    await this.accountState.loadAccounts();
    this.showImportDialog.set(true);
  }

  async confirmImport(): Promise<void> {
    const accountId = this.importAccountId();
    if (!accountId) {
      this.notificationService.showError('Pick an account to import into.');
      return;
    }
    try {
      const result = await this.splitService.importToLedger({ groupId: this.groupId, accountId });
      this.notificationService.showSuccess(
        `Imported ${result.transactionsCreated} transaction(s).` +
        (result.alreadyImportedCount > 0 ? ` ${result.alreadyImportedCount} were already imported.` : '')
      );
      this.showImportDialog.set(false);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Import failed.');
    }
  }

  async loadSettlementHistory(): Promise<void> {
    try {
      this.settlementHistory.set(await this.splitService.getSettlementHistory(this.groupId));
    } catch {
      // Non-critical for the main view
    }
  }

  async shareSettlementSummary(): Promise<void> {
    const g = this.group();
    const settlements = this.settlementHistory();
    const lines = [
      `${g?.name} — Settlement Summary`,
      '',
      ...settlements.map(s =>
        `${s.fromMemberName} → ${s.toMemberName}: ₹${s.amount.toFixed(2)} (${s.status === 1 ? 'Completed' : 'Pending'})`
      ),
      '',
      `Total spend: ₹${g?.totalSpend?.toFixed(2) ?? '0.00'}`
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    this.notificationService.showSuccess('Summary copied — paste it anywhere to share.');
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
    const draft = this.draftService.load<any>(this.draftKey);
    if (draft && (draft.description || draft.amount)) {
      this.expDescription.set(draft.description ?? '');
      this.expAmount.set(draft.amount ?? null);
      this.expSplitType.set(draft.splitType ?? SplitType.Equal);
      this.expParticipantIds.set(new Set(draft.participantIds ?? []));
      this.expPayerId.set(this.group()?.members[0]?.id ?? null);
      this.splitPayment.set(false);
      this.expPayers.set([{ memberId: null, amount: null }]);
      this.notificationService.showSuccess('Restored your unfinished expense from earlier.');
    } else {
      this.expDescription.set('');
      this.expAmount.set(null);
      this.expDate.set(new Date());
      this.expSplitType.set(SplitType.Equal);
      this.expPayerId.set(this.group()?.members[0]?.id ?? null);
      this.expParticipantIds.set(new Set((this.group()?.members ?? []).map(m => m.id)));
      this.expExactAmounts.set({});
      this.expPercentages.set({});
      this.expShares.set({});
      this.splitPayment.set(false);
      this.expPayers.set([{ memberId: null, amount: null }]);
    }
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
    const participantIds = Array.from(this.expParticipantIds());

    if (!description || amount === null || amount <= 0 || participantIds.length === 0) {
      this.notificationService.showError('Description, amount, and at least one participant are required.');
      return;
    }

    let payers: { memberId: number; amountPaid: number }[];

    if (this.splitPayment()) {
      const rows = this.expPayers();
      if (rows.some(r => r.memberId === null || r.amount === null || r.amount <= 0)) {
        this.notificationService.showError('Every payer needs a person selected and an amount greater than zero.');
        return;
      }
      const total = this.payersTotal();
      if (Math.abs(total - amount) > 0.01) {
        this.notificationService.showError(
          `Payers add up to ₹${total.toFixed(2)}, but the expense total is ₹${amount.toFixed(2)}.`
        );
        return;
      }
      payers = rows.map(r => ({ memberId: r.memberId!, amountPaid: r.amount! }));
    } else {
      const payerId = this.expPayerId();
      if (payerId === null) {
        this.notificationService.showError('Select who paid.');
        return;
      }
      payers = [{ memberId: payerId, amountPaid: amount }];
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
        payers,
        participants
      });
      this.showAddExpense.set(false);
      this.draftService.clear(this.draftKey);
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
        const dataUrl = await QRCode.toDataURL(paymentRequest.upiDeepLink, { width: 240, margin: 1 });
        this.qrCodeDataUrl.set(dataUrl);
        this.qrPaymentDetails.set({
          upiDeepLink: paymentRequest.upiDeepLink,
          payeeName: debt.toMemberName,
          amount: debt.amount
        });
      } catch {
        this.notificationService.showError(`${debt.toMemberName} hasn't added a UPI ID — mark this paid manually once settled.`);
      }

      await this.loadAll();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create settlement.');
    }
  }
}
