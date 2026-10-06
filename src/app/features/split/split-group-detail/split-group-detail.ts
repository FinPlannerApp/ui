import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as QRCode from 'qrcode';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import {
  ExpenseParticipantLine, GroupBalances, Settlement, SettlementMethod, SimplifiedDebt,
  SplitExpense, SplitGroup, SplitMember, SplitType
} from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';
import { DraftPersistenceService } from '../../../core/services/draft-persistence.service';
import { toDateOnlyString, fromDateOnlyString } from '../../../core/utils/date-utils';
import { OnlineStatusService } from '../../../core/services/online-status.service';
import { AccountState } from '../../../core/state/account-state.service';
import { Auth } from '../../../core/services/auth';
import { SplitSignalRService } from '../../../core/services/split-signalr.service';

import { EmptyState } from '../../../shared/empty-state/empty-state';
import { InfiniteScrollDirective } from '../../../shared/directives/infinite-scroll.directive';
import { SplitSettingsDialog } from '../split-settings-dialog/split-settings-dialog';
import { computeShares, equalPercentages } from '../split-share-math';
import { compareExpenses, groupExpensesByDay } from '../split-expense-utils';
import { exportSplitGroupToExcel } from '../split-excel-export';

@Component({
  selector: 'app-split-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules, EmptyState, SplitSettingsDialog, InfiniteScrollDirective],
  providers: [ConfirmationService],
  templateUrl: './split-group-detail.html'
})
export class SplitGroupDetail implements OnInit, OnDestroy {
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
  private authService = inject(Auth);
  private signalrService = inject(SplitSignalRService);

  newlyAddedExpenseId = signal<number | null>(null);

  canEditUpi(member: SplitMember): boolean {
    const g = this.group();
    if (!g) return false;
    const currentUserId = this.authService.currentUserDetails()?.id;
    const isMember = g.members.some(m => m.linkedUserId && m.linkedUserId === currentUserId);
    if (!isMember) return false;

    if (this.isGroupAdmin()) return true;

    if (member.linkedUserId) {
      return member.linkedUserId === currentUserId;
    }
    return true;
  }

  async copyUpi(upiId: string): Promise<void> {
    if (!upiId) return;
    await navigator.clipboard.writeText(upiId);
    this.notificationService.showSuccess(`UPI ID copied: ${upiId}`);
  }

  readonly SplitType = SplitType;

  groupId = Number(this.route.snapshot.paramMap.get('id'));
  group = signal<SplitGroup | null>(null);
  expenses = signal<SplitExpense[]>([]);
  balances = signal<GroupBalances | null>(null);

  // ── Paged expense list (infinite scroll) ────────────────────────────────────
  nextCursor = signal<string | null>(null);
  isLoadingMore = signal(false);
  expensesLoadFailed = signal(false);
  /** Total expenses matching the current search (null until a page has loaded). */
  matchingTotal = signal<number | null>(null);
  expandedExpenseIds = signal<Set<number>>(new Set());
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Loaded expenses, grouped under day headers (Today, Yesterday, 12 Sep 2026 …). */
  expenseGroups = computed(() => groupExpensesByDay(this.expenses()));
  /** Count shown on the tab: the live group total, or the search-match total while searching. */
  expenseCount = computed(() =>
    this.expenseSearchQuery().trim()
      ? (this.matchingTotal() ?? this.expenses().length)
      : (this.balances()?.expenseCount ?? this.matchingTotal() ?? this.expenses().length));
  isLoading = signal(true);
  activeTab = signal<'expenses' | 'balances'>('expenses');

  // ── Close, Import, Settlement History ───────────────────────────────────────
  showImportDialog = signal(false);
  importAccountId = signal<number | null>(null);
  settlementHistory = signal<Settlement[]>([]);
  isGroupClosed = computed(() => {
    const s = this.group()?.status;
    return s === 2 || s === 3;
  });
  canSettle = computed(() => {
    const status = this.group()?.status;
    return status === 0 || status === 1; // Active or Locked — settlements stay available through both
  });

  isGroupAdmin = computed(() => {
    const g = this.group();
    if (!g) return false;
    const currentUserId = this.authService.currentUserDetails()?.id;
    return g.createdByUserId === currentUserId;
  });

  currentUserMember = computed(() => {
    const g = this.group();
    if (!g) return null;
    const currentUserId = this.authService.currentUserDetails()?.id;
    return g.members.find(m => m.linkedUserId && m.linkedUserId === currentUserId) ?? null;
  });

  expenseSearchQuery = signal('');

  myNetBalance = computed(() => {
    const myMemberId = this.currentUserMember()?.id;
    if (!myMemberId) return 0;
    const b = this.balances()?.balances?.find(x => x.memberId === myMemberId);
    return b?.netBalance ?? 0;
  });

