import { Component, inject, Input } from '@angular/core';

import { AbstractControl } from '@angular/forms';
import { ValidationService } from '../../../core/services/validation.service';

@Component({
    selector: 'app-form-field',
    standalone: true,
    imports: [],
    templateUrl: './form-field.html',
  })
export class FormField {
    @Input() label: string = '';
    @Input() inputId: string = '';
    @Input() control?: AbstractControl | null; // Optional: Pass control explicitly

    // If control is not passed, try to find it from projected content? 
    // Easier to just pass it or rely on a helper. 
    // But standard way is to pass `control` input.

    validationService = inject(ValidationService);

    get errorMessage(): string {
        if (this.control) {
            return this.validationService.getErrorMessage(this.control);
        }
        return '';
    }
}
