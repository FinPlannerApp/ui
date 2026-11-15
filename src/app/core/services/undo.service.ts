import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from './generic-api';
import { UndoItem, UndoableTransaction } from '../models/undo.model';

/**
 * Everything about undoing deletes: the "Deleted — Undo" toast, plus the list behind the Undo centre.
 * Deadlines come from the server (`secondsLeft`); the client only counts down and drops items at zero.
 * The server still enforces the window, so a stale screen can never restore something late.
 */
@Injectable({ providedIn: 'root' })
export class UndoService implements OnDestroy {
  private messages = inject(MessageService);
  private api = inject(GenericApi);
  private action: (() => Promise<void> | void) | null = null;

  private all = signal<UndoItem[]>([]);
  private nowMs = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;
  loading = signal(false);

  /** Items whose time has not run out yet. */
  items = computed(() => this.all().filter(i => i.expiresAtMs > this.nowMs()));
  count = computed(() => this.items().length);
  /** Seconds left for an item, counted down locally from the server's figure. */
  secondsLeft(i: UndoItem): number { return Math.max(0, Math.ceil((i.expiresAtMs - this.nowMs()) / 1000)); }
  /** Soonest deadline across all items, for the banner. */
  soonest = computed(() => {
    const list = this.items();
    return list.length ? Math.max(0, Math.ceil((Math.min(...list.map(i => i.expiresAtMs)) - this.nowMs()) / 1000)) : 0;
  });

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.api.get<UndoableTransaction[]>('Transactions/undoable'));
      if (res.isSuccess) {
        const at = Date.now();
        this.all.set(res.value.map(v => ({ ...v, expiresAtMs: at + v.secondsLeft * 1000 })));
        this.nowMs.set(at);
        this.startTimer();
      }
    } catch { /* the Undo centre is supplementary */ } finally { this.loading.set(false); }
  }

  async restore(i: UndoItem): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await firstValueFrom(this.api.post<boolean>('Transactions/restore', { accountId: i.accountId, transactionId: i.transactionId }));
      if (!res.isSuccess) return { ok: false, message: res.error?.description || 'Could not undo.' };
      this.all.update(list => list.filter(x => x.transactionId !== i.transactionId));
      await this.load(); // balances and budgets of the remaining items have moved
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: e?.message || 'Could not undo.' };
    }
  }

  offer(detail: string, undo: () => Promise<void> | void): void {
    this.action = undo;
    this.messages.clear('undo');
    this.messages.add({ key: 'undo', severity: 'info', summary: 'Deleted', detail, life: 8000 });
    void this.load(); // keep the Undo centre / banner in step
  }

  async run(): Promise<void> {
    const fn = this.action;
    this.action = null;
    this.messages.clear('undo');
    await fn?.();
    void this.load();
  }

  private startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.nowMs.set(Date.now());
      if (!this.all().some(i => i.expiresAtMs > Date.now())) { clearInterval(this.timer); this.timer = undefined; }
    }, 1000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }
}
