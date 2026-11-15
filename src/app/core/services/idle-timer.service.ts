import { Injectable, inject, NgZone, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from './auth';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class IdleTimerService {
  private timeoutId?: number;
  private readonly IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes (matches backend JWT expiry)
  private readonly router = inject(Router);
  private readonly authService = inject(Auth);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  private readonly onActivity = () => this.resetTimer();
  private listening = false;

  startMonitoring() {
    if (!this.isBrowser) {
      return; // Don't run on server-side rendering
    }

    this.resetTimer();

    // Add the listeners once (this used to stack a new set on every sign-in) and remove them on stop.
    if (!this.listening) {
      this.activityEvents.forEach(event => document.addEventListener(event, this.onActivity, { passive: true }));
      this.listening = true;
    }
  }

  private resetTimer() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Run timeout outside Angular zone to avoid unnecessary change detection
    this.ngZone.runOutsideAngular(() => {
      this.timeoutId = window.setTimeout(() => {
        this.ngZone.run(() => this.handleTimeout());
      }, this.IDLE_TIMEOUT);
    });
  }

  private handleTimeout() {
    // Call backend logout API
    this.authService.logout();

    // Navigate to login with inactivity reason
    this.router.navigate(['/login'], {
      queryParams: { reason: 'inactivity' },
      replaceUrl: true
    });
  }

  stopMonitoring() {
    if (this.listening && this.isBrowser) {
      this.activityEvents.forEach(event => document.removeEventListener(event, this.onActivity));
      this.listening = false;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }
}