  private matchesSearch(e: SplitExpense): boolean {
    const query = this.expenseSearchQuery().toLowerCase().trim();
    if (!query) return true;
    return e.description.toLowerCase().includes(query)
      || e.payers.some(p => p.memberName.toLowerCase().includes(query));
  }

  visibleDebts = computed(() => {
    const plan = this.balances()?.simplifiedPlan ?? [];
    if (this.isGroupAdmin()) return plan;
    const myMemberId = this.currentUserMember()?.id;
    if (!myMemberId) return [];
    return plan.filter(d => d.fromMemberId === myMemberId || d.toMemberId === myMemberId);
  });

  visibleSettlements = computed(() => {
    const list = this.settlementHistory();
    if (this.isGroupAdmin()) return list;
    const myMemberId = this.currentUserMember()?.id;
    return list.filter(s => {
      // Pending settlements (status 0) are only visible to the payer (A) and Admin
      if (s.status === 0) {
        return myMemberId !== undefined && s.fromMemberId === myMemberId;
      }
      // Awaiting confirmation (status 1) and Completed (status 2) are visible to all members
      return true;
    });
  });

  canMemberSettleDebt(debt: SimplifiedDebt): boolean {
    if (!this.canSettle()) return false;
    if (this.isGroupAdmin()) return true;
    const myMemberId = this.currentUserMember()?.id;
    return myMemberId === debt.fromMemberId;
  }

  canMarkPaymentSent(s: any): boolean {
    if (s.status !== 0) return false;
    if (this.isGroupAdmin()) return true;
    const myMember = this.currentUserMember();
    return myMember !== null && (myMember.id === s.fromMemberId || myMember.name === s.fromMemberName);
  }

  canConfirmPaymentReceived(s: any): boolean {
    if (s.status !== 1) return false;
    if (this.isGroupAdmin()) return true;
    const myMember = this.currentUserMember();
    return myMember !== null && (myMember.id === s.toMemberId || myMember.name === s.toMemberName);
  }

  canRejectPayment(s: any): boolean {
    return this.canConfirmPaymentReceived(s);
  }

  // Partial Settlement
  settlingDebt = signal<SimplifiedDebt | null>(null);
  settleAmount = signal<number | null>(null);

  openSettleDialog(debt: SimplifiedDebt): void {
    this.settlingDebt.set(debt);
    this.settleAmount.set(debt.amount);
  }

  closeSettleDialog(): void {
    this.settlingDebt.set(null);
    this.settleAmount.set(null);
  }

  async confirmSettle(): Promise<void> {
    const debt = this.settlingDebt();
    const amount = this.settleAmount();
    if (!debt || amount === null || amount <= 0) {
      this.notificationService.showError('Enter an amount greater than zero.');
      return;
    }
    if (amount > debt.amount) {
      this.notificationService.showError(`Can't pay more than the ₹${debt.amount.toFixed(2)} owed.`);
      return;
    }

    try {
      await this.settleDebt(debt, amount);
      this.closeSettleDialog();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create settlement.');
    }
  }

  // Two-step confirmation handlers
  async onMarkPaymentSent(settlementId: number): Promise<void> {
    try {
      await this.splitService.markPaymentSent(settlementId);
      await this.loadAll(true);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to mark as sent.');
    }
  }

  async onConfirmPaymentReceived(settlementId: number): Promise<void> {
    try {
      await this.splitService.confirmPaymentReceived(settlementId);
      await this.loadAll(true);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to confirm.');
    }
  }

  async onRejectPayment(settlementId: number): Promise<void> {
    try {
      await this.splitService.rejectPayment(settlementId);
      await this.loadAll(true);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to reject.');
    }
  }

