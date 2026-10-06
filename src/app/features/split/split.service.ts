import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import {
  CreateExpenseRequest, CreateGroupRequest, CreateInviteRequest, CreateSettlementRequest,
  ExpensePage, GroupBalances, GroupExport, GroupFullDetails, ImportToLedgerRequest, ImportToLedgerResult,
  InviteCreated, InvitePreview, PaymentRequest, PublicGroupView, Settlement, SplitExpense, SplitGroup, SplitMember
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

  /** Newest day first. Pass the previous page's nextCursor to continue. */
  async getExpensesPage(
    groupId: number,
    opts: { cursor?: string | null; limit?: number; search?: string } = {}
  ): Promise<ExpensePage> {
    const params = new URLSearchParams();
    if (opts.cursor) params.set('cursor', opts.cursor);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.search?.trim()) params.set('search', opts.search.trim());
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

  async joinViaInvite(token: string, displayName: string): Promise<{ groupId: number }> {
    const result = await firstValueFrom(this.api.post<any>('Split/invites/join', { token, displayName }));
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
}

