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

  private initPwaUpdateCheck(): void {
    // Check for update ONCE when the user turns on/launches the application
    this.swUpdate.checkForUpdate().catch(() => {});

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
    // Check ONCE on application startup
    this.checkNonPwaUpdate();
  }

  private recordInitialScriptHashes(): void {
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(s => {
      const src = s.getAttribute('src');
      if (src) this.initialScriptHashes.add(src);
    });
  }

  private async checkNonPwaUpdate(): Promise<void> {
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
