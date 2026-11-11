import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Breakpoint = 'compact' | 'medium' | 'expanded' | 'large';

/**
 * Single source of truth for "how big / what kind of screen is this".
 * Components read signals (isCompact(), isTouch()) instead of re-implementing matchMedia;
 * CSS and themes can key off <html data-bp="…" data-input="touch|pointer">.
 * Breakpoints mirror core/design/layout.css.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private doc = inject(DOCUMENT);

  readonly breakpoint = signal<Breakpoint>('expanded');
  readonly isTouch = signal(false);
  readonly reducedMotion = signal(false);

  readonly isCompact = computed(() => this.breakpoint() === 'compact');
  readonly isMedium = computed(() => this.breakpoint() === 'medium');
  readonly isMobile = computed(() => this.breakpoint() === 'compact');
  readonly isTabletUp = computed(() => this.breakpoint() !== 'compact');
  readonly isDesktop = computed(() => this.breakpoint() === 'expanded' || this.breakpoint() === 'large');

  constructor() {
    const win = this.doc.defaultView;
    if (!win?.matchMedia) return;

    const queries: Record<string, MediaQueryList> = {
      medium: win.matchMedia('(min-width: 640px)'),
      expanded: win.matchMedia('(min-width: 1024px)'),
      large: win.matchMedia('(min-width: 1440px)'),
      touch: win.matchMedia('(pointer: coarse)'),
      motion: win.matchMedia('(prefers-reduced-motion: reduce)'),
    };

    const apply = () => {
      const bp: Breakpoint = queries['large'].matches ? 'large'
        : queries['expanded'].matches ? 'expanded'
        : queries['medium'].matches ? 'medium' : 'compact';
      this.breakpoint.set(bp);
      this.isTouch.set(queries['touch'].matches);
      this.reducedMotion.set(queries['motion'].matches);
      const root = this.doc.documentElement;
      root.dataset['bp'] = bp;
      root.dataset['input'] = queries['touch'].matches ? 'touch' : 'pointer';
    };

    Object.values(queries).forEach(q => q.addEventListener('change', apply));
    apply();
  }
}
