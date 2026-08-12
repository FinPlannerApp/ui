import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import {
  CreateExpenseRequest, CreateGroupRequest, CreateSettlementRequest,
  GroupBalances, PaymentRequest, PublicGroupView, SplitExpense,
  SplitGroup, SplitMember
} from '../../core/models/split.model';

@Injectable({ providedIn: 'root' })
export class SplitService {
  private api = inject(GenericApi);

  async createGroup(req: CreateGroupRequest): Promise<SplitGroup> {
    const result = await firstValueFrom(this.api.post<SplitGroup>('Split/groups', req));
    return result.value;
  }

  async getMyGroups(): Promise<SplitGroup[]> {
    const result = await firstValueFrom(this.api.get<SplitGroup[]>('Split/groups'));
    return result.value ?? [];
  }

  async getGroup(groupId: number): Promise<SplitGroup> {
    const result = await firstValueFrom(this.api.get<SplitGroup>(`Split/groups/${groupId}`));
    return result.value;
  }

  async addMember(groupId: number, name: string, upiId: string | null): Promise<SplitMember> {
    const result = await firstValueFrom(this.api.post<SplitMember>('Split/members', { groupId, name, upiId }));
    return result.value;
  }

  async updateMemberUpi(memberId: number, upiId: string): Promise<void> {
    await firstValueFrom(this.api.post<any>('Split/members/upi', { memberId, upiId }));
  }

  async addExpense(req: CreateExpenseRequest): Promise<SplitExpense> {
    const result = await firstValueFrom(this.api.post<SplitExpense>('Split/expenses', req));
    return result.value;
  }

  async getExpenses(groupId: number): Promise<SplitExpense[]> {
    const result = await firstValueFrom(this.api.get<SplitExpense[]>(`Split/groups/${groupId}/expenses`));
    return result.value ?? [];
  }

  async getBalances(groupId: number): Promise<GroupBalances> {
    const result = await firstValueFrom(this.api.get<GroupBalances>(`Split/groups/${groupId}/balances`));
    return result.value;
  }

  async createSettlement(req: CreateSettlementRequest): Promise<any> {
    const result = await firstValueFrom(this.api.post<any>('Split/settlements', req));
    return result.value;
  }

  async markSettlementPaid(settlementId: number): Promise<void> {
    await firstValueFrom(this.api.post<any>(`Split/settlements/${settlementId}/mark-paid`, {}));
  }

  async getPaymentRequest(settlementId: number): Promise<PaymentRequest> {
    const result = await firstValueFrom(this.api.get<PaymentRequest>(`Split/settlements/${settlementId}/payment-request`));
    return result.value;
  }

  async getPublicView(shareToken: string): Promise<PublicGroupView> {
    const result = await firstValueFrom(this.api.get<PublicGroupView>(`Split/public/${shareToken}`));
    return result.value;
  }
}
