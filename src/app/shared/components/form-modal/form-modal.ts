import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-form-modal',
  standalone: true,
  imports: [CommonModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './form-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormModal {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() submitLabel: string = 'Save';
  @Input() submitIcon: string = 'pi pi-check';
  @Input() submitSeverity: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast' = 'primary';
  @Input() cancelLabel: string = 'Cancel';
  @Input() isSubmitting: boolean = false;
  @Input() isInvalid: boolean = false;

  @Output() onSubmit = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  submit(): void {
    if (!this.isSubmitting && !this.isInvalid) {
      this.onSubmit.emit();
    }
  }

  cancel(): void {
    this.onCancel.emit();
  }
}