  qrCodeDataUrl = signal<string | null>(null);
  qrPaymentDetails = signal<{ settlementId?: number; upiDeepLink: string; payeeName: string; amount: number } | null>(null);

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
    const upiId = this.editMemberUpi().trim();
    try {
      await this.splitService.updateMemberUpi(memberId, upiId);
      this.group.update(g => g ? {
        ...g,
        members: g.members.map(m => m.id === memberId ? { ...m, upiId } : m)
      } : g);
      this.editingMemberId.set(null);
      this.notificationService.showSuccess('UPI ID updated successfully.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to update UPI.');
    }
  }

  // ── Settings Modal & Management ──────────────────────────────────────────────
  showSettingsModal = signal(false);
  settingsTab = signal<'members' | 'config' | 'share' | 'danger'>('members');

  renamingMemberId = signal<number | null>(null);
  renameMemberName = signal('');

  editingTripName = signal(false);
  tripNameInput = signal('');

  isGroupLocked = computed(() => this.group()?.status === 1);

  openSettingsModal(tab: 'members' | 'config' | 'share' | 'danger' = 'members'): void {
    this.tripNameInput.set(this.group()?.name ?? '');
    this.settingsTab.set(tab);
    this.showSettingsModal.set(true);
  }

  canRenameMember(member: SplitMember): boolean {
    const g = this.group();
    if (!g) return false;
    const currentUserId = this.authService.currentUserDetails()?.id;
    if (this.isGroupAdmin()) return true;
    if (member.linkedUserId) {
      return member.linkedUserId === currentUserId;
    }
    return true;
  }

  openRenameMember(member: SplitMember): void {
    this.renamingMemberId.set(member.id);
    this.renameMemberName.set(member.name);
  }

  cancelRenameMember(): void {
    this.renamingMemberId.set(null);
    this.renameMemberName.set('');
  }

  async saveMemberRename(memberId: number): Promise<void> {
    const name = this.renameMemberName().trim();
    if (!name) {
      this.notificationService.showError('Name cannot be empty.');
      return;
    }
    try {
      await this.splitService.renameMember(memberId, name);
      this.group.update(g => g ? {
        ...g,
        members: g.members.map(m => m.id === memberId ? { ...m, name } : m)
      } : g);
      this.renamingMemberId.set(null);
      this.notificationService.showSuccess('Member renamed successfully.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to rename member.');
    }
  }

  openEditTripName(): void {
    this.tripNameInput.set(this.group()?.name ?? '');
    this.editingTripName.set(true);
  }

  cancelEditTripName(): void {
    this.editingTripName.set(false);
  }

  async saveTripName(): Promise<void> {
    const name = this.tripNameInput().trim();
    if (!name) {
      this.notificationService.showError('Trip name cannot be empty.');
      return;
    }
    try {
      const updated = await this.splitService.updateGroup(this.groupId, name);
      this.group.update(g => g ? { ...g, name: updated.name } : g);
      this.editingTripName.set(false);
      this.notificationService.showSuccess('Trip name updated successfully.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to update trip name.');
    }
  }

  async toggleLockGroup(): Promise<void> {
    const isLocked = this.isGroupLocked();
    const actionName = isLocked ? 'Unlock' : 'Lock';
    const message = isLocked
      ? 'Unlocking this group allows member additions, editing expenses, and re-enables the public share link.'
      : 'Locking this group stops new expenses and disables the public share link. Members can still settle outstanding balances.';

    this.confirmationService.confirm({
      header: `${actionName} Group`,
      message,
      icon: isLocked ? 'pi pi-lock-open' : 'pi pi-lock',
      accept: async () => {
        try {
          if (isLocked) {
            await this.splitService.unlockGroup(this.groupId);
          } else {
            await this.splitService.lockGroup(this.groupId);
          }
          await this.loadAll(true);
        } catch (err: any) {
          this.notificationService.showError(err?.message || `Failed to ${actionName.toLowerCase()} group.`);
        }
      }
    });
  }

  async closeGroupAction(): Promise<void> {
    const debts = this.balances()?.simplifiedPlan ?? [];
    const totalUnsettled = debts.reduce((sum, d) => sum + d.amount, 0);

    let message = 'Closing this trip group will archive it and mark it complete.';
    if (totalUnsettled > 0) {
      message += ` ⚠️ Note: There are still ${debts.length} unsettled debt(s) totaling ₹${totalUnsettled.toFixed(2)}.`;
    }

    this.confirmationService.confirm({
      header: 'Close / Archive Group',
      message,
      icon: 'pi pi-archive',
      accept: async () => {
        try {
          await this.splitService.closeGroup(this.groupId);
          await this.loadAll(true);
          this.notificationService.showSuccess('Trip group has been closed.');
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to close group.');
        }
      }
    });
  }

  categoriesList = [
    { label: 'Food & Dining 🍔', value: 'Food' },
    { label: 'Travel & Transport ✈️', value: 'Transport' },
    { label: 'Stay & Lodging 🏨', value: 'Stay' },
    { label: 'Entertainment 🍿', value: 'Entertainment' },
    { label: 'Shopping 🛍️', value: 'Shopping' },
    { label: 'Utilities & Bills 💡', value: 'Utilities' },
    { label: 'General & Other 💸', value: 'General' }
  ];

  expCategory = signal<string>('General');

  getCategoryIcon(category: string | null | undefined): string {
    switch ((category || '').toLowerCase()) {
      case 'food': return 'pi pi-shopping-bag text-amber-400';
      case 'transport': return 'pi pi-car text-blue-400';
      case 'stay': return 'pi pi-home text-purple-400';
      case 'entertainment': return 'pi pi-ticket text-pink-400';
      case 'shopping': return 'pi pi-gift text-emerald-400';
      case 'utilities': return 'pi pi-bolt text-yellow-400';
      default: return 'pi pi-receipt text-indigo-400';
    }
  }

  getCategoryBadgeColor(category: string | null | undefined): string {
    switch ((category || '').toLowerCase()) {
      case 'food': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'transport': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'stay': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'entertainment': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'shopping': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'utilities': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  }

  canNudgeDebt(debt: SimplifiedDebt): boolean {
    if (this.isGroupAdmin()) return true;
    const myMemberId = this.currentUserMember()?.id;
    return myMemberId !== undefined && debt.toMemberId === myMemberId;
  }

  nudgeDebtWhatsApp(debt: SimplifiedDebt): void {
    const g = this.group();
    if (!g) return;
    const toMember = g.members.find(m => m.id === debt.toMemberId);
    const upiText = toMember?.upiId ? `\n💳 Payee UPI ID: *${toMember.upiId}*` : '';
    const tripUrl = `${window.location.origin}/app/split/${g.id}`;
    const message = `Hey ${debt.fromMemberName}! 👋\n\nGentle reminder for our trip *'${g.name}'*:\nYou owe *₹${debt.amount.toFixed(2)}* to *${debt.toMemberName}*.${upiText}\n\n📲 Tap link to scan QR Code or mark as paid:\n${tripUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  }

  /** Spend by category across ALL expenses (computed by the API, so it isn't limited to the loaded pages). */
  categoryBreakdown = computed(() => {
    const items = this.balances()?.categoryBreakdown ?? [];
    const overall = items.reduce((sum, c) => sum + c.amount, 0);
    if (overall === 0) return [];
    return items
      .map(c => ({ category: c.category, amount: c.amount, percentage: Math.round((c.amount / overall) * 100) }))
      .sort((a, b) => b.amount - a.amount);
  });

  shareViaWhatsApp(): void {
    const g = this.group();
    if (!g) return;
    const link = this.shareLink() || this.generatedInviteLink() || window.location.href;
    const text = encodeURIComponent(`Hey! Join/view our trip group '${g.name}' on FinPlanner:\n${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
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

  /** True once the user has typed their own exact amounts / percentages (so ticking people no longer auto-redistributes). */
  splitCustomised = signal(false);

  /** Ticked members in group order — the same order the API receives them, so rounding matches. */
  selectedMemberIds = computed(() =>
    (this.group()?.members ?? []).filter(m => this.expParticipantIds().has(m.id)).map(m => m.id)
  );

  /** Live "who owes how much" for the expense being entered. Updates on every tick, amount or split change. */
  previewShares = computed<Record<number, number>>(() => {
    const type = this.expSplitType();
    const inputs = this.selectedMemberIds().map(id => ({
      memberId: id,
      value: type === SplitType.Exact ? this.expExactAmounts()[id]
        : type === SplitType.Percentage ? this.expPercentages()[id]
        : type === SplitType.Shares ? (this.expShares()[id] ?? 1)
        : null
    }));
    return computeShares(type, this.expAmount(), inputs);
  });

  /** How much each member paid towards the expense being entered. */
  previewPaid = computed<Record<number, number>>(() => {
    const out: Record<number, number> = {};
    if (this.splitPayment()) {
      for (const row of this.expPayers()) {
        if (row.memberId !== null) out[row.memberId] = (out[row.memberId] ?? 0) + (row.amount ?? 0);
      }
    } else {
      const payer = this.expPayerId();
      if (payer !== null) out[payer] = this.expAmount() ?? 0;
    }
    return out;
  });

  /** Paid minus share, per member: positive = gets money back, negative = owes. */
  memberImpact(memberId: number): number {
    const paid = this.previewPaid()[memberId] ?? 0;
    const share = this.previewShares()[memberId] ?? 0;
    return Math.round((paid - share) * 100) / 100;
  }

  /** Running totals shown under the member list for the non-equal split types. */
  splitTotals = computed(() => {
    const ids = this.selectedMemberIds();
    const exact = ids.reduce((sum, id) => sum + (this.expExactAmounts()[id] ?? 0), 0);
    const percent = ids.reduce((sum, id) => sum + (this.expPercentages()[id] ?? 0), 0);
    const shares = ids.reduce((sum, id) => sum + (this.expShares()[id] ?? 1), 0);
    const amount = this.expAmount() ?? 0;
    return {
      exact: Math.round(exact * 100) / 100,
      exactLeft: Math.round((amount - exact) * 100) / 100,
      percent: Math.round(percent * 100) / 100,
      shares
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadAll();
    this.accountState.loadAccounts();

    this.signalrService.joinGroup(this.groupId, (payload: any) => {
      if (payload && payload.groupId === this.groupId) {
        if (payload.activityMessage) {
          this.notificationService.showSuccess(payload.activityMessage);
        }

        if (payload.balances) {
          this.balances.set(payload.balances);
        }

        switch (payload.eventType) {
          case 'ExpenseAdded':
            if (payload.expense) {
              this.upsertExpense(payload.expense);
              this.highlightExpense(payload.expense.id);
            }
            break;

          case 'ExpenseUpdated':
            if (payload.expense) {
              this.upsertExpense(payload.expense);
            }
            break;

          case 'ExpenseDeleted':
            if (payload.expenseId) {
              this.removeExpense(payload.expenseId);
            }
            break;

          case 'MemberAdded':
            if (payload.member) {
              this.group.update(g => g ? { ...g, members: [...g.members, payload.member] } : g);
            }
            break;

          case 'MemberUpiUpdated':
            if (payload.memberId) {
              this.group.update(g => g ? {
                ...g,
                members: g.members.map(m => m.id === payload.memberId ? { ...m, upiId: payload.upiId } : m)
              } : g);
            }
            break;

          case 'SettlementRecorded':
            this.loadAll(true);
            break;

          case 'GroupStatusChanged':
            if (payload.status !== undefined) {
              this.group.update(g => g ? { ...g, status: payload.status } : g);
            }
            this.loadAll(true);
            break;

          case 'GroupUpdated':
          default:
            if (payload.group) this.group.set(payload.group);
            this.loadAll(true);
            break;
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.signalrService.leaveGroup(this.groupId);
  }

  async loadAll(silent: boolean = false): Promise<void> {
    if (!silent) this.isLoading.set(true);
    try {
      const data = await this.splitService.getGroupFullDetails(this.groupId);
      this.group.set(data.group);
      this.balances.set(data.balances);
      // A silent refresh (triggered by realtime events) must not throw away pages the
      // user has already scrolled through, so the list is only (re)seeded on a full load.
      if (!silent || this.expenses().length === 0) {
        if (!this.expenseSearchQuery().trim()) {
          this.expenses.set([...data.expenses].sort(compareExpenses));
          this.nextCursor.set(data.nextCursor);
          this.matchingTotal.set(data.totalExpenseCount);
          this.expensesLoadFailed.set(false);
        }
      }
      await this.loadSettlementHistory();
    } catch {
      if (!silent) this.notificationService.showError('Could not load this group.');
    } finally {
      if (!silent) this.isLoading.set(false);
    }
  }

  // ── Expense list: infinite scroll, search, sorted insertion ─────────────────

  async loadMoreExpenses(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor || this.isLoadingMore()) return;

    const search = this.expenseSearchQuery();
    this.isLoadingMore.set(true);
    try {
      const page = await this.splitService.getExpensesPage(this.groupId, { cursor, search });
      if (search !== this.expenseSearchQuery()) return; // the search changed while this was loading
      this.expenses.update(list => this.mergeExpenses(list, page.items));
      this.nextCursor.set(page.nextCursor);
      this.matchingTotal.set(page.totalCount);
      this.expensesLoadFailed.set(false);
    } catch {
      this.expensesLoadFailed.set(true);
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  retryLoadMore(): void {
    this.expensesLoadFailed.set(false);
    void this.loadMoreExpenses();
  }

  onSearchChange(value: string): void {
    this.expenseSearchQuery.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.reloadExpenses(), 300);
  }

  /** Re-fetches the first page for the current search (server-side, so it covers every expense, not just loaded ones). */
  async reloadExpenses(): Promise<void> {
    const search = this.expenseSearchQuery();
    this.isLoadingMore.set(true);
    try {
      const page = await this.splitService.getExpensesPage(this.groupId, { search });
      if (search !== this.expenseSearchQuery()) return;
      this.expenses.set([...page.items].sort(compareExpenses));
      this.nextCursor.set(page.nextCursor);
      this.matchingTotal.set(page.totalCount);
      this.expensesLoadFailed.set(false);
    } catch {
      this.notificationService.showError('Could not load expenses.');
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  private mergeExpenses(current: SplitExpense[], incoming: SplitExpense[]): SplitExpense[] {
    const byId = new Map<number, SplitExpense>();
    for (const e of [...current, ...incoming]) byId.set(e.id, e);
    return [...byId.values()].sort(compareExpenses);
  }

  /**
   * Inserts or replaces an expense at its correct place in the day-wise
   * order — a back-dated expense lands under its own day, not at the top.
   * If it belongs after everything loaded so far and more pages exist, it is
   * left to arrive with the scroll instead.
   */
  private upsertExpense(expense: SplitExpense): void {
    if (!this.matchesSearch(expense)) {
      this.removeExpense(expense.id);
      return;
    }
    this.expenses.update(list => {
      const others = list.filter(e => e.id !== expense.id);
      const last = others[others.length - 1];
      if (this.nextCursor() && last && compareExpenses(expense, last) > 0) {
        return others;
      }
      return [...others, expense].sort(compareExpenses);
    });
  }

  private removeExpense(expenseId: number): void {
    this.expenses.update(list => list.filter(e => e.id !== expenseId));
  }

  private highlightExpense(expenseId: number): void {
    this.newlyAddedExpenseId.set(expenseId);
    setTimeout(() => this.newlyAddedExpenseId.set(null), 3000);
  }

  private scrollToExpense(expenseId: number): void {
    setTimeout(() => {
      document.getElementById(`expense-${expenseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  toggleExpenseDetails(expenseId: number): void {
    this.expandedExpenseIds.update(set => {
      const next = new Set(set);
      if (next.has(expenseId)) next.delete(expenseId); else next.add(expenseId);
      return next;
    });
  }

  /** What the signed-in member paid vs their share for one expense (null when they aren't a member). */
  myPosition(expense: SplitExpense): { paid: number; share: number; net: number } | null {
    const me = this.currentUserMember()?.id;
    if (!me) return null;
    const paid = expense.payers.filter(p => p.memberId === me).reduce((sum, p) => sum + p.amountPaid, 0);
    const share = expense.participants.find(p => p.memberId === me)?.shareAmount ?? 0;
    if (paid === 0 && share === 0) return null;
    return { paid, share, net: Math.round((paid - share) * 100) / 100 };
  }

  /** One row per person involved in an expense: what they paid, their share, and the difference. */
  expenseLines(expense: SplitExpense): { memberId: number; name: string; paid: number; share: number; net: number }[] {
    const lines = new Map<number, { memberId: number; name: string; paid: number; share: number; net: number }>();
    const line = (memberId: number, name: string) => {
      let l = lines.get(memberId);
      if (!l) { l = { memberId, name, paid: 0, share: 0, net: 0 }; lines.set(memberId, l); }
      return l;
    };
    for (const p of expense.payers) line(p.memberId, p.memberName).paid += p.amountPaid;
    for (const p of expense.participants) line(p.memberId, p.memberName).share += p.shareAmount;
    for (const l of lines.values()) l.net = Math.round((l.paid - l.share) * 100) / 100;
    return [...lines.values()].sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));
  }

  /** Confirmed settlement money in minus out, so Paid − Share + Settled = Net reads naturally. */
  settledNet(b: { settledPaid?: number; settledReceived?: number }): number {
    return Math.round(((b.settledPaid ?? 0) - (b.settledReceived ?? 0)) * 100) / 100;
  }

  splitTypeLabel(type: SplitType): string {
    switch (type) {
      case SplitType.Equal: return 'Equal split';
      case SplitType.Exact: return 'Exact amounts';
      case SplitType.Percentage: return 'By percentage';
      case SplitType.Shares: return 'By shares';
      default: return 'Custom split';
    }
  }

  // ── Excel export ─────────────────────────────────────────────────────────────
  isExporting = signal(false);

  async exportToExcel(): Promise<void> {
    if (this.isExporting()) return;
    this.isExporting.set(true);
    try {
      const data = await this.splitService.getGroupExport(this.groupId);
      await exportSplitGroupToExcel(data);
      this.notificationService.showSuccess('Excel report downloaded.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Could not create the Excel report.');
    } finally {
      this.isExporting.set(false);
    }
  }

  async refreshBalances(): Promise<void> {
    try {
      this.balances.set(await this.splitService.getBalances(this.groupId));
    } catch {
      // The realtime update normally covers this; a failed refresh isn't worth an error toast.
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
    this.generatedInviteLink.set(null);
  }

  // ── Close, Import & Summary ─────────────────────────────────────────────────

  async lockGroup(): Promise<void> {
    this.confirmationService.confirm({
      header: 'Lock Group',
      message: 'This stops new expenses, but you can still settle up remaining balances afterward.',
      icon: 'pi pi-lock',
      accept: async () => {
        try {
          await this.splitService.lockGroup(this.groupId);
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to lock group.');
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
        `${s.fromMemberName} → ${s.toMemberName}: ₹${s.amount.toFixed(2)} (${s.status === 2 ? 'Completed' : (s.status === 1 ? 'Awaiting confirmation' : 'Pending')})`
      ),
      '',
      `Total spend: ₹${g?.totalSpend?.toFixed(2) ?? '0.00'}`
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    this.notificationService.showSuccess('Summary copied — paste it anywhere to share.');
  }

  // ── Add/Edit/Delete expense ──────────────────────────────────────────────────
  editingExpenseId = signal<number | null>(null);

  openAddExpense(): void {
    if (this.isGroupClosed()) {
      this.notificationService.showError('This group is locked — new expenses cannot be added.');
      return;
    }
    this.editingExpenseId.set(null);
    const draft = this.draftService.load<any>(this.draftKey);
    if (draft && (draft.description || draft.amount)) {
      this.expDescription.set(draft.description ?? '');
      this.expAmount.set(draft.amount ?? null);
      this.expCategory.set(draft.category ?? 'General');
      this.expSplitType.set(draft.splitType ?? SplitType.Equal);
      this.expParticipantIds.set(new Set(draft.participantIds ?? []));
      this.expPayerId.set(this.group()?.members[0]?.id ?? null);
      this.splitPayment.set(false);
      this.expPayers.set([{ memberId: null, amount: null }]);
      this.expExactAmounts.set({});
      this.expPercentages.set({});
      this.expShares.set({});
      this.splitCustomised.set(false);
      this.redistributeEqually();
      this.notificationService.showSuccess('Restored your unfinished expense from earlier.');
    } else {
      this.expDescription.set('');
      this.expAmount.set(null);
      this.expCategory.set('General');
      this.expDate.set(new Date());
      this.expSplitType.set(SplitType.Equal);
      this.expPayerId.set(this.group()?.members[0]?.id ?? null);
      this.expParticipantIds.set(new Set((this.group()?.members ?? []).map(m => m.id)));
      this.expExactAmounts.set({});
      this.expPercentages.set({});
      this.expShares.set({});
      this.splitCustomised.set(false);
      this.splitPayment.set(false);
      this.expPayers.set([{ memberId: null, amount: null }]);
    }
    this.showAddExpense.set(true);
  }

  openEditExpense(expense: SplitExpense): void {
    this.editingExpenseId.set(expense.id);
    this.expDescription.set(expense.description);
    this.expAmount.set(expense.amount);
    this.expCategory.set(expense.category ?? 'General');
    this.expDate.set(fromDateOnlyString(expense.date) ?? new Date(expense.date));
    this.expSplitType.set(expense.splitType);
    this.expParticipantIds.set(new Set(expense.participants.map(p => p.memberId)));

    // Restore what was originally typed for Exact / Percentage / Shares splits.
    const exact: Record<number, number> = {};
    const percent: Record<number, number> = {};
    const shares: Record<number, number> = {};
    for (const p of expense.participants) {
      if (expense.splitType === SplitType.Exact) {
        exact[p.memberId] = p.splitValue ?? p.shareAmount;
      } else if (expense.splitType === SplitType.Percentage) {
        percent[p.memberId] = p.splitValue ?? Math.round((p.shareAmount / expense.amount) * 10000) / 100;
      } else if (expense.splitType === SplitType.Shares) {
        shares[p.memberId] = p.splitValue ?? 1;
      }
    }
    this.expExactAmounts.set(exact);
    this.expPercentages.set(percent);
    this.expShares.set(shares);
    this.splitCustomised.set(true);

    if (expense.payers.length > 1) {
      this.splitPayment.set(true);
      this.expPayers.set(expense.payers.map(p => ({ memberId: p.memberId, amount: p.amountPaid })));
    } else {
      this.splitPayment.set(false);
      this.expPayerId.set(expense.payers[0]?.memberId ?? null);
    }
    this.showAddExpense.set(true);
  }

  async deleteExpense(expense: SplitExpense): Promise<void> {
    this.confirmationService.confirm({
      message: `Delete "${expense.description}"? This can't be undone.`,
      accept: async () => {
        try {
          const result = await this.splitService.deleteExpense(expense.id);
          this.removeExpense(expense.id);
          void this.refreshBalances();
          if (result.wasAlreadyImported) {
            this.notificationService.showError(
              'Deleted here, but this expense was already imported to a real account — that transaction still exists and needs removing separately.'
            );
          }
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to delete.');
        }
      }
    });
  }

  toggleParticipant(memberId: number): void {
    const current = new Set(this.expParticipantIds());
    if (current.has(memberId)) current.delete(memberId); else current.add(memberId);
    this.expParticipantIds.set(current);
    // Ticking / un-ticking someone re-divides the amount among whoever is left.
    // (Equal and Shares recompute automatically; Exact and Percentage need their
    // values re-spread unless the user has already typed custom ones.)
    if (!this.splitCustomised()) this.redistributeEqually();
  }

  selectAllParticipants(): void {
    this.expParticipantIds.set(new Set((this.group()?.members ?? []).map(m => m.id)));
    if (!this.splitCustomised()) this.redistributeEqually();
  }

  clearParticipants(): void {
    this.expParticipantIds.set(new Set());
  }

  onSplitTypeChange(type: SplitType): void {
    this.expSplitType.set(type);
    this.splitCustomised.set(false);
    this.redistributeEqually();
  }

  onAmountChange(amount: number | null): void {
    this.expAmount.set(amount);
    if (!this.splitCustomised()) this.redistributeEqually();
  }

  /** "Split evenly" for the Exact and Percentage modes (Equal / Shares are already even). */
  redistributeEqually(): void {
    const ids = this.selectedMemberIds();
    const type = this.expSplitType();
    if (type === SplitType.Exact) {
      this.expExactAmounts.set(computeShares(
        SplitType.Equal, this.expAmount(), ids.map(id => ({ memberId: id }))));
    } else if (type === SplitType.Percentage) {
      this.expPercentages.set(equalPercentages(ids));
    } else if (type === SplitType.Shares) {
      this.expShares.update(m => {
        const next = { ...m };
        for (const id of ids) if (next[id] == null) next[id] = 1;
        return next;
      });
    }
  }

  resplitEvenly(): void {
    this.splitCustomised.set(false);
    this.redistributeEqually();
  }

  updateExactAmount(memberId: number, value: number): void {
    this.splitCustomised.set(true);
    this.expExactAmounts.update(m => ({ ...m, [memberId]: value }));
  }

  updatePercentage(memberId: number, value: number): void {
    this.splitCustomised.set(true);
    this.expPercentages.update(m => ({ ...m, [memberId]: value }));
  }

  updateShares(memberId: number, value: number): void {
    this.expShares.update(m => ({ ...m, [memberId]: value }));
  }

  async saveExpense(): Promise<void> {
    const amount = this.expAmount();
    const description = this.expDescription().trim();
    const participantIds = this.selectedMemberIds();

    if (!description || amount === null || amount <= 0 || participantIds.length === 0) {
      this.notificationService.showError('Description, amount, and at least one participant are required.');
      return;
    }

    if (this.expSplitType() === SplitType.Exact && Math.abs(this.splitTotals().exactLeft) > 0.01) {
      this.notificationService.showError(
        `The amounts add up to ₹${this.splitTotals().exact.toFixed(2)}, but the expense is ₹${amount.toFixed(2)}.`);
      return;
    }
    if (this.expSplitType() === SplitType.Percentage && Math.abs(this.splitTotals().percent - 100) > 0.01) {
      this.notificationService.showError(`Percentages add up to ${this.splitTotals().percent}% — they need to total 100%.`);
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
      const payload = {
        groupId: this.groupId,
        description,
        amount,
        date: toDateOnlyString(this.expDate())!,
        category: this.expCategory(),
        splitType: type,
        payers,
        participants
      };

      let saved: SplitExpense | null = null;
      if (this.editingExpenseId()) {
        saved = await this.splitService.updateExpense(this.editingExpenseId()!, payload);
      } else {
        saved = await this.splitService.addExpense(payload);
        if (saved?.id) this.highlightExpense(saved.id);
      }
      // Apply the result right away (idempotent with the realtime event that follows), so the
      // new or edited expense appears under the right day even if the live connection is down.
      if (saved?.id) {
        this.upsertExpense(saved);
        this.scrollToExpense(saved.id);
      }
      void this.refreshBalances();
      this.editingExpenseId.set(null);
      this.showAddExpense.set(false);
      this.draftService.clear(this.draftKey);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to save expense.');
    }
  }

  // ── Settle ───────────────────────────────────────────────────────────────────

  async settleDebt(debt: SimplifiedDebt, amount: number): Promise<void> {
    try {
      const settlement = await this.splitService.createSettlement({
        groupId: this.groupId,
        fromMemberId: debt.fromMemberId,
        toMemberId: debt.toMemberId,
        amount,
        method: SettlementMethod.Upi
      });

      try {
        const paymentRequest = await this.splitService.getPaymentRequest(settlement.id);
        const dataUrl = await QRCode.toDataURL(paymentRequest.upiDeepLink, { width: 240, margin: 1 });
        this.qrCodeDataUrl.set(dataUrl);
        this.qrPaymentDetails.set({
          settlementId: settlement.id,
          upiDeepLink: paymentRequest.upiDeepLink,
          payeeName: debt.toMemberName,
          amount
        });
      } catch {
        this.notificationService.showError(`${debt.toMemberName} hasn't added a UPI ID — mark this paid manually once settled.`);
      }

      await this.loadAll(true);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create settlement.');
    }
  }
}
