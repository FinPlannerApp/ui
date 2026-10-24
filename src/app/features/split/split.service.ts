import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import {
  CreateExpenseRequest, CreateGroupRequest, CreateInviteRequest, CreateSettlementRequest,
  ExpensePage, GroupBalances, GroupExport, GroupFullDetails, ImportToLedgerRequest, ImportToLedgerResult,
  InviteCreated, InvitePreview, PaymentRequest, PublicGroupView, Settlement, SplitExpense, SplitGroup, SplitMember,
  UpdateSettlementRequest, UpdateGroupSettingsRequest, ExpenseFilters, ActivityPage, GlobalExpenseHit
} from '../../core/models/split.model';

@Injectable({ providedIn: 'root' })
export class SplitService {
  private api = inject(GenericApi);

  async createGroup(req: CreateGroupRequest): Promise<SplitGroup> {
    const result = await firstValueFrom(this.api.post<SplitGroup>('Split/groups', req));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to create group.');
    }
    return result.value;
  }

  async getMyGroups(): Promise<SplitGroup[]> {
    const result = await firstValueFrom(this.api.get<SplitGroup[]>('Split/groups'));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load groups.');
    }
    return result.value ?? [];
  }

  async getGroup(groupId: number): Promise<SplitGroup> {
    const result = await firstValueFrom(this.api.get<SplitGroup>(`Split/groups/${groupId}`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load group details.');
    }
    return result.value;
  }

  /** Group, balances and the FIRST page of expenses. Use getExpensesPage for the rest. */
  async getGroupFullDetails(groupId: number): Promise<GroupFullDetails> {
    const result = await firstValueFrom(this.api.get<GroupFullDetails>(`Split/groups/${groupId}/full`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load group details.');
    }
    const v = result.value;
    return {
      group: v.group,
      expenses: v.expenses ?? [],
      nextCursor: v.nextCursor ?? null,
      totalExpenseCount: v.totalExpenseCount ?? (v.expenses?.length ?? 0),
      balances: v.balances
    };
  }

  async addMember(groupId: number, name: string, upiId: string | null): Promise<SplitMember> {
    const result = await firstValueFrom(this.api.post<SplitMember>('Split/members', { groupId, name, upiId }));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to add member.');
    }
    return result.value;
  }

  async updateMemberUpi(memberId: number, upiId: string): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>('Split/members/upi', { memberId, upiId }));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to update payment details.');
    }
  }

  async addExpense(req: CreateExpenseRequest): Promise<SplitExpense> {
    const result = await firstValueFrom(this.api.post<SplitExpense>('Split/expenses', req));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to add expense.');
    }
    return result.value;
  }

  /**
   * Newest day first by default. Pass the previous page's nextCursor to continue.
   * Filters and sort are applied on the server, so they cover every expense — not just loaded ones.
   */
  async getExpensesPage(
    groupId: number,
    opts: ExpenseFilters & { cursor?: string | null; limit?: number } = {}
  ): Promise<ExpensePage> {
    const params = new URLSearchParams();
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.search?.trim()) params.set('search', opts.search.trim());
    if (opts.category) params.set('category', opts.category);
    if (opts.payerId) params.set('payerId', String(opts.payerId));
    if (opts.participantId) params.set('participantId', String(opts.participantId));
    if (opts.from) params.set('from', opts.from);
    if (opts.to) params.set('to', opts.to);
    if (opts.minAmount != null) params.set('minAmount', String(opts.minAmount));
    if (opts.maxAmount != null) params.set('maxAmount', String(opts.maxAmount));
    if (opts.sort && opts.sort !== 'date_desc') params.set('sort', opts.sort);
    const qs = params.toString();
    const result = await firstValueFrom(
      this.api.get<ExpensePage>(`Split/groups/${groupId}/expenses${qs ? '?' + qs : ''}`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load expenses.');
    }
    return {
      items: result.value?.items ?? [],
      nextCursor: result.value?.nextCursor ?? null,
      totalCount: result.value?.totalCount ?? 0
    };
  }

  async getPublicExpensesPage(shareToken: string, cursor: string | null, limit = 20): Promise<ExpensePage> {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set('cursor', cursor);
    const result = await firstValueFrom(
      this.api.get<ExpensePage>(`Split/public/${shareToken}/expenses?${qs.toString()}`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load more expenses.');
    }
    return {
      items: result.value?.items ?? [],
      nextCursor: result.value?.nextCursor ?? null,
      totalCount: result.value?.totalCount ?? 0
    };
  }

  /** Every expense, settlement and balance — the data behind the Excel report. */
  async getGroupExport(groupId: number): Promise<GroupExport> {
    const result = await firstValueFrom(this.api.get<GroupExport>(`Split/groups/${groupId}/export`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load data for export.');
    }
    return result.value;
  }

  async getBalances(groupId: number): Promise<GroupBalances> {
    const result = await firstValueFrom(this.api.get<GroupBalances>(`Split/groups/${groupId}/balances`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load balances.');
    }
    return result.value;
  }

  async createSettlement(req: CreateSettlementRequest): Promise<any> {
    const result = await firstValueFrom(this.api.post<any>('Split/settlements', req));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to record settlement.');
    }
    return result.value;
  }

  async updateExpense(expenseId: number, req: CreateExpenseRequest): Promise<SplitExpense> {
    const result = await firstValueFrom(this.api.put<SplitExpense>(`Split/expenses/${expenseId}`, req));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to update expense.');
    }
    return result.value;
  }

  async deleteExpense(expenseId: number): Promise<{ wasAlreadyImported: boolean }> {
    const result = await firstValueFrom(this.api.delete<{ wasAlreadyImported: boolean }>(`Split/expenses/${expenseId}`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to delete expense.');
    }
    return result.value;
  }

  async markPaymentSent(settlementId: number): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>(`Split/settlements/${settlementId}/mark-sent`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to mark as sent.');
  }

  async confirmPaymentReceived(settlementId: number): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>(`Split/settlements/${settlementId}/confirm-received`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to confirm receipt.');
  }

  async rejectPayment(settlementId: number): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>(`Split/settlements/${settlementId}/reject`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to reject.');
  }

  async getPaymentRequest(settlementId: number): Promise<PaymentRequest> {
    const result = await firstValueFrom(this.api.get<PaymentRequest>(`Split/settlements/${settlementId}/payment-request`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load payment details.');
    }
    return result.value;
  }

  async getPublicView(shareToken: string): Promise<PublicGroupView> {
    const result = await firstValueFrom(this.api.get<PublicGroupView>(`Split/public/${shareToken}`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load shared group view.');
    }
    return result.value;
  }

  async createInvite(req: CreateInviteRequest): Promise<InviteCreated> {
    const result = await firstValueFrom(this.api.post<InviteCreated>('Split/invites', req));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to create invite.');
    return result.value;
  }

  async previewInvite(token: string): Promise<InvitePreview> {
    const result = await firstValueFrom(this.api.get<InvitePreview>(`Split/invites/${token}/preview`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Could not load this invite.');
    return result.value;
  }

  async joinViaInvite(token: string, displayName: string, claimMemberId?: number | null): Promise<{ groupId: number }> {
    const result = await firstValueFrom(
      this.api.post<any>('Split/invites/join', { token, displayName, claimMemberId: claimMemberId ?? null }));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to join.');
    return result.value;
  }

  async lockGroup(groupId: number): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>(`Split/groups/${groupId}/lock`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to lock group.');
  }

  async unlockGroup(groupId: number): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>(`Split/groups/${groupId}/unlock`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to unlock group.');
  }

  async closeGroup(groupId: number): Promise<void> {
    const result = await firstValueFrom(this.api.post<any>(`Split/groups/${groupId}/close`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to close group.');
  }

  async updateGroup(groupId: number, name: string): Promise<SplitGroup> {
    const result = await firstValueFrom(this.api.put<SplitGroup>(`Split/groups/${groupId}`, { groupId, name }));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to update group details.');
    return result.value;
  }

  async updateGroupSettings(groupId: number, settings: UpdateGroupSettingsRequest): Promise<SplitGroup> {
    const result = await firstValueFrom(this.api.put<SplitGroup>(`Split/groups/${groupId}/settings`, settings));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to update settings.');
    return result.value;
  }

  /** Folds a name-only member into another one (creator only). */
  async mergeMembers(sourceMemberId: number, targetMemberId: number): Promise<void> {
    const result = await firstValueFrom(
      this.api.post<boolean>(`Split/members/${sourceMemberId}/merge-into/${targetMemberId}`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to merge members.');
  }

  async renameMember(memberId: number, name: string): Promise<SplitMember> {
    const result = await firstValueFrom(this.api.post<SplitMember>('Split/members/rename', { memberId, name }));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to rename member.');
    return result.value;
  }

  async importToLedger(req: ImportToLedgerRequest): Promise<ImportToLedgerResult> {
    const result = await firstValueFrom(this.api.post<ImportToLedgerResult>('Split/import-to-ledger', req));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to import.');
    return result.value;
  }

  async getSettlementHistory(groupId: number): Promise<Settlement[]> {
    const result = await firstValueFrom(this.api.get<Settlement[]>(`Split/groups/${groupId}/settlements`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Could not load settlement history.');
    return result.value ?? [];
  }

  /** Leave the group (yourself) or remove someone (admin). They must be settled up first. */
  async removeMember(memberId: number): Promise<void> {
    const result = await firstValueFrom(this.api.delete<boolean>(`Split/members/${memberId}`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to remove member.');
  }

  async deleteGroup(groupId: number): Promise<void> {
    const result = await firstValueFrom(this.api.delete<boolean>(`Split/groups/${groupId}`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to delete group.');
  }

  async updateSettlement(settlementId: number, req: UpdateSettlementRequest): Promise<Settlement> {
    const result = await firstValueFrom(this.api.put<Settlement>(`Split/settlements/${settlementId}`, req));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to update payment.');
    return result.value;
  }

  async deleteSettlement(settlementId: number): Promise<void> {
    const result = await firstValueFrom(this.api.delete<boolean>(`Split/settlements/${settlementId}`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to delete payment.');
  }

  // ── History, undo, receipts, cross-group search ─────────────────────────────

  /** The group's audit trail, newest first. */
  async getActivity(groupId: number, cursor?: string | null): Promise<ActivityPage> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    const result = await firstValueFrom(this.api.get<ActivityPage>(`Split/groups/${groupId}/activity${qs}`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to load history.');
    return { items: result.value?.items ?? [], nextCursor: result.value?.nextCursor ?? null };
  }

  /** Recently deleted expenses (for undo). */
  async getDeletedExpenses(groupId: number): Promise<SplitExpense[]> {
    const result = await firstValueFrom(this.api.get<SplitExpense[]>(`Split/groups/${groupId}/expenses/deleted`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to load deleted expenses.');
    return result.value ?? [];
  }

  async restoreExpense(expenseId: number): Promise<SplitExpense> {
    const result = await firstValueFrom(this.api.post<SplitExpense>(`Split/expenses/${expenseId}/restore`, {}));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to restore expense.');
    return result.value;
  }

  /** Returns the receipt's relative URL. */
  async uploadReceipt(expenseId: number, file: File): Promise<string | null> {
    const form = new FormData();
    form.append('file', file);
    const result = await firstValueFrom(
      this.api.postFormData<{ currentPath: string | null }>(`Split/expenses/${expenseId}/receipt`, form));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to upload the receipt.');
    return result.value?.currentPath ?? null;
  }

  async removeReceipt(expenseId: number): Promise<void> {
    const result = await firstValueFrom(this.api.delete<unknown>(`Split/expenses/${expenseId}/receipt`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to remove the receipt.');
  }

  /** Expenses matching the text across every group the signed-in user is in. */
  async searchAcrossGroups(query: string): Promise<GlobalExpenseHit[]> {
    const result = await firstValueFrom(
      this.api.get<GlobalExpenseHit[]>(`Split/search?q=${encodeURIComponent(query)}`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Search failed.');
    return result.value ?? [];
  }
}

