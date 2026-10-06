import { Directive, ElementRef, NgZone, OnDestroy, effect, inject, input, output } from '@angular/core';

/**
 * Put on a sentinel element after the last list item. Emits `reachedEnd` when it nears the viewport.
 * Set [disabled]="true" while loading / when there are no more pages; when it flips back to false the
 * sentinel is re-checked, so short pages keep loading until the screen is filled.
 */
@Directive({
  selector: '[appInfiniteScroll]',
  host: { 'aria-hidden': 'true' }
})
export class InfiniteScrollDirective implements OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private observer: IntersectionObserver | null = null;

  readonly disabled = input(false);
  readonly rootMargin = input('300px');
  readonly reachedEnd = output<void>();

  constructor() {
    effect(() => {
      const disabled = this.disabled();
      const margin = this.rootMargin();
      this.disconnect();
      if (disabled || typeof IntersectionObserver === 'undefined') return;

      this.zone.runOutsideAngular(() => {
        this.observer = new IntersectionObserver(
          entries => {
            if (entries.some(e => e.isIntersecting)) {
              this.zone.run(() => this.reachedEnd.emit());
            }
          },
          { rootMargin: margin }
        );
        this.observer.observe(this.el.nativeElement);
      });
    });
  }

  private disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}