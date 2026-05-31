import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Theme } from './core/services/theme';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SessionSyncService } from './core/services/session-sync.service';
import { BackendStatusService } from './core/services/backend-status.service';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PwaInstallService } from './core/services/pwa-install.service';
import { PwaUpdateService } from './core/services/pwa-update.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, DialogModule, ButtonModule, ProgressBarModule, ConfirmDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private themeService = inject(Theme);
  private sessionSync = inject(SessionSyncService);
  protected backendStatus = inject(BackendStatusService);
  protected readonly title = signal('Financial Management App');
  protected pwaInstall = inject(PwaInstallService);
  private pwaUpdate = inject(PwaUpdateService);
  private messageService = inject(MessageService);

  isSessionLocked = signal(false);

  private router = inject(Router);

  constructor() {
    // Initialize PWA update checking
    this.pwaUpdate.initialize();

    this.sessionSync.state$.subscribe(state => {
      // Don't lock session on public pages (login, register, reset-password etc)
      const isPublicPage = this.router.url.includes('/login') ||
        this.router.url.includes('/register') ||
        this.router.url.includes('/reset-password') ||
        this.router.url.includes('/forgot-password');

      if (!isPublicPage) {
        this.isSessionLocked.set(state === 'locked');
      }
    });
  }

  takeOverSession() {
    this.sessionSync.takeOver();
    this.isSessionLocked.set(false);
  }

  closeTab() {
    window.close();
    // Fallback if window.close() is blocked
    window.location.href = 'about:blank';
  }

  installPwa() {
    this.pwaInstall.promptInstall();
  }

  dismissInstall() {
    this.pwaInstall.wasDismissed.set(true);
  }

  reloadApp() {
    this.pwaUpdate.activateUpdate();
  }
}
