import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import { Merchant, MerchantSpending, UpsertMerchantRequest } from '../../core/models/merchant.model';
import { toDateOnlyString } from '../../core/utils/date-utils';

@Injectable({ providedIn: 'root' })
export class MerchantService {
  private api = inject(GenericApi);

  async getAll(): Promise<Merchant[]> {
    const result = await firstValueFrom(this.api.get<Merchant[]>('Merchants'));
    return result.value ?? [];
  }

  async upsert(request: UpsertMerchantRequest): Promise<Merchant> {
    const result = await firstValueFrom(this.api.post<Merchant>('Merchants/upsert', request));
    return result.value;
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.api.post<boolean>('Merchants/delete', { id }));
  }

  // Returns the matched merchant's ID, or null if nothing matched. Purely
  // a suggestion — the caller decides whether to actually apply it.
  async suggest(description: string): Promise<number | null> {
    if (!description || description.trim().length < 2) return null;
    try {
      const result = await firstValueFrom(this.api.get<number | null>(`Merchants/suggest?description=${encodeURIComponent(description)}`));
      return result.value;
    } catch {
      return null; // suggestion failures should never block the actual transaction form
    }
  }

  async getSpending(startDate: Date, endDate: Date): Promise<MerchantSpending[]> {
    const result = await firstValueFrom(this.api.get<MerchantSpending[]>(
      `Merchants/spending?startDate=${toDateOnlyString(startDate)}&endDate=${toDateOnlyString(endDate)}`
    ));
    return result.value ?? [];
  }
}
