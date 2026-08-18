import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import {
  CreateExpenseRequest, CreateGroupRequest, CreateInviteRequest, CreateSettlementRequest,
  GroupBalances, ImportToLedgerRequest, ImportToLedgerResult, InviteCreated, InvitePreview,
  PaymentRequest, PublicGroupView, SplitExpense, SplitGroup, SplitMember
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

  async getExpenses(groupId: number): Promise<SplitExpense[]> {
    const result = await firstValueFrom(this.api.get<SplitExpense[]>(`Split/groups/${groupId}/expenses`));
    if (!result.isSuccess) {
      throw new Error(result.error?.description || 'Failed to load expenses.');
    }
    return result.value ?? [];
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

  async importToLedger(req: ImportToLedgerRequest): Promise<ImportToLedgerResult> {
    const result = await firstValueFrom(this.api.post<ImportToLedgerResult>('Split/import-to-ledger', req));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Failed to import.');
    return result.value;
  }

  async getSettlementHistory(groupId: number): Promise<any[]> {
    const result = await firstValueFrom(this.api.get<any[]>(`Split/groups/${groupId}/settlements`));
    if (!result.isSuccess) throw new Error(result.error?.description || 'Could not load settlement history.');
    return result.value ?? [];
  }
}

