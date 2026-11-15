import { Injectable, inject, signal } from '@angular/core';

/** Opens the quick bug report from anywhere: the floating button, the account menu, or Alt+Shift+B. */
@Injectable({ providedIn: 'root' })
export class QuickFeedbackService {
  /** True while the report dialog is open. */
  readonly visible = signal(false);
  /** The screenshot taken just before the dialog opened (JPEG data URL), or null if it could not be taken. */
  readonly screenshot = signal<string | null>(null);
  /** True while the screenshot is being taken. */
  readonly capturing = signal(false);

  /** Keyboard shortcut label shown in tooltips and menus. */
  readonly shortcutLabel = 'Alt+Shift+B';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => {
        if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyB') {
          e.preventDefault();
          void this.open();
        }
      });
    }
  }

  /** Takes the screenshot first (so the dialog is not in it), then opens the dialog. */
  async open(): Promise<void> {
    if (this.visible() || this.capturing()) return;
    this.capturing.set(true);
    this.screenshot.set(await this.capture());
    this.capturing.set(false);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.screenshot.set(null);
  }

  /** What is on screen right now, as a small JPEG. Failure is fine: the report just goes without a picture. */
  private async capture(): Promise<string | null> {
    try {
      const { default: html2canvas } = await import('html2canvas-pro');
      const scale = Math.min(1, 1280 / window.innerWidth);
      const shot = html2canvas(document.body, {
        scale,
        logging: false,
        useCORS: true,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        // Our own floating buttons and loader are not part of the problem being reported.
        ignoreElements: el => el.classList?.contains('quick-fab') || el.classList?.contains('feedback-fab') || el.classList?.contains('global-loader'),
      });
      const canvas = await Promise.race([shot, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 7000))]);
      return canvas.toDataURL('image/jpeg', 0.72);
    } catch (err) {
      console.warn('Screenshot could not be taken', err);
      return null;
    }
  }
}
