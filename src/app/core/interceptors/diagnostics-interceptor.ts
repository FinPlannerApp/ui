import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { DiagnosticsService } from '../services/diagnostics.service';

/** Records method, path, status and time of each API call for bug reports. Never the body, the query string or any header. */
export const diagnosticsInterceptor: HttpInterceptorFn = (req, next) => {
  const diagnostics = inject(DiagnosticsService);
  const started = performance.now();
  const path = req.url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const record = (status: number, error?: string) =>
    diagnostics.recordCall({ at: new Date().toISOString().slice(11, 19), method: req.method, path, status, ms: Math.round(performance.now() - started), error });

  return next(req).pipe(
    tap({
      next: ev => {
        if (ev instanceof HttpResponse) {
          // The API answers 200 with isSuccess:false for business errors; keep its short error code, not the data.
          const body = ev.body as { isSuccess?: boolean; error?: { code?: string } } | null;
          record(ev.status, body && body.isSuccess === false ? body.error?.code ?? 'failed' : undefined);
        }
      },
      error: err => record(err instanceof HttpErrorResponse ? err.status : 0, err?.statusText || 'network error'),
    })
  );
};
