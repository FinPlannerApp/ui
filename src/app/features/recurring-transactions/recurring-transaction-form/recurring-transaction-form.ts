import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed, ChangeDetectorRef } from '@angular/core';
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

import { toDateOnlyString, fromDateOnlyString } from '../../../core/utils/date-utils';

@Component({
    selector: 'app-recurring-transaction-form',
    imports: [CommonModule, ReactiveFormsModule, FormField, ...sharedPrimeModules],
    templateUrl: './recurring-transaction-form.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
      .day-toggle {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.5rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-muted, #9ca3af);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .day-toggle:hover {
        background: rgba(255, 255, 255, 0.1);
      }
      .day-toggle-selected {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(16, 185, 129, 0.5);
        color: rgb(52, 211, 153);
      }
    `]
})
export class RecurringTransactionForm implements OnInit {
    // Exposes the enum to the template so it can check
    // "frequency === RecurrenceFrequency.Custom" instead of a magic number.
    readonly RecurrenceFrequency = RecurrenceFrequency;

    recurringForm: FormGroup;
    isSubmitting = signal(false);
    accounts = signal<any[]>([]);
    categories = signal<any[]>([]);

    loanAccounts = computed(() =>
        this.accounts().filter(a => a.accountType === 2 || a.accountCategory?.accountType === 2 || a.loanDetails != null || a.isLiability)
    );

    frequencies = [
        { label: 'One-time', value: RecurrenceFrequency.OneTime },
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
            isObligation: [false],
            isLoanEmi: [false],
            linkedLoanAccountId: [null],
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
            if (item.startDate) item.startDate = fromDateOnlyString(item.startDate) ?? new Date(item.startDate);
            if (item.endDate) item.endDate = fromDateOnlyString(item.endDate) ?? new Date(item.endDate);
            if (item.linkedLoanAccountId) item.isLoanEmi = true;
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

        const formVal = this.recurringForm.getRawValue();
        const isExpense = formVal.type === 1;
        const isLoanEmi = formVal.isLoanEmi;

        if (isExpense && isLoanEmi && !formVal.linkedLoanAccountId) {
            this.notificationService.showError('Please select a loan account for this EMI payment.');
            return;
        }

        if (!this.isSubmitting()) {
            this.isSubmitting.set(true);
            const payload = {
                ...formVal,
                startDate: toDateOnlyString(formVal.startDate),
                endDate: toDateOnlyString(formVal.endDate),
                // Only meaningful for Custom — explicitly null otherwise
                customDays: isCustom ? this.computeCustomDaysBitmask() : null,
                linkedLoanAccountId: (isExpense && isLoanEmi) ? formVal.linkedLoanAccountId : null
            };
            delete payload.isLoanEmi;
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
