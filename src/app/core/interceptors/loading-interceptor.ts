import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Exclude silent background polling endpoints if any
  const isSilent = req.url.includes('/healthz') || req.url.includes('/antiforgery/token');
  // Some reads are POSTs (search, preview, match...). They show "Loading…" and never block the screen like a save does.
  const isReadPost = /\/(search|preview|match|query|check-similar|bulk-validate|account-summary)(\/|\?|$)|-preview(\?|$)/i.test(req.url);
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase()) && !isReadPost;

  if (!isSilent) {
    loadingService.showRequest(isMutation);
  }

  return next(req).pipe(
    finalize(() => {
      if (!isSilent) {
        loadingService.hideRequest(isMutation);
      }
    })
  );
};
