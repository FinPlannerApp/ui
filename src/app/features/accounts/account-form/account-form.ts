import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AccountCategory, Category } from '../../categories/category';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { ValidationService } from '../../../core/services/validation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { FormField } from '../../../shared/components/form-field/form-field';
import { AccountState } from '../../../core/state/account-state.service';
import { AccountType, InterestFrequency } from '../../../core/models/account-type.model';
import { CategoryForm } from '../../categories/category-form/category-form';

@Component({
  selector: 'app-account-form',
  imports: [FormsModule, ReactiveFormsModule, ...sharedPrimeModules, FormField],
  templateUrl: './account-form.html',
  styleUrl: './account-form.scss',
  providers: [DialogService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountForm {
  readonly AccountType = AccountType;

  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private categoryService = inject(Category);
  public validationService = inject(ValidationService);
  private accountState = inject(AccountState);
  private notificationService = inject(NotificationService);
  private dialogService = inject(DialogService);

  accountForm: FormGroup;
  accountCategories = signal<AccountCategory[]>([]);
  currentFilter = signal<string>('');
  isSubmitting = signal<boolean>(false);
  isEditMode = false;

  interestFrequencyOptions = [
    { label: 'Daily', value: InterestFrequency.Daily },
    { label: 'Monthly', value: InterestFrequency.Monthly },
    { label: 'Quarterly', value: InterestFrequency.Quarterly },
    { label: 'Yearly', value: InterestFrequency.Yearly }
  ];

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
      purpose: [null],

      // Credit Card fields
      creditLimit: [null],
      minimumDueAmount: [null],
      dueDate: [null],
      statementClosingDate: [null],
      annualFee: [null],
      cardInterestRate: [null],

      // Loan fields
      principalAmount: [null],
      loanInterestRate: [null],
      emiAmount: [null],
      tenureMonths: [null],
      nextEmiDueDate: [null],
      loanStartDate: [null],

      // Bank fields
      bankInterestRate: [null],
      interestFrequency: [null],
      minimumBalance: [null]
    });

    this.accountForm.get('accountCategoryId')?.valueChanges.subscribe(() => {
      this.updateBalanceValidator();
      this.accountForm.updateValueAndValidity();
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCategories();

    const data = this.config.data;
    if (data && data.itemToEdit) {
      this.isEditMode = true;
      const item = data.itemToEdit;
      const category = this.accountCategories().find(c => c.name === item.accountCategoryName);
      this.accountForm.patchValue({
        ...item,
        accountCategoryId: category ? category.id : null
      });

      if (item.creditCardDetails) {
        this.accountForm.patchValue({
          creditLimit: item.creditCardDetails.creditLimit,
          minimumDueAmount: item.creditCardDetails.minimumDueAmount,
          dueDate: item.creditCardDetails.dueDate ? new Date(item.creditCardDetails.dueDate) : null,
          statementClosingDate: item.creditCardDetails.statementClosingDate ? new Date(item.creditCardDetails.statementClosingDate) : null,
          annualFee: item.creditCardDetails.annualFee,
          cardInterestRate: item.creditCardDetails.interestRate
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
          interestFrequency: item.bankAccountDetails.interestFrequency,
          minimumBalance: item.bankAccountDetails.minimumBalance
        });
      }
    }

    this.updateBalanceValidator();
  }

  private async loadCategories(): Promise<void> {
    const categories = await firstValueFrom(this.categoryService.getAccountCategories());
    if (categories) {
      this.accountCategories.set(categories);
    }
  }

  filterCategories(event: { filter: string }): void {
    this.currentFilter.set(event.filter);
  }

  private updateBalanceValidator(): void {
    const category = this.accountCategories().find(c => c.id === this.accountForm.get('accountCategoryId')?.value);
    const balanceControl = this.accountForm.get('balance');
    if (!balanceControl) return;

    if (category?.isLiability) {
      balanceControl.setValidators([Validators.required]);
    } else {
      balanceControl.setValidators([Validators.required, Validators.min(0)]);
    }
    balanceControl.updateValueAndValidity();
  }

  isNewCategory(): boolean {
    const filter = this.currentFilter().trim().toLowerCase();
    if (!filter) {
      return false;
    }
    return !this.accountCategories().some(c => c.name.toLowerCase() === filter);
  }

  openCategoryModal(): void {
    const nameToInject = this.currentFilter().trim();
    const ref = this.dialogService.open(CategoryForm, {
      header: 'Add New Account Category',
      width: '30rem',
      data: {
        endpoint: 'AccountCategories',
        itemToEdit: nameToInject ? { name: nameToInject } : undefined
      }
    });

    ref?.onClose.subscribe(async (result: any) => {
      if (result) {
        await this.loadCategories();
        const created = this.accountCategories().find(c => c.name.toLowerCase() === nameToInject.toLowerCase());
        if (created) {
          this.accountForm.get('accountCategoryId')?.setValue(created.id);
        }
        this.currentFilter.set('');
      }
    });
  }

  private buildDetailsPayload(): any {
    const type = this.selectedAccountType();
    const raw = this.accountForm.getRawValue();
    const toIso = (d: Date | null): string | null => d ? d.toISOString() : null;

    return {
      creditCardDetails: type === AccountType.CreditCard ? {
        creditLimit: raw.creditLimit,
        minimumDueAmount: raw.minimumDueAmount,
        dueDate: toIso(raw.dueDate),
        statementClosingDate: toIso(raw.statementClosingDate),
        annualFee: raw.annualFee,
        interestRate: raw.cardInterestRate
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
        interestFrequency: raw.interestFrequency,
        minimumBalance: raw.minimumBalance
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
        purpose: this.accountForm.value.purpose,
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
