import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors, withXsrfConfiguration, HttpClient } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { statusInterceptor } from './core/interceptors/status-interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { DialogService } from 'primeng/dynamicdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Auth } from './core/services/auth';
import { firstValueFrom } from 'rxjs';

import { SessionSyncService } from './core/services/session-sync.service';
import { IdleTimerService } from './core/services/idle-timer.service';
import { environment } from '../environments/environment';
import { catchError, from, of, switchMap } from 'rxjs';
import { BackendStatusService } from './core/services/backend-status.service';
import { provideServiceWorker } from '@angular/service-worker';

function initializeApp(
  auth: Auth,
  sessionSync: SessionSyncService,
  http: HttpClient,
  idleTimer: IdleTimerService,
  backendStatus: BackendStatusService
) {
  return () => {
    // Block bootstrap until the backend is verified ready
    return backendStatus.ensureBackendReady().then(isReady => {
      if (!isReady) {
        // Let the app boot so the "Server Connection Required" dialog is shown
        return true;
      }

      // Rest of initialization runs only after backend is ready
      return firstValueFrom(
        sessionSync.checkLockState().pipe(
          switchMap(isLocked => {
            if (isLocked) return of(true);

            return auth.restoreSession().pipe(
              switchMap(sessionRestored => {
                const csrfUrl = `${environment.apiBaseUrl}/antiforgery/token`;
                return http.get(csrfUrl).pipe(
                  catchError(() => of(null)), // Don't crash if CSRF fails
                  switchMap(() => {
                    if (sessionRestored && auth.isLoggedIn()) {
                      idleTimer.startMonitoring();
                    }
                    return of(true);
                  })
                );
              })
            );
          })
        )
      ).catch(() => true); // Ensure the app always boots even if session restore has errors
    });
  };
}

import { loadingInterceptor } from './core/interceptors/loading-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor, statusInterceptor]),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN'
      })
    ),
    provideAnimationsAsync(),
    MessageService,
    DialogService,
    ConfirmationService,
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.my-app-dark'
        }
      },
      zIndex: {
        modal: 2000,
        overlay: 2000,
        menu: 2000,
        tooltip: 2000
      }
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [Auth, SessionSyncService, HttpClient, IdleTimerService, BackendStatusService],
      multi: true
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
