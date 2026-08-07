import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ValidationService } from '../../../core/services/validation.service';
import { GenericCrud } from '../../../core/services/generic-crud';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { FormField } from '../../../shared/components/form-field/form-field';
import { BudgetPeriod } from '../../../core/models/budget.model';
import { CommonModule } from '@angular/common';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
    selector: 'app-budget-form',
    imports: [CommonModule, ReactiveFormsModule, FormField, ...sharedPrimeModules],
    templateUrl: './budget-form.html',
      changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetForm implements OnInit {
    budgetForm: FormGroup;
    isSubmitting = signal(false);
    categories = signal<any[]>([]);

    periods = [
        { label: 'Monthly', value: BudgetPeriod.Monthly },
        { label: 'Yearly', value: BudgetPeriod.Yearly }
    ];

    validationService = inject(ValidationService);
    private crudService = inject(GenericCrud<any>);
    private apiService = inject(GenericApi);
    private notificationService = inject(NotificationService);
    private cdr = inject(ChangeDetectorRef);

    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);
    public config = inject(DynamicDialogConfig);

    constructor() {
        this.budgetForm = this.fb.group({
            id: [null],
            transactionCategoryId: [null],
            amount: [null, [Validators.required, Validators.min(0.01)]],
            period: [BudgetPeriod.Monthly, Validators.required],
            startDate: [new Date(), Validators.required],
            endDate: [null]
        });
    }

    async ngOnInit(): Promise<void> {
        // Load categories for dropdown
        try {
            const response = await firstValueFrom(this.apiService.search<any>('TransactionCategories', { pageNumber: 1, pageSize: 100 }));
            if (response.isSuccess && response.value) {
                const cats = response.value.data || [];
                // Add "All Categories" option
                cats.unshift({ id: null, name: 'All Categories' });
                this.categories.set(cats);
            }
        } catch (err) {
        }

        if (this.config.data?.itemToEdit) {
            const item = { ...this.config.data.itemToEdit };
            // Convert ISO strings to Date objects for PrimeNG DatePicker
            if (item.startDate) item.startDate = new Date(item.startDate);
            if (item.endDate) item.endDate = new Date(item.endDate);
            this.budgetForm.patchValue(item);
        }
    }

    async onSubmit(): Promise<void> {
        if (this.budgetForm.valid && !this.isSubmitting()) {
            this.isSubmitting.set(true);
            const payload = this.budgetForm.getRawValue();
            const endpoint = 'Budgets';

            try {
                await this.crudService.upsert(endpoint, payload);
                this.notificationService.showSuccess('Budget saved');
                this.ref.close(true);
            } catch (err: any) {
                this.notificationService.showError(err.message || 'Failed to save budget');
                this.isSubmitting.set(false);
            }
        } else {
            this.budgetForm.markAllAsTouched();
        }
    }
}
