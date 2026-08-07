import { isPlatformBrowser } from '@angular/common';
import { computed, effect, Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { usePreset } from '@primeng/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import Material from '@primeuix/themes/material';
import {
  type ThemeOption,
  type BackgroundEffect,
  type PrimePreset,
  type ThemeConfig,
  THEME_STORAGE_KEY,
} from '../models/theme.model';

/**
 * Generic, signal-based Theme Engine.
 *
 * Manages three independent axes of theming:
 *   1. Color Theme   – light, dark, glassmorphic, midnight-blue  (CSS custom-property sets)
 *   2. Background FX – floating orbs, gradient wave, aurora, none (CSS animation classes)
 *   3. PrimeNG Preset – Aura, Lara, Nora, Material               (runtime token swap)
 *
 * Adding a new option is data-driven: push an entry into the corresponding array.
 * The engine persists the full config to localStorage (and later to a backend API).
 */
@Injectable({ providedIn: 'root' })
export class ThemeEngine {
  private readonly isBrowser: boolean;

  /* ------------------------------------------------------------------ */
  /*  Reactive state                                                     */
  /* ------------------------------------------------------------------ */
  readonly currentThemeId = signal<string>('light');
  readonly currentEffectId = signal<string>('floating-orbs');
  readonly currentPresetId = signal<string>('aura');
  readonly isCompact = signal<boolean>(false);

  /* ------------------------------------------------------------------ */
  /*  Derived / computed                                                 */
  /* ------------------------------------------------------------------ */
  readonly currentTheme = computed<ThemeOption>(
    () => this.themes.find((t) => t.id === this.currentThemeId()) ?? this.themes[0],
  );

  readonly isDark = computed<boolean>(() => this.currentTheme().mode === 'dark');

  readonly currentEffect = computed<BackgroundEffect>(
    () => this.effects.find((e) => e.id === this.currentEffectId()) ?? this.effects[0],
  );

  readonly currentPreset = computed<PrimePreset>(
    () => this.presets.find((p) => p.id === this.currentPresetId()) ?? this.presets[0],
  );

  /* ------------------------------------------------------------------ */
  /*  Available options  (extend these arrays to add new themes)         */
  /* ------------------------------------------------------------------ */
  readonly themes: ThemeOption[] = [
    { id: 'light', label: 'Light', icon: 'pi pi-sun', mode: 'light' },
    { id: 'dark', label: 'Dark', icon: 'pi pi-moon', mode: 'dark' },
    { id: 'glassmorphic', label: 'Glass', icon: 'pi pi-sparkles', mode: 'dark' },
    { id: 'midnight-blue', label: 'Midnight Blue', icon: 'pi pi-star', mode: 'dark' },
  ];

  readonly effects: BackgroundEffect[] = [
    { id: 'floating-orbs', label: 'Floating Orbs', icon: 'pi pi-circle', cssClass: 'effect-orbs' },
    { id: 'gradient-wave', label: 'Gradient Wave', icon: 'pi pi-chart-line', cssClass: 'effect-wave' },
    { id: 'aurora', label: 'Aurora Borealis', icon: 'pi pi-palette', cssClass: 'effect-aurora' },
    { id: 'none', label: 'Clean (No Effect)', icon: 'pi pi-minus', cssClass: 'effect-none' },
  ];

  readonly presets: PrimePreset[] = [
    { id: 'aura', label: 'Aura', icon: 'pi pi-palette' },
    { id: 'lara', label: 'Lara', icon: 'pi pi-palette' },
    { id: 'nora', label: 'Nora', icon: 'pi pi-palette' },
    { id: 'material', label: 'Material', icon: 'pi pi-palette' },
  ];

  /** Maps preset IDs → the actual PrimeNG preset objects */
  private readonly presetMap: Record<string, Record<string, unknown>> = {
    aura: Aura as Record<string, unknown>,
    lara: Lara as Record<string, unknown>,
    nora: Nora as Record<string, unknown>,
    material: Material as Record<string, unknown>,
  };

  /* ------------------------------------------------------------------ */
  /*  Constructor                                                        */
  /* ------------------------------------------------------------------ */
  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.restoreConfig();

    /* React to any signal change → apply to DOM + persist */
    effect(() => {
      this.applyTheme(this.currentThemeId());
      this.applyEffect(this.currentEffectId());
      this.applyCompact(this.isCompact());
      this.persistConfig();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  /** Switch to a color theme by ID */
  setTheme(themeId: string): void {
    if (this.themes.some((t) => t.id === themeId)) {
      this.currentThemeId.set(themeId);
    }
  }

  /** Switch the background effect by ID */
  setEffect(effectId: string): void {
    if (this.effects.some((e) => e.id === effectId)) {
      this.currentEffectId.set(effectId);
    }
  }

  /** Switch the PrimeNG component preset by ID */
  setPreset(presetId: string): void {
    if (this.presets.some((p) => p.id === presetId) && this.presetMap[presetId]) {
      this.currentPresetId.set(presetId);
      usePreset(this.presetMap[presetId] as Record<string, unknown>);
      this.persistConfig();
    }
  }

  /** Quick toggle between light ↔ dark */
  toggleDarkMode(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  /** Toggle compact view mode */
  setCompact(enabled: boolean): void {
    this.isCompact.set(enabled);
  }

  /** Snapshot current config (for saving to backend later) */
  getConfig(): ThemeConfig {
    return {
      themeId: this.currentThemeId(),
      effectId: this.currentEffectId(),
      presetId: this.currentPresetId(),
      isCompact: this.isCompact(),
    };
  }

  /** Restore from a full config object (e.g. loaded from backend API) */
  loadConfig(config: Partial<ThemeConfig>): void {
    if (config.themeId) this.setTheme(config.themeId);
    if (config.effectId) this.setEffect(config.effectId);
    if (config.presetId) this.setPreset(config.presetId);
    if (config.isCompact !== undefined) this.setCompact(config.isCompact);
  }

  /* ------------------------------------------------------------------ */
  /*  DOM application (private)                                          */
  /* ------------------------------------------------------------------ */

  private applyTheme(themeId: string): void {
    if (!this.isBrowser) return;
    const html = document.documentElement;

    /* Set data-theme attribute for CSS variable scoping */
    html.setAttribute('data-theme', themeId);

    /* Toggle PrimeNG dark-mode selector */
    const theme = this.themes.find((t) => t.id === themeId);
    if (theme?.mode === 'dark') {
      html.classList.add('my-app-dark');
    } else {
      html.classList.remove('my-app-dark');
    }
  }

  private applyEffect(effectId: string): void {
    if (!this.isBrowser) return;
    const body = document.body;

    /* Remove all effect classes, then add the active one */
    this.effects.forEach((e) => body.classList.remove(e.cssClass));
    const fx = this.effects.find((e) => e.id === effectId);
    if (fx) {
      body.classList.add(fx.cssClass);
    }
  }

  private applyCompact(enabled: boolean): void {
    if (!this.isBrowser) return;
    document.body.classList.toggle('compact-view', enabled);
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */

  private persistConfig(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(this.getConfig()));
    } catch {
      /* localStorage may be unavailable (private browsing, quota) */
    }
  }

  private restoreConfig(): void {
    if (!this.isBrowser) return;
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw) {
        const config: ThemeConfig = JSON.parse(raw);
        /* Set signals without triggering the effect multiple times –
           the effect batches reads automatically via Angular signals */
        if (config.themeId && this.themes.some((t) => t.id === config.themeId)) {
          this.currentThemeId.set(config.themeId);
        }
        if (config.effectId && this.effects.some((e) => e.id === config.effectId)) {
          this.currentEffectId.set(config.effectId);
        }
        if (config.presetId && this.presetMap[config.presetId]) {
          this.currentPresetId.set(config.presetId);
          usePreset(this.presetMap[config.presetId] as Record<string, unknown>);
        }
        if (config.isCompact !== undefined) {
          this.isCompact.set(config.isCompact);
        }
      } else {
        /* No saved config → detect system preference */
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentThemeId.set(prefersDark ? 'dark' : 'light');
      }
    } catch {
      /* Corrupted or unavailable storage — use defaults */
    }
  }
}
