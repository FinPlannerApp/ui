import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, finalize, map, shareReplay, Observable } from 'rxjs';
import { Auth } from '../services/auth';

/** Endpoints whose 401 must NOT trigger a token refresh (they are part of signing in/out themselves). */
const AUTH_ENDPOINTS = /\/auth\/(login|refresh|logout|register|verify-registration|forgot-password|verify-otp|reset-password|check-email|check-username)/i;

/**
 * The single in-flight refresh, shared by every request that hits a 401 meanwhile.
 * Success: all of them get the new token. Failure: all of them get the error (nobody waits forever),
 * and Auth.refreshToken() has already signed the user out exactly once.
 */
let refreshInFlight$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const accessToken = authService.accessToken();

  if (accessToken) {
    req = addToken(req, accessToken);
  }

  return next(req).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !AUTH_ENDPOINTS.test(req.url)) {
        return refreshAccessToken(authService).pipe(
          switchMap(token => next(addToken(req, token)))
        );
      }
      return throwError(() => error);
    })
  );
};

const addToken = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });

const refreshAccessToken = (authService: Auth): Observable<string> => {
  if (!refreshInFlight$) {
    refreshInFlight$ = authService.refreshToken().pipe(
      map(success => {
        const token = authService.accessToken();
        if (!success || !token) throw new Error('Session expired');
        return token;
      }),
      finalize(() => { refreshInFlight$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }
  return refreshInFlight$;
};
