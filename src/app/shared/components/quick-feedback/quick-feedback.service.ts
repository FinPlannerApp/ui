import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DiagnosticsService } from '../../../core/services/diagnostics.service';
import { GenericApi } from '../../../core/services/generic-api';

const DRAFT_KEY = 'finplanner_report_draft';
const QUEUE_KEY = 'finplanner_report_queue';
const MAX_QUEUED = 3;
/** After offering "Report this" once, stay quiet this long so a crash loop never nags. */
const OFFER_COOLDOWN_MS = 90_000;

export interface ReportDraft { text: string; severity: 'Minor' | 'Major' | 'Critical' }
export interface ReportBody {
  description: string; severity: string; impactsMoney: boolean; contextJson: string; screenshotBase64: string | null;
}

/** Opens the quick bug report from anywhere: the floating button, the account menu, Alt+Shift+B, or the offer after an error. */
@Injectable({ providedIn: 'root' })
export class QuickFeedbackService {
  private diagnostics = inject(DiagnosticsService);
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  /** True while the report dialog is open. */
  readonly visible = signal(false);
  /** The screenshot as it is, and the same screenshot with amounts and typed text blurred (JPEG data URLs), or null. */
  readonly screenshot = signal<string | null>(null);
  readonly screenshotMasked = signal<string | null>(null);
  /** True while the screenshots are being taken. */
  readonly capturing = signal(false);
  /** Set after an unhandled error: the app asks "Something went wrong. Report it?" */
  readonly offer = signal<string | null>(null);

