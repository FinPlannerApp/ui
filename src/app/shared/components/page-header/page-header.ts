import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Standard page title row: title + optional subtitle on the left, actions (projected) on the right.
 * Wraps on phones, so every page gets the same responsive header with no per-page CSS.
 *
 *   <app-page-header title="Accounts" subtitle="All your money in one place">
 *     <p-button label="Add" />
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="cluster-between page-header">
      <div class="min-w-0">
        <h1 class="page-title">{{ title() }}</h1>
        @if (subtitle()) { <p class="page-subtitle">{{ subtitle() }}</p> }
      </div>
      <div class="cluster page-actions">
        <ng-content />
        @if (backLink()) {
          <a [routerLink]="backLink()" class="p-button p-button-text p-button-sm"><i class="pi pi-arrow-left mr-2"></i>{{ backLabel() }}</a>
        }
      </div>
    </header>
  `,
  styles: [`
    .page-title { margin: 0; font-size: var(--text-xl); font-weight: 800; color: var(--text); line-height: 1.2; }
    .page-subtitle { margin: .15rem 0 0; font-size: var(--text-sm); color: var(--text-dim); }
    .page-header { margin-bottom: var(--space-4); }
    @media (max-width: 639px) { .page-actions { width: 100%; } .page-actions > * { flex: 1 1 auto; } }
  `],
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  /** Optional "back" link shown with the actions. */
  readonly backLink = input<string>();
  readonly backLabel = input<string>('Back to Dashboard');
}
