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

  /**
   * Initialize update checking. Call once from the root component.
   * Listens for new service worker versions and prompts the user to reload.
   */
  initialize(): void {
    if (!this.swUpdate.isEnabled) return;

    // Listen for version ready events
    this.swUpdate.versionUpdates.pipe(
      filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY')
    ).subscribe(() => {
      this.messageService.add({
        severity: 'info',
        summary: 'Update Available',
        detail: 'A new version of Financial Planner is available.',
        sticky: true,
        closable: true,
        key: 'pwa-update',
        data: { action: 'reload' }
      });
    });

    // Also handle unrecoverable states
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

  /** Reload the page to activate the new version */
  activateUpdate(): void {
    document.location.reload();
  }
}
