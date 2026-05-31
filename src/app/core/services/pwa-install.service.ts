import { Injectable, inject, signal } from '@angular/core';


@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any = null;

  /** Whether the app can be installed (browser supports it and hasn't been installed yet) */
  canInstall = signal(false);

  /** Whether the app is already running as an installed PWA */
  isStandalone = signal(false);

  /** Whether the install prompt was dismissed by the user */
  wasDismissed = signal(false);

  constructor() {
    // Check if already running as installed PWA
    this.isStandalone.set(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.canInstall.set(true);
    });

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.isStandalone.set(true);
      this.deferredPrompt = null;
    });
  }

  /** Trigger the native install prompt */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const result = await this.deferredPrompt.userChoice;

    if (result.outcome === 'dismissed') {
      this.wasDismissed.set(true);
    }

    this.deferredPrompt = null;
    this.canInstall.set(false);
    return result.outcome === 'accepted';
  }
}
