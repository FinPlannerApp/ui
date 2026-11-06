import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DashboardState } from './dashboard-state.service';

/**
 * Single place that reacts to "the user's money data just changed".
 * Called by the HTTP interceptor after any successful write.
 * If the user is currently looking at the dashboard, it silently refreshes the numbers.
 * If the user is on another screen, it skips background dashboard calls to save Redis/API quota,
 * since navigating to the dashboard refreshes on entry anyway.
 */
@Injectable({ providedIn: 'root' })
export class DataSync {
    private dashboard = inject(DashboardState);
    private router = inject(Router);
    private timer: ReturnType<typeof setTimeout> | null = null;

    /** Debounced so a bulk import (many writes) triggers one refresh, not dozens. */
    notifyChanged(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.timer = null;
            // Only refresh if the user is currently viewing the dashboard
            if (this.dashboard.hasData && /\/dashboard\/?$/i.test(this.router.url.split('?')[0].split('#')[0])) {
                this.dashboard.refresh(true);
            }
        }, 300);
    }
}

