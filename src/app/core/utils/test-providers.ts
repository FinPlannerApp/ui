import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { provideServiceWorker } from '@angular/service-worker';

export const COMMON_TEST_PROVIDERS = [
  provideHttpClient(),
  provideHttpClientTesting(),
  provideRouter([]),
  provideAnimationsAsync(),
  provideServiceWorker('ngsw-worker.js', { enabled: false }),
  MessageService,
  ConfirmationService,
  DialogService,
  { provide: DynamicDialogRef, useValue: { close: () => {} } },
  { provide: DynamicDialogConfig, useValue: { data: {} } },
  providePrimeNG({
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: '.my-app-dark'
      }
    }
  })
];
