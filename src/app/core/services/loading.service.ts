import { computed, Injectable, signal, untracked } from '@angular/core';

/** Waits this long before the loader appears, so quick requests never flash it. */
const SHOW_AFTER_MS = 250;
/** Once shown, the loader stays at least this long, so it never blinks. */
const MIN_VISIBLE_MS = 500;

/**
 * Counts the requests in flight. `visible` is the debounced state the one global loader follows;
 * `isMutating` (a save/delete is running) makes the loader block clicks until it finishes.
 */
@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequests = signal<number>(0);
  private activeMutations = signal<number>(0);
  private _visible = signal<boolean>(false);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private visibleSince = 0;

  public isLoading = computed(() => this.activeRequests() > 0);
  public isMutating = computed(() => this.activeMutations() > 0);
  /** True while the global loader should be on screen. */
  public visible = this._visible.asReadonly();
  public label = computed(() => (this.isMutating() ? 'Saving…' : 'Loading…'));

  showRequest(isMutation: boolean = false): void {
    this.activeRequests.update(n => n + 1);
    if (isMutation) {
      this.activeMutations.update(n => n + 1);
    }
    untracked(() => this.sync());
  }

  hideRequest(isMutation: boolean = false): void {
    this.activeRequests.update(n => Math.max(0, n - 1));
    if (isMutation) {
      this.activeMutations.update(n => Math.max(0, n - 1));
    }
    untracked(() => this.sync());
  }

  /**
   * Always runs untracked: requests are often started from inside a component effect, and reading these signals there
   * would make that effect depend on the loader and re-run (and re-request) every time the loader changes.
   */
  private sync(): void {
    if (this.activeRequests() > 0) {
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
      if (!this._visible() && !this.showTimer) {
        this.showTimer = setTimeout(() => {
          this.showTimer = null;
          if (this.activeRequests() > 0) {
            this.visibleSince = Date.now();
            this._visible.set(true);
          }
        }, SHOW_AFTER_MS);
      }
      return;
    }
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (this._visible() && !this.hideTimer) {
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - this.visibleSince));
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        if (this.activeRequests() === 0) this._visible.set(false);
      }, wait);
    }
  }
}
