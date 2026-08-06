import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AccountCategory, Category } from '../../categories/category';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ValidationService } from '../../../core/services/validation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FormField } from '../../../shared/components/form-field/form-field';
import { AccountState } from '../../../core/state/account-state.service';
import { AccountType, InterestFrequency } from '../../../core/models/account-type.model';

@Component({
  selector: 'app-account-form',
  imports: [FormsModule, ReactiveFormsModule, ...sharedPrimeModules, FormField],
  templateUrl: './account-form.html',
  styleUrl: './account-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountForm {
  // Exposes the enum to the template — same pattern used in the custom
  // recurring days form, "frequency === RecurrenceFrequency.Custom" style.
  readonly AccountType = AccountType;

  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private categoryService = inject(Category);
  public validationService = inject(ValidationService);
  private accountState = inject(AccountState);
  private notificationService = inject(NotificationService);

  accountForm: FormGroup;
  accountCategories = signal<AccountCategory[]>([]);
  currentFilter = signal<string>('');
  isSubmitting = signal<boolean>(false);
  isEditMode = false;

  newCategoryAccountType = signal<AccountType>(AccountType.Other);

  setNewCategoryAccountType(value: any): void {
    this.newCategoryAccountType.set(value as AccountType);
  }

  accountTypeOptions = [
    { label: 'Bank / Savings', value: AccountType.Bank },
    { label: 'Credit Card', value: AccountType.CreditCard },
    { label: 'Loan', value: AccountType.Loan },
    { label: 'Cash', value: AccountType.Cash },
    { label: 'Other', value: AccountType.Other }
  ];

  interestFrequencyOptions = [
    { label: 'Monthly', value: InterestFrequency.Monthly },
    { label: 'Quarterly', value: InterestFrequency.Quarterly },
    { label: 'Yearly', value: InterestFrequency.Yearly }
  ];

  // Looks up the CURRENTLY SELECTED category's AccountType — this is what
  // actually drives which detail field group shows. Recomputes whenever
  // either the category list or the selected category changes.
  selectedAccountType = computed(() => {
    const categoryId = this.accountForm?.get('accountCategoryId')?.value;
    if (!categoryId) return null;
    const category = this.accountCategories().find(c => c.id === categoryId);
    return category?.accountType ?? null;
  });

  constructor() {
    this.accountForm = this.fb.group({
      id: [null],
      name: ['', Validators.required],
      balance: [0, [Validators.required, Validators.min(0)]],
      accountCategoryId: [null, Validators.required],

      // Credit Card fields — flat at the top level for simplicity, shaped
      // into the nested payload the backend expects only at submit time.
      creditLimit: [null],
      minimumDueAmount: [null],
      dueDate: [null],
      statementClosingDate: [null],

      // Loan fields
      principalAmount: [null],
      loanInterestRate: [null],
      emiAmount: [null],
      tenureMonths: [null],
      nextEmiDueDate: [null],
      loanStartDate: [null],

      // Bank fields
      bankInterestRate: [null],
      interestFrequency: [null]
    });

    // Recompute selectedAccountType whenever the category selection
    // changes — accountCategoryId isn't itself a signal, so this needs
    // an explicit subscription rather than relying on signal reactivity
    // alone to pick up the change.
    this.accountForm.get('accountCategoryId')?.valueChanges.subscribe(() => {
      this.accountForm.updateValueAndValidity();
    });
  }

  async ngOnInit(): Promise<void> {
    const categories = await firstValueFrom(this.categoryService.getAccountCategories());
    if (categories) {
      this.accountCategories.set(categories);
    }

    const data = this.config.data;
    if (data && data.itemToEdit) {
      this.isEditMode = true;
      const item = data.itemToEdit;
      const category = this.accountCategories().find(c => c.name === item.accountCategoryName);
      this.accountForm.patchValue({
        ...item,
        accountCategoryId: category ? category.id : null
      });

      // Decompose whichever detail object came back (at most one is
      // non-null) into the flat form controls.
      if (item.creditCardDetails) {
        this.accountForm.patchValue({
          creditLimit: item.creditCardDetails.creditLimit,
          minimumDueAmount: item.creditCardDetails.minimumDueAmount,
          dueDate: item.creditCardDetails.dueDate ? new Date(item.creditCardDetails.dueDate) : null,
          statementClosingDate: item.creditCardDetails.statementClosingDate ? new Date(item.creditCardDetails.statementClosingDate) : null
        });
      }
      if (item.loanDetails) {
        this.accountForm.patchValue({
          principalAmount: item.loanDetails.principalAmount,
          loanInterestRate: item.loanDetails.interestRate,
          emiAmount: item.loanDetails.emiAmount,
          tenureMonths: item.loanDetails.tenureMonths,
          nextEmiDueDate: item.loanDetails.nextEmiDueDate ? new Date(item.loanDetails.nextEmiDueDate) : null,
          loanStartDate: item.loanDetails.startDate ? new Date(item.loanDetails.startDate) : null
        });
      }
      if (item.bankAccountDetails) {
        this.accountForm.patchValue({
          bankInterestRate: item.bankAccountDetails.interestRate,
          interestFrequency: item.bankAccountDetails.interestFrequency
        });
      }
    }
  }

  filterCategories(event: { filter: string }): void {
    this.currentFilter.set(event.filter);
  }

  isNewCategory(): boolean {
    const filter = this.currentFilter().trim().toLowerCase();
    if (!filter) {
      return false;
    }
    return !this.accountCategories().some(c => c.name.toLowerCase() === filter);
  }

  async addNewCategory(): Promise<void> {
    let newCategoryName = this.currentFilter().trim();
    if (newCategoryName) {
      newCategoryName = newCategoryName.charAt(0).toUpperCase() + newCategoryName.slice(1);
      try {
        const newCategory = await firstValueFrom(this.categoryService.upsertAccountCategory({
          name: newCategoryName,
          accountType: this.newCategoryAccountType(),
          isLiability: this.newCategoryAccountType() === AccountType.CreditCard
                    || this.newCategoryAccountType() === AccountType.Loan
        }));
        if (newCategory) {
          this.accountCategories.update(categories => [...categories, newCategory]);
          this.accountForm.get('accountCategoryId')?.setValue(newCategory.id);
          this.currentFilter.set('');
        }
      } catch (err) {
      }
    }
  }

  private buildDetailsPayload(): any {
    const type = this.selectedAccountType();
    const raw = this.accountForm.getRawValue();

    // Matches the existing convention (see transaction-form.ts's onSubmit)
    // of explicitly calling .toISOString() rather than relying on
    // automatic Date serialization — null-safe here since every one of
    // these date fields is optional.
    const toIso = (d: Date | null): string | null => d ? d.toISOString() : null;

    return {
      creditCardDetails: type === AccountType.CreditCard ? {
        creditLimit: raw.creditLimit,
        minimumDueAmount: raw.minimumDueAmount,
        dueDate: toIso(raw.dueDate),
        statementClosingDate: toIso(raw.statementClosingDate)
      } : null,
      loanDetails: type === AccountType.Loan ? {
        principalAmount: raw.principalAmount,
        interestRate: raw.loanInterestRate,
        emiAmount: raw.emiAmount,
        tenureMonths: raw.tenureMonths,
        nextEmiDueDate: toIso(raw.nextEmiDueDate),
        startDate: toIso(raw.loanStartDate)
      } : null,
      bankAccountDetails: type === AccountType.Bank ? {
        interestRate: raw.bankInterestRate,
        interestFrequency: raw.interestFrequency
      } : null
    };
  }

  async onSubmit(): Promise<void> {
    if (this.accountForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      const payload = {
        id: this.accountForm.value.id,
        name: this.accountForm.value.name,
        balance: this.accountForm.value.balance,
        accountCategoryId: this.accountForm.value.accountCategoryId,
        ...this.buildDetailsPayload()
      };

      try {
        await this.accountState.addAccount(payload);
        this.notificationService.showSuccess('Account saved');
        this.ref.close(true);
      } catch (err: any) {
        this.notificationService.showError(err.message || 'Failed to save account');
        this.isSubmitting.set(false);
      }
    } else {
      this.accountForm.markAllAsTouched();
    }
  }
}
