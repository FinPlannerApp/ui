import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Category } from '../../categories/category';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ValidationService } from '../../../core/services/validation.service';
import { GenericCrud } from '../../../core/services/generic-crud';
import { NotificationService } from '../../../core/services/notification.service';
import { FormField } from '../../../shared/components/form-field/form-field';
import { AccountType } from '../../../core/models/account-type.model';

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, FormField, ...sharedPrimeModules],
  templateUrl: './category-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryForm implements OnInit {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  public validationService = inject(ValidationService);
  private crudService = inject(GenericCrud<any>);
  private notificationService = inject(NotificationService);
  private categoryService = inject(Category);

  categoryForm: FormGroup;
  isTransactionCategory = signal(false); // To know when to show the transfer checkbox
  isSubmitting = signal<boolean>(false);

  accountTypeOptions = [
    { label: 'Bank / Savings', value: AccountType.Bank },
    { label: 'Credit Card', value: AccountType.CreditCard },
    { label: 'Loan', value: AccountType.Loan },
    { label: 'Cash', value: AccountType.Cash },
    { label: 'Other', value: AccountType.Other }
  ];

  existingCategoryNames = signal<string[]>([]);

  // Compares against existing names after stripping case, punctuation,
  // and simple trailing-s pluralization — "BANK", "bank", and "banks"
  // all normalize to the same thing. Deliberately simple rather than a
  // full pluralization engine (categories tend to be short, common
  // words — "Bank"/"Card"/"Wallet" — not the kind of vocabulary where
  // irregular plurals come up).
  private normalizeForComparison(name: string): string {
    let normalized = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.endsWith('ies') && normalized.length > 3) {
      normalized = normalized.slice(0, -3) + 'y';
    } else if (normalized.endsWith('s') && !normalized.endsWith('ss') && normalized.length > 1) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  }

  possibleDuplicate = computed(() => {
    const typed = this.categoryForm?.get('name')?.value?.trim();
    if (!typed || typed.length < 2) return null;

    const normalizedTyped = this.normalizeForComparison(typed);

    // Skip comparing against itself when editing an existing category.
    const match = this.existingCategoryNames().find((existingName) =>
      this.normalizeForComparison(existingName) === normalizedTyped &&
      existingName.toLowerCase() !== typed.toLowerCase() // exact matches are caught by the real uniqueness check already — only warn on the FUZZY case
    );

    return match ?? null;
  });

  constructor() {
    this.categoryForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      isTransferCategory: [false],
      // These two were missing from the live app entirely — added here
      // alongside a genuine merge with the duplicate-warning logic that
      // was already working, rather than another isolated patch.
      isLiability: [false],
      accountType: [AccountType.Other]
    });
  }

  async ngOnInit(): Promise<void> {
    // Check if we are editing a Transaction Category
    if (this.config.data?.endpoint === 'TransactionCategories') {
      this.isTransactionCategory.set(true);
      const cats = await firstValueFrom(this.categoryService.getTransactionCategories());
      this.existingCategoryNames.set(cats.map(c => c.name));
    } else {
      const cats = await firstValueFrom(this.categoryService.getAccountCategories());
      this.existingCategoryNames.set(cats.map(c => c.name));
    }

    // Patch the form if we are in edit mode
    if (this.config.data?.itemToEdit) {
      this.categoryForm.patchValue(this.config.data.itemToEdit);
    }

    // Each set of fields only makes sense for its own category type.
    if (!this.isTransactionCategory()) {
      this.categoryForm.get('isTransferCategory')?.disable();
    } else {
      this.categoryForm.get('isLiability')?.disable();
      this.categoryForm.get('accountType')?.disable();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.categoryForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      const payload = this.categoryForm.getRawValue(); // getRawValue() includes disabled fields
      const endpoint = this.config.data.endpoint;

      if (!endpoint) {
        this.notificationService.showError('Configuration Error: No endpoint provided', 'Error');
        this.isSubmitting.set(false);
        return;
      }

      try {
        await this.crudService.upsert(endpoint, payload);
        this.notificationService.showSuccess('Category saved');
        this.ref.close(true);
      } catch (err: any) {
        this.notificationService.showError(err.message || 'Failed to save category');
        this.isSubmitting.set(false);
      }
    } else {
      this.categoryForm.markAllAsTouched();
    }
  }
}
