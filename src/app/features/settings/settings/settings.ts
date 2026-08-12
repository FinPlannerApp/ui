import { Component, inject, Inject, PLATFORM_ID, computed, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeEngine } from '../../../core/services/theme';
import { Auth } from '../../../core/services/auth';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  providers: [ConfirmationService],
  templateUrl: './settings.html',
})
export class Settings {
  public themeEngine = inject(ThemeEngine);
  private authService = inject(Auth);
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private isBrowser: boolean;

  profile = {
    name: '',
    email: ''
  };

  /* SelectButton option arrays for the pickers */
  themeOptions = this.themeEngine.themes.map(t => ({ label: t.label, value: t.id, icon: t.icon }));
  effectOptions = this.themeEngine.effects.map(e => ({ label: e.label, value: e.id, icon: e.icon }));
  presetOptions = this.themeEngine.presets.map(p => ({ label: p.label, value: p.id, icon: p.icon }));

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    const name = this.authService.currentUser();
    const email = this.authService.currentUserEmail();
    if (name) this.profile.name = name;
    if (email) this.profile.email = email;
  }

  onThemeChange(event: { value?: string }) {
    if (event.value) this.themeEngine.setTheme(event.value);
  }

  onEffectChange(event: { value?: string }) {
    if (event.value) this.themeEngine.setEffect(event.value);
  }

  onPresetChange(event: { value?: string }) {
    if (event.value) this.themeEngine.setPreset(event.value);
  }

  onCompactChange() {
    this.themeEngine.setCompact(this.themeEngine.isCompact());
  }

  saveProfile() {
    // TODO: Implement profile save via API
  }

  async runOpeningBalanceBackfill(): Promise<void> {
    this.confirmationService.confirm({
      header: 'Backfill Opening Balances',
      message: 'This creates a real "Opening Balance" transaction on any account with a starting balance from before this feature existed. It\'s accurate and safe to run, but it will add new entries to your transaction history on old dates. Continue?',
      icon: 'pi pi-info-circle',
      accept: async () => {
        try {
          const result = await firstValueFrom(this.api.post<number>('Accounts/backfill-opening-balances', {}));
          this.notificationService.showSuccess(`Created ${result.value} opening balance transaction(s).`);
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Backfill failed.');
        }
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
