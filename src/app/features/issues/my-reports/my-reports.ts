import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GenericApi, PaginatedResult } from '../../../core/services/generic-api';
import { QuickFeedbackService } from '../../../shared/components/quick-feedback/quick-feedback.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';

interface MyReport {
  id: number; title: string; status: string; severity: string; isClosed: boolean; createdAt: string;
  hasDiagnostics: boolean; hasScreenshot: boolean; similarReports: number;
}

/** Status in plain words, for the person who reported it. */
const STATUS_TEXT: Record<string, { label: string; tone: string }> = {
  New: { label: 'Received', tone: 'text-sky-400 border-sky-500/40' },
  Acknowledged: { label: 'Seen by the team', tone: 'text-sky-400 border-sky-500/40' },
  Triaged: { label: 'Being looked at', tone: 'text-amber-400 border-amber-500/40' },
  Planned: { label: 'Planned', tone: 'text-amber-400 border-amber-500/40' },
  InProgress: { label: 'Being fixed', tone: 'text-amber-400 border-amber-500/40' },
  Released: { label: 'Fixed in an update', tone: 'text-emerald-400 border-emerald-500/40' },
  Verified: { label: 'Fixed and checked', tone: 'text-emerald-400 border-emerald-500/40' },
  Closed: { label: 'Closed', tone: 'text-[var(--text-muted)] border-[var(--glass-border)]' },
};

/**
 * Everything the signed-in person has reported, newest first, with where each report stands. Paged by cursor: "Load more"
 * asks the server for the page after the last row seen, so a long history stays as quick as a short one.
 */
@Component({
  selector: 'app-my-reports',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  template: `
<div class="w-full flex flex-col gap-4 py-4">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-2xl font-bold m-0 gradient-text">My reports</h1>
      <p class="text-sm text-muted mt-1 mb-0">Problems you reported, and where each one stands.</p>
    </div>
    <p-button label="Report a problem" icon="pi pi-flag" (onClick)="feedback.open()"></p-button>
  </div>

  @if (loading()) {
    <div class="text-sm text-muted p-6">Loading…</div>
  } @else if (failed()) {
    <div class="p-4 rounded-xl border border-red-400/40 text-sm">Could not load your reports. <button class="underline bg-transparent border-0 cursor-pointer text-inherit" (click)="load()">Try again</button></div>
  } @else if (reports().length === 0) {
    <div class="glass-card p-8 rounded-2xl text-center text-sm text-muted">You have not reported anything yet. Press the flag button, or {{ feedback.shortcutLabel }}, when something goes wrong.</div>
  } @else {
    <div class="glass-card rounded-2xl p-2 sm:p-4 flex flex-col divide-y divide-[var(--surface-border)]">
      @for (r of reports(); track r.id) {
        <a [routerLink]="['/app/issues', r.id]" class="no-underline py-3 px-2 flex flex-wrap items-center justify-between gap-3 hover:bg-white/5 rounded-xl">
          <div class="min-w-0 grow">
            <div class="text-sm font-semibold text-[var(--text-main)] truncate">{{ r.title }}</div>
            <div class="text-xs text-[var(--text-muted)]">
              #{{ r.id }} · {{ r.createdAt | date:'dd MMM yyyy' }}
              @if (r.hasScreenshot) { · <i class="pi pi-image text-[10px]"></i> screenshot }
              @if (r.similarReports > 0) { · {{ r.similarReports === 1 ? 'one other person' : r.similarReports + ' other people' }} reported this too }
            </div>
          </div>
          <span class="text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap" [class]="tone(r.status)">{{ label(r.status) }}</span>
        </a>
      }
    </div>
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <span class="text-xs text-muted">Showing {{ reports().length }}@if (total() > 0) { of {{ total() }} }</span>
      @if (hasMore()) {
        <p-button label="Load more" icon="pi pi-angle-down" severity="secondary" [outlined]="true" [loading]="loadingMore()" (onClick)="loadMore()"></p-button>
      }
    </div>
  }
</div>`,
})
export class MyReports {
  private api = inject(GenericApi);
  protected feedback = inject(QuickFeedbackService);

  private static readonly PAGE = 20;
  reports = signal<MyReport[]>([]);
  total = signal(0);
  hasMore = signal(false);
  private cursor = signal<string | null>(null);
  loading = signal(true);
  loadingMore = signal(false);
  failed = signal(false);
  shown = computed(() => this.reports().length);

  constructor() { this.load(); }

  label(status: string): string { return STATUS_TEXT[status]?.label ?? status; }
  tone(status: string): string { return STATUS_TEXT[status]?.tone ?? STATUS_TEXT['Closed'].tone; }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.get<PaginatedResult<MyReport>>(`Issues/my-reports?pageSize=${MyReports.PAGE}`).subscribe({
      next: r => {
        this.loading.set(false);
        if (!r.isSuccess) { this.failed.set(true); return; }
        this.reports.set(r.value.data);
        this.total.set(Math.max(0, r.value.totalRecords));
        this.hasMore.set(!!r.value.hasMore);
        this.cursor.set(r.value.nextCursor ?? null);
      },
      error: () => { this.loading.set(false); this.failed.set(true); },
    });
  }

  loadMore(): void {
    const cursor = this.cursor();
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.api.get<PaginatedResult<MyReport>>(`Issues/my-reports?pageSize=${MyReports.PAGE}&cursor=${encodeURIComponent(cursor)}`).subscribe({
      next: r => {
        this.loadingMore.set(false);
        if (!r.isSuccess) return;
        const seen = new Set(this.reports().map(x => x.id));
        this.reports.update(list => [...list, ...r.value.data.filter(x => !seen.has(x.id))]);
        this.hasMore.set(!!r.value.hasMore);
        this.cursor.set(r.value.nextCursor ?? null);
      },
      error: () => this.loadingMore.set(false),
    });
  }
}
