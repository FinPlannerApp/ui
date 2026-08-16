import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { sharedPrimeModules } from '../prime-imports';

export type EmptyStateVariant = 'empty' | 'error' | 'offline';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ...sharedPrimeModules],
  templateUrl: './empty-state.html'
})
export class EmptyState {
  variant = input<EmptyStateVariant>('empty');
  icon = input<string>('pi pi-inbox');
  title = input<string>('Nothing here yet');
  message = input<string>('');
  actionLabel = input<string | null>(null);

  action = output<void>();
}
