import { Injectable, inject, isDevMode } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { MessageService } from 'primeng/api';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private swUpdate = inject(SwUpdate);
  private messageService = inject(MessageService);

  private initialScriptHashes = new Set<string>();
  private isNotificationShown = false;

  /**
   * Initialize update checking. Call once from the root component.
   * Listens for new service worker versions and prompts the user to reload.
   */
  initialize(): void {
    if (this.swUpdate.isEnabled) {
      this.initPwaUpdateCheck();
    } else {
      this.initNonPwaUpdateCheck();
    }
  }

  private lastCheck = 0;

  /** Re-check when the app comes back to the foreground and every 30 minutes. An installed PWA is
   *  usually resumed from memory, not relaunched, so a check "once at launch" never sees a new version. */
  private startPeriodicChecks(): void {
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - this.lastCheck < 60_000) return;
      this.lastCheck = Date.now();
      if (this.swUpdate.isEnabled) this.swUpdate.checkForUpdate().catch(() => {});
      else void this.checkNonPwaUpdate();
    };
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    setInterval(check, 30 * 60_000);
  }

  /**
   * Manual "Check for updates". Returns what happened so the caller can tell the user.
   * 'updated' = a new version was found and the page is reloading into it.
   */
  async checkNow(): Promise<'updated' | 'latest' | 'error'> {
    try {
      if (this.swUpdate.isEnabled) {
        const found = await this.swUpdate.checkForUpdate();
        if (found) {
          await this.swUpdate.activateUpdate();
          document.location.reload();
          return 'updated';
        }
        return 'latest';
      }
      await this.checkNonPwaUpdate(true);
      return this.isNotificationShown ? 'updated' : 'latest';
    } catch {
      return 'error';
    }
  }

  /** Last resort when an installed PWA is stuck on an old version: drop the service worker and every cache, then reload. */
  async hardReload(): Promise<void> {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((regs ?? []).map(r => r.unregister()));
      const keys = await caches?.keys?.();
      await Promise.all((keys ?? []).map(k => caches.delete(k)));
    } catch { /* reload anyway */ }
    document.location.reload();
  }

  private initPwaUpdateCheck(): void {
    // Check for update when the user turns on/launches the application, and again on every resume
    this.swUpdate.checkForUpdate().catch(() => {});
    this.startPeriodicChecks();

    // Trigger update ONLY when Angular Service Worker confirms a real UI version change
    this.swUpdate.versionUpdates.pipe(
      filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
    ).subscribe(async () => {
      await this.swUpdate.activateUpdate();
      if (document.hidden) {
        document.location.reload();
      } else {
        this.showUpdateNotification();
      }
    });

    // Handle unrecoverable states
    this.swUpdate.unrecoverable.subscribe(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'App Error',
        detail: 'The app encountered an error. Please reload the page.',
        sticky: true,
        closable: false,
        key: 'pwa-update',
        data: { action: 'reload' }
      });
    });
  }

  private initNonPwaUpdateCheck(): void {
    this.recordInitialScriptHashes();
    this.checkNonPwaUpdate();
    this.startPeriodicChecks();
  }

  private recordInitialScriptHashes(): void {
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(s => {
      const src = s.getAttribute('src');
      if (src) this.initialScriptHashes.add(src);
    });
  }

  private async checkNonPwaUpdate(_manual = false): Promise<void> {
    if (this.isNotificationShown) return;

    try {
      const response = await fetch(`/index.html?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) return;

      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const newScripts = doc.querySelectorAll('script[src]');

      let versionChanged = false;
      newScripts.forEach(s => {
        const src = s.getAttribute('src');
        if (src && !this.initialScriptHashes.has(src)) {
          versionChanged = true;
        }
      });

      if (versionChanged) {
        this.showUpdateNotification();
      }
    } catch {
      // Ignore network errors
    }
  }

  private showUpdateNotification(): void {
    if (this.isNotificationShown) return;
    this.isNotificationShown = true;

    this.messageService.add({
      severity: 'info',
      summary: 'Update Available',
      detail: 'A new version of Financial Planner is available.',
      sticky: true,
      closable: true,
      key: 'pwa-update',
      data: { action: 'reload' }
    });
  }

  /** Reload the page to activate the new version */
  activateUpdate(): void {
    document.location.reload();
  }
}
