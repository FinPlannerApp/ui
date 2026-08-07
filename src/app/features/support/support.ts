import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EditorModule } from 'primeng/editor';
import { GenericApi } from '../../core/services/generic-api';
import { sharedPrimeModules } from '../../shared/prime-imports';

@Component({
  selector: 'app-support',
  imports: [ReactiveFormsModule, EditorModule, ...sharedPrimeModules],
  templateUrl: './support.html',
  providers: [MessageService]
})
export class Support {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private apiService = inject(GenericApi);

  supportForm: FormGroup;
  submissionTypes: any[];
  isSubmitting = false;


  constructor() {
    this.supportForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      type: [null, Validators.required],
      description: ['', Validators.required]
    });

    this.submissionTypes = [
      { label: 'Report a Bug', value: 'bug' },
      { label: 'Suggest a Feature', value: 'feature' },
      { label: 'Ask a Question', value: 'question' }
    ];
  }

  async onSubmit(): Promise<void> {
    if (this.supportForm.invalid) {
      this.supportForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      // Use the standard 'upsert' method instead of 'post'
      const response = await firstValueFrom(this.apiService.upsert('Feedback', this.supportForm.value));

      if (response.isSuccess) {
        this.messageService.add({
          severity: 'success',
          summary: 'Submitted',
          detail: 'Thank you for your feedback!'
        });
        this.supportForm.reset();
      } else {
        throw new Error(response.error?.description || 'Submission failed');
      }
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not submit feedback. Please try again later.'
      });
    } finally {
      this.isSubmitting = false;
    }
  }
}
