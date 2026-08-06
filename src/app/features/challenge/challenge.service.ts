import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import { ChallengeOverview, ChallengeDay, MarkDayCompleteRequest, UnmarkDayRequest } from './challenge.model';

@Injectable({
  providedIn: 'root'
})
export class ChallengeService {
  private api = inject(GenericApi);

  async getMyChallenge(): Promise<ChallengeOverview> {
    const result = await firstValueFrom(this.api.get<ChallengeOverview>('challenge/mine'));
    return result.value;
  }

  async markDayComplete(request: MarkDayCompleteRequest): Promise<ChallengeDay> {
    const result = await firstValueFrom(this.api.post<ChallengeDay>('challenge/complete', request));
    return result.value;
  }

  async unmarkDay(request: UnmarkDayRequest): Promise<void> {
    await firstValueFrom(this.api.post<boolean>('challenge/uncomplete', request));
  }
}