  /** Keyboard shortcut label shown in tooltips and menus. */
  readonly shortcutLabel = 'Alt+Shift+B';
  private lastOfferAt = 0;
  /** True while the offline queue is being sent, so a double "online" event cannot send a report twice. */
  private flushing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => {
        if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyB') {
          e.preventDefault();
          void this.open();
        }
      });
      // A report written offline is sent as soon as the connection is back.
      window.addEventListener('online', () => void this.flushQueue());
    }
    // Offer a report after an unhandled error, at most once per cooldown, and never while the dialog is already open.
    effect(() => {
      const err = this.diagnostics.unhandled();
      if (!err) return;
      untracked(() => {
        if (this.visible() || Date.now() - this.lastOfferAt < OFFER_COOLDOWN_MS) return;
        this.lastOfferAt = Date.now();
        this.offer.set(err.message);
      });
    });
    void this.flushQueue();
  }

  /**
   * Opens the dialog at once and takes the screenshot in the background (the dialog itself is left out of the picture),
   * so reporting is instant even on a heavy page. The preview appears when the picture is ready.
   */
  async open(): Promise<void> {
    if (this.visible()) return;
    this.offer.set(null);
    this.screenshot.set(null);
    this.screenshotMasked.set(null);
    this.visible.set(true);
    this.capturing.set(true);
    // Let the dialog paint first; the capture then blocks the page for a moment while it draws.
    await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 60)));
    // One screenshot, with amounts and typed text covered (privacy first, and the default). The uncovered picture is
    // only taken if the person turns that off: see captureUnblurred().
    const masked = await this.capture(true);
    if (this.visible()) this.screenshotMasked.set(masked);
    this.capturing.set(false);
  }

  /** The screenshot without the covers, taken on request. */
  async captureUnblurred(): Promise<void> {
    if (this.screenshot() || this.capturing()) return;
    this.capturing.set(true);
    await new Promise<void>(r => setTimeout(r, 30));
    const raw = await this.capture(false);
    if (this.visible()) this.screenshot.set(raw);
    this.capturing.set(false);
  }

  close(): void {
    this.visible.set(false);
    this.screenshot.set(null);
    this.screenshotMasked.set(null);
  }

  dismissOffer(): void { this.offer.set(null); }

  // ── Draft: what was typed survives closing the dialog, a refresh, or a failed send ──
  loadDraft(): ReportDraft | null {
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') as ReportDraft | null; } catch { return null; }
  }
  saveDraft(draft: ReportDraft): void {
    try {
      if (draft.text.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); else localStorage.removeItem(DRAFT_KEY);
    } catch { /* private mode: no draft */ }
  }
  clearDraft(): void { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

  // ── Offline queue: up to 3 reports kept on this device until the server can be reached ──
  queue(body: ReportBody): void {
    try {
      const list = this.readQueue();
      // The screenshot is the heavy part: keep it only when small enough for local storage.
      const slim = body.screenshotBase64 && body.screenshotBase64.length > 600_000 ? { ...body, screenshotBase64: null } : body;
      list.push(slim);
      localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-MAX_QUEUED)));
    } catch { /* storage full or blocked: the draft text is still kept */ }
  }

  async flushQueue(): Promise<void> {
    if (this.flushing || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    const list = this.readQueue();
    if (list.length === 0) return;
    this.flushing = true;
    try {
    const remaining: ReportBody[] = [];
    for (const body of list) {
      try {
        const r = await new Promise<{ isSuccess: boolean }>((resolve, reject) =>
          this.api.post<{ id: number }>('Issues/quick-report', body).subscribe({ next: x => resolve(x), error: reject }));
        if (!r.isSuccess) continue; // the server refused it (too short...): do not retry forever
      } catch { remaining.push(body); }
    }
    try {
      if (remaining.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)); else localStorage.removeItem(QUEUE_KEY);
    } catch { /* ignore */ }
    if (remaining.length < list.length) {
      this.toast.add({ severity: 'success', summary: 'Report sent', detail: 'Your saved report reached the Feedback Hub.', life: 5000 });
    }
    } finally {
      this.flushing = false;
    }
  }

  private readQueue(): ReportBody[] {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as ReportBody[]; } catch { return []; }
  }

  /**
   * What is on screen right now, as a small JPEG. With `mask`, amounts, typed text and anything marked data-private are
   * covered in the copy that is photographed (never on the real page). Failure is fine: the report goes without a picture.
   */
  private async capture(mask: boolean): Promise<string | null> {
    try {
      const t0 = performance.now();
      const { default: html2canvas } = await import('html2canvas-pro');
      console.debug('screenshot: library loaded in', Math.round(performance.now() - t0), 'ms');
      // Small is enough to see what was on screen, and far quicker to draw.
      const scale = Math.min(0.75, 960 / window.innerWidth);
      const shot = html2canvas(document.body, {
        scale,
        logging: false,
        useCORS: true,
        imageTimeout: 1500,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        // Our own floating buttons and loader are not part of the problem being reported.
        ignoreElements: el => ['quick-fab', 'feedback-fab', 'global-loader', 'p-dialog-mask', 'p-dialog', 'report-offer'].some(c => el.classList?.contains(c)),
        onclone: (doc: Document) => { QuickFeedbackService.simplify(doc); if (mask) QuickFeedbackService.blurPrivate(doc); },
      });
      const canvas = await Promise.race([shot, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]);
      console.debug('screenshot: taken in', Math.round(performance.now() - t0), 'ms, mask =', mask);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch (err) {
      console.warn('Screenshot could not be taken', err);
      return null;
    }
  }

  /**
   * In the cloned copy only: drop blurs, backdrop filters, shadows and animations. They make the screenshot library
   * very slow on a glass-style page and add nothing a bug report needs.
   */
  private static simplify(doc: Document): void {
    const style = doc.createElement('style');
    style.textContent = '*, *::before, *::after { filter: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; animation: none !important; transition: none !important; box-shadow: none !important; text-shadow: none !important; }';
    doc.head.appendChild(style);
  }

  /**
   * Covers money amounts, form fields and anything marked data-private with a grey box, in the cloned document only.
   * (Solid boxes instead of a blur: they are far cheaper for the screenshot library to draw, and they cannot be undone.)
   */
  private static blurPrivate(doc: Document): void {
    const cover = 'color: transparent !important; -webkit-text-fill-color: transparent !important; background: #94a3b8 !important; border-radius: 4px !important; text-shadow: none !important; box-shadow: none !important;';
    const style = doc.createElement('style');
    style.textContent = `input, textarea, select, .money, [data-private], .p-select-label { ${cover} }`;
    doc.head.appendChild(style);
    const amount = /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?|\d{1,3}(?:,\d{2,3})+(?:\.\d+)?/;
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const hits: HTMLElement[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.textContent && amount.test(n.textContent) && n.parentElement) hits.push(n.parentElement);
    }
    for (const el of hits) el.setAttribute('style', `${el.getAttribute('style') ?? ''};${cover}`);
  }
}
