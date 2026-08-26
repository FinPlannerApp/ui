import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = signal<number>(0);
  private activeMutations = signal<number>(0);

  public isLoading = computed(() => this.activeRequests() > 0);
  public isMutating = computed(() => this.activeMutations() > 0);

  showRequest(isMutation: boolean = false): void {
    this.activeRequests.update(n => n + 1);
    if (isMutation) {
      this.activeMutations.update(n => n + 1);
    }
  }

  hideRequest(isMutation: boolean = false): void {
    this.activeRequests.update(n => Math.max(0, n - 1));
    if (isMutation) {
      this.activeMutations.update(n => Math.max(0, n - 1));
    }
  }
}
