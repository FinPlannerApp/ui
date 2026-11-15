import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DiagnosticsService } from '../../../core/services/diagnostics.service';
import { GenericApi } from '../../../core/services/generic-api';

const DRAFT_KEY = 'finplanner_report_draft';
const QUEUE_KEY = 'finplanner_report_queue';
const MAX_QUEUED = 3;
/** After offering "Report this" once, stay quiet this long so a crash loop never nags. */
const OFFER_COOLDOWN_MS = 90_000;
/** Pictures are shrunk to this width before they are kept or sent. */
const MAX_PICTURE_WIDTH = 1280;

export interface ReportDraft { text: string; severity: 'Minor' | 'Major' | 'Critical' }
export interface ReportBody {
  description: string; severity: string; impactsMoney: boolean; contextJson: string; screenshotBase64: string | null;
}

/**
 * Opens the quick bug report from anywhere: the floating button, the account menu, Alt+Shift+B, or the offer after an error.
 *
 * The dialog opens instantly and does no heavy work. A screenshot is optional and the person chooses how:
 *  - paste an image (Ctrl+V): instant, nothing runs;
 *  - capture the screen with the browser's own screen capture: runs outside the page, so the page never freezes;
 *  - capture this page: draws the page with a library, which can make a large page unresponsive for a few seconds,
 *    so it only runs when asked for, with a warning.
 */
@Injectable({ providedIn: 'root' })
export class QuickFeedbackService {
  private diagnostics = inject(DiagnosticsService);
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  /** True while the report dialog is open. */
  readonly visible = signal(false);
  /** The picture to send (JPEG data URL), or null. */
  readonly screenshot = signal<string | null>(null);
  /** True while a picture is being captured. */
  readonly capturing = signal(false);
  /** What the current capture is doing, for the message under the buttons. */
  readonly captureNote = signal<string | null>(null);
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
          this.open();
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

  /** Opens the dialog at once: nothing is captured or computed here. */
  open(): void {
    if (this.visible()) return;
    this.offer.set(null);
    this.screenshot.set(null);
    this.captureNote.set(null);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.screenshot.set(null);
    this.captureNote.set(null);
  }

  dismissOffer(): void { this.offer.set(null); }

  removeScreenshot(): void { this.screenshot.set(null); this.captureNote.set(null); }

  // ── Option 1: a pasted or chosen image (instant) ──
  async attachImage(file: Blob): Promise<void> {
    if (!file.type.startsWith('image/')) { this.captureNote.set('That is not an image.'); return; }
    this.captureNote.set(null);
    this.screenshot.set(await this.shrink(await this.readAsDataUrl(file)));
  }

  // ── Option 2: the browser's own screen capture (outside the page, so it never freezes it) ──
  async captureScreen(): Promise<void> {
    if (this.capturing()) return;
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media?.getDisplayMedia) { this.captureNote.set('This browser cannot capture the screen. Paste an image instead (Ctrl+V).'); return; }
    this.capturing.set(true);
    this.captureNote.set('Choose this tab or window in the browser prompt.');
    let stream: MediaStream | null = null;
    try {
      stream = await media.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true } as DisplayMediaStreamOptions);
      // Hide this dialog for the instant the frame is taken, so it is not in the picture.
      document.body.classList.add('qf-capturing');
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise(r => setTimeout(r, 350));
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, MAX_PICTURE_WIDTH / (video.videoWidth || MAX_PICTURE_WIDTH));
      canvas.width = Math.round((video.videoWidth || MAX_PICTURE_WIDTH) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.screenshot.set(canvas.toDataURL('image/jpeg', 0.72));
      this.captureNote.set(null);
    } catch {
      this.captureNote.set('No screenshot was taken. You can paste an image (Ctrl+V) instead.');
    } finally {
      stream?.getTracks().forEach(t => t.stop());
      document.body.classList.remove('qf-capturing');
      this.capturing.set(false);
    }
  }

  // ── Option 3: draw this page (can pause a large page for a few seconds, so only on request) ──
  async captureThisPage(maskPrivate: boolean): Promise<void> {
    if (this.capturing()) return;
    this.capturing.set(true);
    this.captureNote.set('Taking the screenshot. The page may pause for a few seconds.');
    // Let the note paint before the library starts working.
    await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 60)));
    document.body.classList.add('qf-capturing');
    try {
      const shot = await this.drawPage(maskPrivate);
      this.screenshot.set(shot);
      this.captureNote.set(shot ? null : 'The page could not be captured. Try "Capture screen" or paste an image (Ctrl+V).');
    } finally {
      document.body.classList.remove('qf-capturing');
      this.capturing.set(false);
    }
  }

  private async drawPage(mask: boolean): Promise<string | null> {
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const shot = html2canvas(document.body, {
        scale: Math.min(0.75, 960 / window.innerWidth),
        logging: false,
        useCORS: true,
        imageTimeout: 1500,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        // Our own floating buttons, loader and dialog are not part of the problem being reported.
        ignoreElements: el => ['quick-fab', 'feedback-fab', 'global-loader', 'p-dialog-mask', 'p-dialog', 'report-offer'].some(c => el.classList?.contains(c)),
        onclone: (doc: Document) => { QuickFeedbackService.simplify(doc); if (mask) QuickFeedbackService.coverPrivate(doc); },
      });
      const canvas = await Promise.race([shot, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))]);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch (err) {
      console.warn('Screenshot could not be taken', err);
      return null;
    }
  }

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

  private readAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /** Shrinks a picture to a sensible width and re-encodes it as JPEG, so it is small to send. */
  private shrink(dataUrl: string): Promise<string> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_PICTURE_WIDTH / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  /** In the cloned copy only: drop blurs, backdrop filters, shadows and animations, which make the library very slow. */
  private static simplify(doc: Document): void {
    const style = doc.createElement('style');
    style.textContent = '*, *::before, *::after { filter: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; animation: none !important; transition: none !important; box-shadow: none !important; text-shadow: none !important; }';
    doc.head.appendChild(style);
  }

  /** Covers money amounts, form fields and anything marked data-private with a grey box, in the cloned document only. */
  private static coverPrivate(doc: Document): void {
    const cover = 'color: transparent !important; -webkit-text-fill-color: transparent !important; background: #94a3b8 !important; border-radius: 4px !important; text-shadow: none !important; box-shadow: none !important;';
    const style = doc.createElement('style');
    style.textContent = `input, textarea, select, .money, [data-private], .p-select-label { ${cover} }`;
    doc.head.appendChild(style);
    const amount = /(?:₹|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?|\d{1,3}(?:,\d{2,3})+(?:\.\d+)?/;
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const hits: HTMLElement[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.textContent && amount.test(n.textContent) && n.parentElement) hits.push(n.parentElement);
    }
    for (const el of hits) el.setAttribute('style', `${el.getAttribute('style') ?? ''};${cover}`);
  }
}
