import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface ApiCallRecord { at: string; method: string; path: string; status: number; ms: number; error?: string }
export interface Breadcrumb { at: string; kind: 'route' | 'click'; what: string }

const MAX_ERRORS = 30;
const MAX_CALLS = 30;
const MAX_CRUMBS = 25;

/**
 * Keeps a short rolling record of what just happened in the app (console errors, API calls, page changes, clicks),
 * so a bug report can carry it without the user having to describe it. Nothing leaves the browser until the user
 * sends a report, and the report shows exactly what will be sent first.
 * Privacy: request and response bodies are never recorded, query strings are dropped, clicks record the button or
 * link text only (never what is typed into a field).
 */
@Injectable({ providedIn: 'root' })
export class DiagnosticsService {
  private router = inject(Router);
  private errors: string[] = [];
  private calls: ApiCallRecord[] = [];
  private crumbs: Breadcrumb[] = [];
  private installed = false;

  /** The latest unhandled error (not console.error noise): lets the app offer "Report this" without being asked. */
  readonly unhandled = signal<{ message: string; at: number } | null>(null);

  /** Starts listening. Safe to call more than once. */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;

    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      this.addError(args.map(a => this.text(a)).join(' '));
      original(...args);
    };
    window.addEventListener('error', e => {
      const message = `${e.message} (${this.shortFile(e.filename)}:${e.lineno})`;
      this.addError(message);
      this.unhandled.set({ message, at: Date.now() });
    });
    window.addEventListener('unhandledrejection', e => {
      const message = `Unhandled promise rejection: ${this.text(e.reason)}`;
      this.addError(message);
      this.unhandled.set({ message, at: Date.now() });
    });

    document.addEventListener('click', e => {
      const el = (e.target as HTMLElement | null)?.closest('button, a, [role=button], [role=tab], [role=menuitem]') as HTMLElement | null;
      if (!el) return;
      const label = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 50);
      this.addCrumb('click', label);
    }, true);

    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) this.addCrumb('route', this.cleanPath(ev.urlAfterRedirects));
    });
  }

  recordCall(call: ApiCallRecord): void {
    this.calls.push(call);
    if (this.calls.length > MAX_CALLS) this.calls.shift();
  }

  /** Everything collected so far, plus where and on what the user is. */
  snapshot(): Record<string, unknown> {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    return {
      capturedAt: new Date().toISOString(),
      page: this.cleanPath(this.router.url),
      title: document.title,
      appVersion: environment.appVersion,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      screen: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio,
      breakpoint: document.documentElement.getAttribute('data-bp'),
      theme: document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
      userAgent: nav?.userAgent,
      language: nav?.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      online: nav?.onLine,
      consoleErrors: [...this.errors],
      failedApiCalls: this.calls.filter(c => c.status === 0 || c.status >= 400 || c.error),
      recentApiCalls: [...this.calls],
      recentSteps: [...this.crumbs],
    };
  }

  private addError(message: string): void {
    this.errors.push(`${new Date().toISOString().slice(11, 19)} ${redact(message).slice(0, 400)}`);
    if (this.errors.length > MAX_ERRORS) this.errors.shift();
  }

  private addCrumb(kind: Breadcrumb['kind'], what: string): void {
    this.crumbs.push({ at: new Date().toISOString().slice(11, 19), kind, what: redact(what) });
    if (this.crumbs.length > MAX_CRUMBS) this.crumbs.shift();
  }

  private cleanPath(url: string): string { return url.split('?')[0].split('#')[0]; }
  private shortFile(f: string | undefined): string { return (f ?? '').split('/').pop() ?? ''; }
  private text(v: unknown): string {
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v)?.slice(0, 300) ?? String(v); } catch { return String(v); }
  }
}

/**
 * Takes money and personal details out of anything written into a report: amounts (₹ 12,000 / Rs 450.50 / 1,23,456),
 * e-mail addresses, long digit runs (card, account, phone numbers) and bearer/JWT tokens. A bug report needs to say what
 * was clicked and what failed, not what the balance was.
 */
export function redact(text: string): string {
  return text
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, '[token]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/(?:₹|Rs\.?|INR)\s?-?\d[\d,]*(?:\.\d+)?/gi, '[amount]')
    .replace(/\b\d{1,3}(?:,\d{2,3})+(?:\.\d+)?\b/g, '[amount]')
    .replace(/\b\d{8,}\b/g, '[number]');
}
