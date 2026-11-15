import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UndoService } from '../../../core/services/undo.service';

/** "N deletions can still be undone · 8:41 left · Review" — shown on the transaction pages while there is something to undo. */
@Component({
  selector: 'app-undo-banner',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shown() > 0) {
      <div class="flex items-center gap-3 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs" role="status">
        <i class="pi pi-undo text-amber-400"></i>
        <span class="grow">
          <b>{{ shown() }}</b> deleted {{ shown() === 1 ? 'transaction' : 'transactions' }} can still be undone ·
          <b>{{ clock() }}</b> left for the soonest
        </span>
        <a routerLink="/app/undo" class="font-bold no-underline text-amber-300 whitespace-nowrap">Review &amp; undo →</a>
      </div>
    }
  `
})
export class UndoBanner implements OnInit {
  private undo = inject(UndoService);
  /** Limit to one account (the ledger page); omit for everything. */
  accountId = input<number | null>(null);

  private mine = computed(() => this.undo.items().filter(i => this.accountId() === null || i.accountId === this.accountId()));
  shown = computed(() => this.mine().length);
  clock = computed(() => {
    const list = this.mine();
    if (!list.length) return '0:00';
    const s = Math.min(...list.map(i => this.undo.secondsLeft(i)));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  ngOnInit(): void { void this.undo.load(); }
}
