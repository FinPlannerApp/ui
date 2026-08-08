import { Directive, ElementRef, AfterViewInit, OnDestroy, inject, NgZone } from '@angular/core';

@Directive({
  selector: '[appAutoMarquee]',
  standalone: true
})
export class AutoMarqueeDirective implements AfterViewInit, OnDestroy {
  private el = inject(ElementRef);
  private ngZone = inject(NgZone);
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    // Run outside Angular zone to prevent unnecessary change detection cycles
    this.ngZone.runOutsideAngular(() => {
      const elem = this.el.nativeElement as HTMLElement;
      
      // Delay slightly for initial DOM layout rendering
      setTimeout(() => this.checkOverflow(elem), 50);

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.checkOverflow(elem);
        });
        const target = elem.parentElement || elem;
        this.resizeObserver.observe(target);
      }
    });
  }

  private checkOverflow(elem: HTMLElement): void {
    const parent = elem.parentElement;
    if (!parent) return;

    // Compare text scroll width against parent container client width
    const isOverflowing = elem.scrollWidth > (parent.clientWidth + 4);
    if (isOverflowing) {
      elem.classList.add('is-overflowing');
    } else {
      elem.classList.remove('is-overflowing');
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
