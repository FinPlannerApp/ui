/**
 * Theme Engine Models
 *
 * Data-driven configuration for the generic ThemeEngine service.
 * Adding a new theme/effect/preset is as simple as adding an entry
 * to the corresponding array in the ThemeEngine.
 */

/** A color theme with light/dark base mode */
export interface ThemeOption {
  id: string;
  label: string;
  icon: string;
  mode: 'light' | 'dark';
}

/** A background visual effect (animations, gradients, orbs, etc.) */
export interface BackgroundEffect {
  id: string;
  label: string;
  icon: string;
  cssClass: string;
}

/** A PrimeNG design-token preset (Aura, Lara, Nora, Material) */
export interface PrimePreset {
  id: string;
  label: string;
  icon: string;
}

/** Complete snapshot of all user theme preferences */
export interface ThemeConfig {
  themeId: string;
  effectId: string;
  presetId: string;
  isCompact: boolean;
}

/** localStorage key for persisting theme config */
export const THEME_STORAGE_KEY = 'fp-theme-config';
