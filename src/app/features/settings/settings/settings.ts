import { Component, inject, Inject, PLATFORM_ID, computed, signal } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ThemeEngine } from '../../../core/services/theme';
import { Auth } from '../../../core/services/auth';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './settings.html',
})
export class Settings {
  public themeEngine = inject(ThemeEngine);
  private authService = inject(Auth);
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

  logout() {
    this.authService.logout();
  }
}
