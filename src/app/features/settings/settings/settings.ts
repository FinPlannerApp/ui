import { Component, inject, Inject, PLATFORM_ID, computed, signal, OnInit } from '@angular/core';
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

const PREFERENCES_KEY = 'finplanner_user_preferences';

export interface UserPreferences {
  emailAlerts: boolean;
  obligationReminders: boolean;
  weeklyDigest: boolean;
  preferredCurrency: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  providers: [ConfirmationService],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  public themeEngine = inject(ThemeEngine);
  private authService = inject(Auth);
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private isBrowser: boolean;

  // Active section view mode (for responsive desktop sidebar / mobile tabs)
  activeSection = signal<'profile' | 'appearance' | 'preferences' | 'data' | 'system'>('profile');

  profile = {
    name: '',
    email: ''
  };

  isSavingProfile = signal(false);

  // Preference signals
  emailAlerts = signal(true);
  obligationReminders = signal(true);
  weeklyDigest = signal(true);
  preferredCurrency = signal('INR');

  currencyOptions = [
    { label: '₹ INR (Indian Rupee)', value: 'INR' },
    { label: '$ USD (US Dollar)', value: 'USD' },
    { label: '€ EUR (Euro)', value: 'EUR' },
    { label: '£ GBP (British Pound)', value: 'GBP' }
  ];

  /* SelectButton option arrays for theme pickers */
  themeOptions = this.themeEngine.themes.map(t => ({ label: t.label, value: t.id, icon: t.icon }));
  effectOptions = this.themeEngine.effects.map(e => ({ label: e.label, value: e.id, icon: e.icon }));
  presetOptions = this.themeEngine.presets.map(p => ({ label: p.label, value: p.id, icon: p.icon }));

  userInitials = computed(() => {
    const name = this.profile.name || this.profile.email || 'User';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);

    const name = this.authService.currentUser();
    const email = this.authService.currentUserEmail();
    if (name) this.profile.name = name;
    if (email) this.profile.email = email;
  }

  ngOnInit(): void {
    this.loadPreferences();
  }

  private loadPreferences(): void {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY);
      if (raw) {
        const prefs: UserPreferences = JSON.parse(raw);
        if (prefs.emailAlerts !== undefined) this.emailAlerts.set(prefs.emailAlerts);
        if (prefs.obligationReminders !== undefined) this.obligationReminders.set(prefs.obligationReminders);
        if (prefs.weeklyDigest !== undefined) this.weeklyDigest.set(prefs.weeklyDigest);
        if (prefs.preferredCurrency) this.preferredCurrency.set(prefs.preferredCurrency);
      }
    } catch {
      // Fallback defaults
    }
  }

  savePreferences(): void {
    if (!this.isBrowser) return;
    try {
      const prefs: UserPreferences = {
        emailAlerts: this.emailAlerts(),
        obligationReminders: this.obligationReminders(),
        weeklyDigest: this.weeklyDigest(),
        preferredCurrency: this.preferredCurrency()
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
      this.notificationService.showSuccess('Preferences saved.');
    } catch {
      this.notificationService.showError('Failed to save preferences.');
    }
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

  async saveProfile(): Promise<void> {
    if (!this.profile.name.trim()) {
      this.notificationService.showError('Display name cannot be empty.');
      return;
    }
    this.isSavingProfile.set(true);
    try {
      // Simulate profile update or integrate API
      await new Promise(resolve => setTimeout(resolve, 300));
      this.notificationService.showSuccess('Profile information saved.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to save profile.');
    } finally {
      this.isSavingProfile.set(false);
    }
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

  clearLocalCache(): void {
    this.confirmationService.confirm({
      header: 'Clear Local App Cache',
      message: 'This will reset your local display preferences and clear temporary UI cache. Your account data will remain completely safe. Continue?',
      icon: 'pi pi-trash',
      accept: () => {
        if (this.isBrowser) {
          const token = localStorage.getItem('auth_token');
          const refresh = localStorage.getItem('refresh_token');
          localStorage.clear();
          if (token) localStorage.setItem('auth_token', token);
          if (refresh) localStorage.setItem('refresh_token', refresh);
          this.notificationService.showSuccess('Local cache cleared. Reloading page...');
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    });
  }

  logout(): void {
    this.confirmationService.confirm({
      header: 'Sign Out',
      message: 'Are you sure you want to sign out of FinPlanner?',
      icon: 'pi pi-power-off',
      accept: () => {
        this.authService.logout();
      }
    });
  }
}
