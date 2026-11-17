import { environment } from '../../../../environments/environment';
import { DashboardState } from '../../../core/state/dashboard-state.service';
import { Component, inject, Inject, PLATFORM_ID, computed, signal, OnInit } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeEngine } from '../../../core/services/theme';
import { Auth, SessionDto } from '../../../core/services/auth';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { UserSettingsService } from '../../../core/services/user-settings.service';

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
  readonly appVersion = environment.appVersion;
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
  issueEmails = signal(false);
  monthStartDay = signal(1);
  isSavingMonth = signal(false);
  readonly monthStartDays = Array.from({ length: 28 }, (_, i) => ({ label: i === 0 ? '1 (calendar month)' : String(i + 1), value: i + 1 }));
  private userSettings = inject(UserSettingsService);
  private dashboardState = inject(DashboardState);

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
    void this.loadProfile();
    this.loadPreferences();
    void this.loadSessions();
  }

  // --- Signed-in devices ---

  sessions = signal<SessionDto[]>([]);
  sessionsLoading = signal(false);
  sessionsError = signal(false);
  otherSessionCount = computed(() => this.sessions().filter(s => !s.isCurrent).length);

  async loadSessions(): Promise<void> {
    if (!this.isBrowser) return;
    this.sessionsLoading.set(true);
    this.sessionsError.set(false);
    try {
      const result = await firstValueFrom(this.authService.getSessions());
      this.sessions.set(result.isSuccess && result.value ? result.value : []);
      this.sessionsError.set(!result.isSuccess);
    } catch {
      this.sessionsError.set(true);
    } finally {
      this.sessionsLoading.set(false);
    }
  }

  signOutDevice(session: SessionDto): void {
    this.confirmationService.confirm({
      header: 'Sign out this device',
      message: `Sign out ${session.device}? It will need to sign in again.`,
      icon: 'pi pi-sign-out',
      accept: async () => {
        try {
          const result = await firstValueFrom(this.authService.revokeSession(session.sessionId));
          if (result.isSuccess) {
            this.notificationService.showSuccess(`${session.device} was signed out.`);
          } else {
            this.notificationService.showInfo(result.error?.description || 'That device was already signed out.');
          }
        } catch {
          this.notificationService.showError('Could not sign out that device.');
        }
        await this.loadSessions();
      }
    });
  }

  signOutOtherDevices(): void {
    this.confirmationService.confirm({
      header: 'Sign out other devices',
      message: 'Every device except this one will be signed out and will need to sign in again. Continue?',
      icon: 'pi pi-sign-out',
      accept: async () => {
        try {
          await firstValueFrom(this.authService.revokeOtherSessions());
          this.notificationService.showSuccess('All other devices were signed out.');
        } catch {
          this.notificationService.showError('Could not sign out the other devices.');
        }
        await this.loadSessions();
      }
    });
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

  private async loadProfile(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.get<{ name: string; email: string }>('Auth/profile'));
      if (res.isSuccess && res.value) {
        if (res.value.name) this.profile.name = res.value.name;
      }
    } catch { /* keep the defaults */ }
    this.userSettings.getNotifications().then(n => { this.issueEmails.set(n.issueUpdateEmails); this.reminderEmails.set(!!n.paymentReminderEmails); this.reminderDays.set(n.reminderDaysBefore || 2); }).catch(() => { /* default: off */ });
    try {
      this.monthStartDay.set((await this.userSettings.getGeneral()).monthStartDay);
    } catch { /* keep the default (1) */ }
  }

  reminderEmails = signal(false);
  reminderDays = signal(2);
  readonly reminderDayOptions = [{ label: '1 day before', value: 1 }, { label: '2 days before', value: 2 }, { label: '3 days before', value: 3 }, { label: '5 days before', value: 5 }, { label: '7 days before', value: 7 }];

  async saveReminders(on: boolean, days: number): Promise<void> {
    const prev = { on: this.reminderEmails(), days: this.reminderDays() };
    this.reminderEmails.set(on); this.reminderDays.set(days);
    try {
      const saved = await this.userSettings.saveNotifications({ issueUpdateEmails: this.issueEmails(), paymentReminderEmails: on, reminderDaysBefore: days });
      this.reminderEmails.set(saved.paymentReminderEmails); this.reminderDays.set(saved.reminderDaysBefore);
    } catch (err: any) {
      this.reminderEmails.set(prev.on); this.reminderDays.set(prev.days);
      this.notificationService.showError(err?.message || 'Could not save.');
    }
  }

  async setIssueEmails(on: boolean): Promise<void> {
    const previous = this.issueEmails();
    this.issueEmails.set(on);
    try {
      const saved = await this.userSettings.saveNotifications({ issueUpdateEmails: on, paymentReminderEmails: this.reminderEmails(), reminderDaysBefore: this.reminderDays() });
      this.issueEmails.set(saved.issueUpdateEmails);
    } catch (err: any) {
      this.issueEmails.set(previous);
      this.notificationService.showError(err?.message || 'Could not save.');
    }
  }

  async saveMonthStart(): Promise<void> {
    this.isSavingMonth.set(true);
    try {
      const saved = await this.userSettings.saveGeneral({ monthStartDay: this.monthStartDay() });
      this.monthStartDay.set(saved.monthStartDay);
      this.dashboardState.setMonthStartDay(saved.monthStartDay);
      this.notificationService.showSuccess('Your month now starts on day ' + saved.monthStartDay + '.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Could not save.');
    } finally {
      this.isSavingMonth.set(false);
    }
  }

  // --- Change email (code is sent to the NEW address, then every device is signed out) ---
  emailChangeOpen = signal(false);
  emailChangeStep = signal<1 | 2>(1);
  emailChangeBusy = signal(false);
  newEmail = '';
  emailChangePassword = '';
  emailChangeCode = '';

  openEmailChange(): void {
    this.newEmail = '';
    this.emailChangePassword = '';
    this.emailChangeCode = '';
    this.emailChangeStep.set(1);
    this.emailChangeOpen.set(true);
  }

  async submitEmailChange(): Promise<void> {
    if (this.emailChangeBusy()) return;
    const step = this.emailChangeStep();
    if (!this.newEmail.trim() || !this.emailChangePassword) {
      this.notificationService.showError('Enter the new email and your current password.');
      return;
    }
    if (step === 2 && !this.emailChangeCode.trim()) {
      this.notificationService.showError('Enter the code we emailed you.');
      return;
    }
    this.emailChangeBusy.set(true);
    try {
      const res = await firstValueFrom(this.api.post<unknown>('Auth/update-profile', {
        name: this.profile.name.trim() || this.authService.currentUserDetails()?.name || 'User',
        newEmail: this.newEmail.trim(),
        currentPassword: this.emailChangePassword,
        emailCode: step === 2 ? this.emailChangeCode.trim() : null
      }));
      if (res.isSuccess) {
        this.notificationService.showSuccess('Email changed. Please sign in again with the new address.');
        this.emailChangeOpen.set(false);
        this.authService.logout('Email changed — sign in again.');
        return;
      }
      if (res.error?.code === 'Auth.EmailVerificationRequired') {
        this.emailChangeStep.set(2);
        this.notificationService.showSuccess('We sent a code to the new address.');
        return;
      }
      this.notificationService.showError(res.error?.description || 'Could not change the email.');
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Could not change the email.');
    } finally {
      this.emailChangeBusy.set(false);
    }
  }

  async saveProfile(): Promise<void> {
    if (!this.profile.name.trim()) {
      this.notificationService.showError('Display name cannot be empty.');
      return;
    }
    this.isSavingProfile.set(true);
    try {
      const res = await firstValueFrom(this.api.post<unknown>('Auth/update-profile', {
        name: this.profile.name.trim()
      }));
      if (!res.isSuccess) throw new Error(res.error?.description || 'Failed to save profile.');
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
          localStorage.clear(); // tokens live in memory + an HttpOnly cookie, never in localStorage
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
