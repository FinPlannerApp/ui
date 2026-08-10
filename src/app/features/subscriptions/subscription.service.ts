import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import { CreateSubscriptionRequest, Subscription } from '../../core/models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private api = inject(GenericApi);

  async getActive(): Promise<Subscription[]> {
    const result = await firstValueFrom(this.api.get<Subscription[]>('Subscriptions'));
    return result.value ?? [];
  }

  async create(request: CreateSubscriptionRequest): Promise<number> {
    const result = await firstValueFrom(this.api.post<number>('Subscriptions', request));
    return result.value;
  }

  // No dedicated cancel endpoint exists for Subscriptions specifically —
  // a Subscription is a 1:1 wrapper around a RecurringTransaction, so
  // "cancelling" it correctly means pausing that underlying recurring
  // transaction. Reuses the pause endpoint built for Recurring
  // Transactions rather than a new, duplicate one.
  async cancel(recurringTransactionId: number): Promise<void> {
    await firstValueFrom(this.api.post<any>(`RecurringTransactions/${recurringTransactionId}/pause`, {}));
  }
}
