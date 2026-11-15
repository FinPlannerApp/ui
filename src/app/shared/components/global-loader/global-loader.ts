import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

/**
 * The one loader for the whole app: a spinner in the middle of the screen while anything is loading or saving.
 * Pages and components do not draw their own. While a save runs it also blocks clicks; while reading it does not.
 */
@Component({
  selector: 'app-global-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading.visible()) {
      <div class="global-loader" [class.is-blocking]="loading.isMutating()" role="status" aria-live="polite">
        <div class="global-loader-card">
          <span class="global-loader-ring" aria-hidden="true"></span>
          <span class="global-loader-label">{{ loading.label() }}</span>
        </div>
      </div>
    }
  `,
})
export class GlobalLoader {
  protected readonly loading = inject(LoadingService);
}
