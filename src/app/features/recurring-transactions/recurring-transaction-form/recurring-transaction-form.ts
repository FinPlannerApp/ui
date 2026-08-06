import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { ValidationService } from '../../../core/services/validation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FormField } from '../../../shared/components/form-field/form-field';
import { RecurrenceFrequency, RecurrenceDayOfWeek } from '../../../core/models/recurring-transaction.model';
import { CommonModule } from '@angular/common';
import { GenericCrud } from '../../../core/services/generic-crud';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
    selector: 'app-recurring-transaction-form',
    imports: [CommonModule, ReactiveFormsModule, FormField, ...sharedPrimeModules],
    templateUrl: './recurring-transaction-form.html',
    styleUrl: './recurring-transaction-form.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecurringTransactionForm implements OnInit {
    // Exposes the enum to the template so it can check
    // "frequency === RecurrenceFrequency.Custom" instead of a magic number.
    readonly RecurrenceFrequency = RecurrenceFrequency;

    recurringForm: FormGroup;
    isSubmitting = signal(false);
    accounts = signal<any[]>([]);
    categories = signal<any[]>([]);

    frequencies = [
        { label: 'Daily', value: RecurrenceFrequency.Daily },
        { label: 'Weekly', value: RecurrenceFrequency.Weekly },
        { label: 'Monthly', value: RecurrenceFrequency.Monthly },
        { label: 'Yearly', value: RecurrenceFrequency.Yearly },
        { label: 'Custom days...', value: RecurrenceFrequency.Custom }
    ];

    types = [
        { label: 'Expense', value: 1 },
        { label: 'Income', value: 0 }
    ];

    // Monday-first, matching the backend's own week-start convention
    // (AppTimeZone.WeekBoundsUtc uses ISO-8601 Monday-start weeks) rather
    // than copying Google Calendar's locale-dependent Sunday-first display —
    // consistency with how the backend actually interprets "the week"
    // matters more here than matching a specific reference product exactly.
    dayOptions: { label: string; value: RecurrenceDayOfWeek }[] = [
        { label: 'M', value: RecurrenceDayOfWeek.Monday },
        { label: 'T', value: RecurrenceDayOfWeek.Tuesday },
        { label: 'W', value: RecurrenceDayOfWeek.Wednesday },
        { label: 'T', value: RecurrenceDayOfWeek.Thursday },
        { label: 'F', value: RecurrenceDayOfWeek.Friday },
        { label: 'S', value: RecurrenceDayOfWeek.Saturday },
        { label: 'S', value: RecurrenceDayOfWeek.Sunday }
    ];

    // Which individual days are toggled on — the combined bitmask sent to
    // the backend is derived from this, not stored directly as form state,
    // since toggling one day shouldn't require manually recomputing the
    // whole mask by hand in the template.
    selectedDays = signal<Set<RecurrenceDayOfWeek>>(new Set());

    validationService = inject(ValidationService);
    private apiService = inject(GenericApi);
    private notificationService = inject(NotificationService);
    private crudService = inject(GenericCrud<any>);
    private cdr = inject(ChangeDetectorRef);
    private fb = inject(FormBuilder);
    public ref = inject(DynamicDialogRef);
    public config = inject(DynamicDialogConfig);

    constructor() {
        this.recurringForm = this.fb.group({
            id: [null],
            accountId: [null, Validators.required],
            transactionCategoryId: [null],
            description: ['', Validators.required],
            amount: [null, [Validators.required, Validators.min(0.01)]],
            type: [1, Validators.required],
            frequency: [RecurrenceFrequency.Monthly, Validators.required],
            startDate: [new Date(), Validators.required],
            endDate: [null],
            isActive: [true]
        });
    }

    async ngOnInit(): Promise<void> {
        try {
            const [accountsRes, categoriesRes] = await Promise.all([
                firstValueFrom(this.apiService.post<any>('Accounts/search', { pageNumber: 1, pageSize: 100 })),
                firstValueFrom(this.apiService.post<any>('TransactionCategories/search', { pageNumber: 1, pageSize: 100 }))
            ]);

            if (accountsRes.isSuccess) this.accounts.set(accountsRes.value.data);
            if (categoriesRes.isSuccess) this.categories.set(categoriesRes.value.data);
            this.cdr.markForCheck();
        } catch (err) {
            this.notificationService.showError('Failed to prepare form.');
        }

        if (this.config.data?.itemToEdit) {
            const item = { ...this.config.data.itemToEdit };
            if (item.startDate) item.startDate = new Date(item.startDate);
            if (item.endDate) item.endDate = new Date(item.endDate);
            this.recurringForm.patchValue(item);

            // Decompose the stored bitmask back into individual toggle
            // states — the form only holds the combined number, the picker
            // UI needs to know which specific days that number represents.
            if (item.frequency === RecurrenceFrequency.Custom && item.customDays) {
                const days = new Set<RecurrenceDayOfWeek>();
                for (const option of this.dayOptions) {
                    if ((item.customDays & option.value) !== 0) {
                        days.add(option.value);
                    }
                }
                this.selectedDays.set(days);
            }
        }
    }

    isDaySelected(day: RecurrenceDayOfWeek): boolean {
        return this.selectedDays().has(day);
    }

    toggleDay(day: RecurrenceDayOfWeek): void {
        const current = new Set(this.selectedDays());
        if (current.has(day)) {
            current.delete(day);
        } else {
            current.add(day);
        }
        this.selectedDays.set(current);
    }

    private computeCustomDaysBitmask(): number {
        let mask = 0;
        for (const day of this.selectedDays()) {
            mask |= day;
        }
        return mask;
    }

    async onSubmit(): Promise<void> {
        if (this.recurringForm.invalid) {
            this.recurringForm.markAllAsTouched();
            return;
        }

        const isCustom = this.recurringForm.get('frequency')?.value === RecurrenceFrequency.Custom;
        if (isCustom && this.selectedDays().size === 0) {
            this.notificationService.showError('Select at least one day for a custom recurrence.');
            return;
        }

        if (!this.isSubmitting()) {
            this.isSubmitting.set(true);
            const payload = {
                ...this.recurringForm.getRawValue(),
                // Only meaningful for Custom — explicitly null otherwise,
                // so switching away from Custom on an edit correctly clears
                // any previously-set days rather than leaving stale data.
                customDays: isCustom ? this.computeCustomDaysBitmask() : null
            };
            const endpoint = 'RecurringTransactions';

            try {
                await this.crudService.upsert(endpoint, payload);
                this.notificationService.showSuccess('Recurring transaction saved');
                this.ref.close(true);
            } catch (err: any) {
                this.notificationService.showError(err.message || 'Error occurred');
                this.isSubmitting.set(false);
            }
        }
    }
}
