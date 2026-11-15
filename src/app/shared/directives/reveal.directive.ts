import { Directive, ElementRef, OnDestroy, OnInit, inject, input, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Scroll-reveal: adds `.is-in` when the element enters the viewport (once).
 * Pair with the `.reveal` / `.reveal-*` classes in public.css. Without IntersectionObserver or with
 * prefers-reduced-motion the element is shown immediately.
 */
@Directive({ selector: '[appReveal]', standalone: true })
export class RevealDirective implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private platform = inject(PLATFORM_ID);
  /** Stagger delay in ms. */
  appReveal = input<number | string>('');
  private io?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.el.nativeElement;
    node.classList.add('reveal');
    const d = this.appReveal();
    if (d !== '' && d !== null) node.style.setProperty('--reveal-delay', `${d}ms`);
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isPlatformBrowser(this.platform) || reduced || typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-in');
      return;
    }
    this.io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          node.classList.add('is-in');
          this.io?.disconnect();
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    this.io.observe(node);
  }

  ngOnDestroy(): void { this.io?.disconnect(); }
}

/** Counts a number up when it scrolls into view. `<span [appCountUp]="84000" prefix="₹"></span>` */
@Directive({ selector: '[appCountUp]', standalone: true })
export class CountUpDirective implements OnInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  appCountUp = input.required<number>();
  prefix = input('');
  suffix = input('');
  duration = input(1400);
  private io?: IntersectionObserver;
  private raf = 0;

  private fmt(n: number): string {
    return this.prefix() + Math.round(n).toLocaleString('en-IN') + this.suffix();
  }

  ngOnInit(): void {
    const node = this.el.nativeElement;
    const target = this.appCountUp();
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.textContent = this.fmt(reduced || typeof IntersectionObserver === 'undefined' ? target : 0);
    if (reduced || typeof IntersectionObserver === 'undefined') return;
    this.io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      this.io?.disconnect();
      const start = performance.now(), dur = this.duration();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = this.fmt(target * eased);
        if (p < 1) this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    this.io.observe(node);
  }

  ngOnDestroy(): void { this.io?.disconnect(); cancelAnimationFrame(this.raf); }
}

/** Cursor-following glow for cards: sets --mx / --my on the element (see .pub-tile::before). */
@Directive({
  selector: '[appSpotlight]',
  standalone: true,
  host: { '(mousemove)': 'move($event)' },
})
export class SpotlightDirective {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  move(e: MouseEvent): void {
    const r = this.el.nativeElement.getBoundingClientRect();
    this.el.nativeElement.style.setProperty('--mx', `${e.clientX - r.left}px`);
    this.el.nativeElement.style.setProperty('--my', `${e.clientY - r.top}px`);
  }
}
