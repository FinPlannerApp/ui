import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { TIPS, Tip } from '../data/tips';

/** Footer one-liner: a "how do I…" tip that rotates every 10 s, pauses on hover/focus, and favours the current page's area. */
@Component({
  selector: 'app-tip-ticker',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!dismissed()) {
    <div class="fixed left-0 right-0 z-[900] flex justify-center px-3 pointer-events-none"
         style="bottom: max(0.5rem, env(safe-area-inset-bottom, 0px));">
    <div class="pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl border border-[var(--glass-border)] glass-card max-w-3xl w-full shadow-lg"
         (mouseenter)="paused.set(true)" (mouseleave)="paused.set(false)" (focusin)="paused.set(true)" (focusout)="paused.set(false)">
      <i class="pi pi-lightbulb text-amber-400 shrink-0" aria-hidden="true"></i>
      <span class="grow min-w-0 truncate" role="status" aria-live="off" [title]="tip().text">
        <b>{{ tip().area }}:</b> {{ tip().text }}
      </span>
      <a routerLink="/app/tips" class="shrink-0 no-underline text-[var(--primary-color)] font-semibold">All tips</a>
      <button type="button" class="shrink-0 bg-transparent border-none cursor-pointer text-[var(--text-muted)]" aria-label="Hide tips" (click)="dismiss()"><i class="pi pi-times text-[10px]"></i></button>
    </div>
    </div>
    }
  `
})
export class TipTicker implements OnInit, OnDestroy {
  private router = inject(Router);
  private url = signal(this.router.url);
  private index = signal(0);
  paused = signal(false);
  dismissed = signal(this.read());
  private read(): boolean { try { return localStorage.getItem('tips-hidden') === '1'; } catch { return false; } }
  dismiss(): void { this.dismissed.set(true); try { localStorage.setItem('tips-hidden', '1'); } catch { /* per-session only */ } }
  private timer?: ReturnType<typeof setInterval>;

  /** Tips for the page you're on come first, then the rest. */
  private ordered = computed<Tip[]>(() => {
    const u = this.url();
    const mine = TIPS.filter(t => t.link && this.same(u, t.link));
    return [...mine, ...TIPS.filter(t => !mine.includes(t))];
  });
  tip = computed(() => this.ordered()[this.index() % this.ordered().length]);

  private same(url: string, link: string): boolean {
    const seg = (x: string) => x.split('?')[0].split('/')[2] ?? '';
    return seg(url) === seg(link);
  }

  ngOnInit(): void {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => { this.url.set(this.router.url); this.index.set(0); });
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.timer = setInterval(() => { if (!this.paused() && !reduce) this.index.update(i => i + 1); }, 10_000);
  }
  ngOnDestroy(): void { clearInterval(this.timer); }
}
