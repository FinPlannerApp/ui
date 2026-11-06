import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { DataSync } from '../state/data-sync.service';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Writes that cannot change money numbers on the dashboard.
const IGNORED = /\/(auth|account\/(login|logout|refresh)|notifications?|feedback|admin|push|health)(\/|\?|$)/i;

/** After any successful write, ask DataSync to refresh the dashboard. */
export const dataSyncInterceptor: HttpInterceptorFn = (req, next) => {
    const sync = inject(DataSync);
    if (READ_ONLY_METHODS.has(req.method) || IGNORED.test(req.url)) {
        return next(req);
    }
    return next(req).pipe(
        tap(event => {
            if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
                sync.notifyChanged();
            }
        })
    );
};

