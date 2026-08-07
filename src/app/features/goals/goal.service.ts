import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import { Goal, UpsertGoalRequest, BucketOption } from '../../core/models/goal.model';

@Injectable({ providedIn: 'root' })
export class GoalService {
  private api = inject(GenericApi);

  async getAll(): Promise<Goal[]> {
    const result = await firstValueFrom(this.api.get<Goal[]>('Goals'));
    return result.value ?? [];
  }

  async upsert(request: UpsertGoalRequest): Promise<Goal> {
    const result = await firstValueFrom(this.api.post<Goal>('Goals/upsert', request));
    return result.value;
  }

  async delete(id: number): Promise<void> {
    await firstValueFrom(this.api.post<boolean>('Goals/delete', { id }));
  }

  async getAllBuckets(): Promise<BucketOption[]> {
    const result = await firstValueFrom(this.api.get<BucketOption[]>('SavingsBuckets/all'));
    return result.value ?? [];
  }
}
