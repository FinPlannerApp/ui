import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './empty-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyState {
  @Input({ required: true }) icon: string = 'pi pi-inbox';
  @Input({ required: true }) title: string = 'No Data Found';
  @Input() description?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: string = 'pi pi-plus';
  @Input() actionSeverity: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast' = 'primary';
  @Input() actionText: boolean = false;
  @Output() onAction = new EventEmitter<void>();

  handleAction(): void {
    this.onAction.emit();
  }
}
