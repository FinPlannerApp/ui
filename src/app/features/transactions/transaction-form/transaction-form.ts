import { RuleMatch } from '../../../core/models/transaction-rule.model';
import { UserSettingsService } from '../../../core/services/user-settings.service';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Transaction, TransactionService } from '../transaction';
import { TransactionType } from '../../../core/models/transaction-type';
import { Category, TransactionCategory, findCategoryByText, splitCategoryText } from '../../categories/category';
import { toDateOnlyString, fromDateOnlyString } from '../../../core/utils/date-utils';
import { firstValueFrom } from 'rxjs';
import { Account } from '../../accounts/account';
import { MessageService } from 'primeng/api';
import { AccountState } from '../../../core/state/account-state.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { CommonModule } from '@angular/common';

import { GenericApi } from '../../../core/services/generic-api';
import { Attachments } from '../../../shared/components/attachments/attachments';
import { MerchantService } from '../../merchants/merchant.service';
import { Merchant } from '../../../core/models/merchant.model';

@Component({
  selector: 'app-transaction-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Attachments, ...sharedPrimeModules],
  templateUrl: './transaction-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionForm implements OnInit {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private categoryService = inject(Category);
  private transactionService = inject(TransactionService);
  private merchantService = inject(MerchantService);
  private api = inject(GenericApi);
  private userSettings = inject(UserSettingsService);
  private accountState = inject(AccountState);
  private messageService = inject(MessageService);

  transactionForm: FormGroup;
  transactionTypes: any[];
  categories = signal<TransactionCategory[]>([]);
  selectedCategoryId = signal<number | null>(null);
  accounts = signal<Account[]>([]);
  merchants = signal<Merchant[]>([]);
  /** Tags the user has used before, offered as suggestions (new ones can be typed and added with Enter or a comma). */
  private knownTags: string[] = [];
  tagSuggestions = signal<string[]>([]);

  searchTags(event: { query: string }): void {
    const q = (event.query || '').trim().toLowerCase().replace(/^#/, '');
    const chosen = new Set<string>((this.transactionForm.get('tags')?.value ?? []).map((t: string) => t.toLowerCase()));
    this.tagSuggestions.set(this.knownTags.filter(t => !chosen.has(t) && (!q || t.includes(q))).slice(0, 8));
  }
  suggestedMerchantId = signal<number | null>(null);
  currentFilter = signal<string>('');

  isEditMode = signal(false);
  isTransfer = signal(false);
  currentAccountId: number;
  isSubmitting = signal<boolean>(false);

  suggestedMerchantName = computed(() => {
    const id = this.suggestedMerchantId();
    if (!id) return null;
    return this.merchants().find(m => m.id === id)?.name ?? null;
  });

  isNewCategory = computed(() => {
    const filter = this.currentFilter().trim().toLowerCase();
    if (!filter) return false;
    return !this.categories().some(c => c.name.toLowerCase() === filter || (c.path ?? '').toLowerCase() === filter);
  });

  constructor() {
    // Get data passed from the parent component
    this.currentAccountId = this.config.data.currentAccountId;
    const transactionData = this.config.data.transaction;
    this.isEditMode.set(!!transactionData);

    this.transactionForm = this.fb.group({
      id: [null],
      description: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      date: [new Date(), Validators.required],
      type: [TransactionType.Expense, Validators.required],
      transactionCategoryId: [null],
      merchantId: [null],
      notes: [null, Validators.maxLength(500)],
      tags: [[]],
      destinationAccountId: [null] // Control for the transfer dropdown
    });

    this.transactionTypes = [
      { label: 'Expense', value: TransactionType.Expense },
      { label: 'Income', value: TransactionType.Income }
    ];

    // Patch form if we are in edit mode
    if (this.isEditMode()) {
      this.transactionForm.patchValue({ ...transactionData, tags: transactionData.tags ?? [], notes: transactionData.notes ?? null });
      this.transactionForm.patchValue({ date: fromDateOnlyString(transactionData.date) ?? new Date(transactionData.date) });
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    // Fetch categories and merchants
    const [categories, merchants] = await Promise.all([
      firstValueFrom(this.categoryService.getTransactionCategories()),
      this.merchantService.getAll()
    ]);
    this.categories.set(categories);
    this.merchants.set(merchants);
    if (!this.isEditMode()) {
      try {
        const d = await this.userSettings.getTransactions();
        if (d.defaultCategoryId && categories.some(c => c.id === d.defaultCategoryId)) {
          this.transactionForm.patchValue({ transactionCategoryId: d.defaultCategoryId });
          this.selectedCategoryId.set(d.defaultCategoryId);
          this.checkIfTransfer(d.defaultCategoryId);
        }
      } catch { /* optional */ }
    }
    void this.loadKnownTags();

    // Use state for accounts
    this.accounts.set(this.accountState.accounts().filter(a => a.id !== this.currentAccountId));

    // After data is loaded, check if we are editing a transfer
    if (this.isEditMode()) {
      const transactionData = this.config.data.transaction;
      const category = this.categories().find(c => c.name === transactionData.categoryName);
      if (category) {
        this.transactionForm.patchValue({ transactionCategoryId: category.id });
        this.selectedCategoryId.set(category.id);
        // Manually trigger the check
        this.checkIfTransfer(category.id);
      }
    }
  }

  // --- THIS IS THE CORE TRANSFER LOGIC ---
  onCategoryChange(event: { value: number }): void {
    this.selectedCategoryId.set(event.value ?? null);
    this.checkIfTransfer(event.value);
  }

  checkIfTransfer(categoryId: number | null): void {

    const category = this.categories().find(c => c.id === categoryId);
    this.isTransfer.set(category?.isTransferCategory || false);



    const typeControl = this.transactionForm.get('type');
    const destAccountControl = this.transactionForm.get('destinationAccountId');

    if (this.isTransfer()) {
      // If it's a transfer, force type to Expense and make "Transfer to" required
      typeControl?.setValue(TransactionType.Expense);
      typeControl?.disable();
      destAccountControl?.setValidators([Validators.required]);
    } else {
      // If it's not a transfer, re-enable type and remove "Transfer to" requirement
      typeControl?.enable();
      destAccountControl?.clearValidators();
    }
    destAccountControl?.updateValueAndValidity();
  }

  // --- (Add-on-the-fly category logic) ---
  // isNewCategory is now a computed signal

  async addNewCategory(): Promise<void> {
    const typed = this.currentFilter().trim();
    if (!typed) return;
    // "Food › Pizza" creates the sub-category Pizza under Food (when Food exists).
    const { parent, name } = splitCategoryText(typed);
    const parentCat = parent ? this.categories().find(c => c.name.toLowerCase() === parent.toLowerCase() && !c.parentCategoryId) : undefined;
    const finalName = (parentCat ? name : typed.replace(/\s*[›>\/]\s*/g, ' ')).trim();
    const newCategoryName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
    try {
      const newCategory = await firstValueFrom(this.categoryService.upsertTransactionCategory({
        name: newCategoryName, parentCategoryId: parentCat?.id ?? null }));
      const fresh = await firstValueFrom(this.categoryService.getTransactionCategories());
      this.categories.set(fresh);
      this.transactionForm.get('transactionCategoryId')?.setValue(newCategory.id);
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || err?.message || 'Failed to create new category' });
    }
  }


  /** When a main category with sub-categories is selected, offer its sub-categories as one-tap chips. */
  subCategoryChips = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return [] as TransactionCategory[];
    const current = this.categories().find(c => c.id === id);
    const rootId = current?.parentCategoryId ?? current?.id;   // siblings too, once a sub-category is picked
    return this.categories().filter(c => c.parentCategoryId === rootId);
  });
  pickSubCategory(id: number): void {
    this.transactionForm.get('transactionCategoryId')?.setValue(id);
    this.selectedCategoryId.set(id);
  }

  filterCategories(event: { filter: string }): void {
    this.currentFilter.set(event.filter);
  }

  async onDescriptionChange(): Promise<void> {
    const desc = this.transactionForm.get('description')?.value;
    if (this.transactionForm.get('merchantId')?.value || !desc) {
      this.suggestedMerchantId.set(null);
      return;
    }
    const match = await this.merchantService.suggest(desc);
    this.suggestedMerchantId.set(match);
  }

  /** Pre-fills category / merchant / tags from the user's Rules for a NEW transaction (only empty fields). */
  async applyRulesFor(): Promise<void> {
    if (this.isEditMode()) return;
    const v = this.transactionForm.getRawValue();
    if (!v.description?.trim()) return;
    try {
      const res = await firstValueFrom(this.api.post<RuleMatch | null>('transaction-rules/match', { description: v.description, amount: v.amount || 0, type: v.type }));
      const m = res.isSuccess ? res.value : null;
      if (!m) return;
      if (!v.transactionCategoryId && m.transactionCategoryId) {
        this.transactionForm.patchValue({ transactionCategoryId: m.transactionCategoryId });
        this.selectedCategoryId.set(m.transactionCategoryId);
        this.checkIfTransfer(m.transactionCategoryId);
      }
      if (!v.merchantId && m.merchantId) this.transactionForm.patchValue({ merchantId: m.merchantId });
      if ((!v.tags || v.tags.length === 0) && m.tags.length) this.transactionForm.patchValue({ tags: m.tags });
    } catch { /* rules are a convenience */ }
  }

  acceptMerchantSuggestion(): void {
    const id = this.suggestedMerchantId();
    if (id) {
      this.transactionForm.get('merchantId')?.setValue(id);
    }
    this.suggestedMerchantId.set(null);
  }

  dismissMerchantSuggestion(): void {
    this.suggestedMerchantId.set(null);
  }

  // --- UPDATED SUBMIT LOGIC ---
  private async loadKnownTags(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.get<{ tag: string; count: number }[]>('Transactions/tags'));
      if (res.isSuccess) this.knownTags = (res.value ?? []).map(t => t.tag);
    } catch { /* suggestions are optional */ }
  }

  async onSubmit(): Promise<void> {
    if (this.transactionForm.invalid || this.isSubmitting()) {
      this.transactionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.transactionForm.getRawValue();

    try {
      if (this.isTransfer()) {
        // --- Call the new TRANSFER service method ---
        const transferData = {
          amount: formValue.amount,
          date: toDateOnlyString(formValue.date)!,
          destinationAccountId: formValue.destinationAccountId,
          description: formValue.description,
          transactionCategoryId: formValue.transactionCategoryId
        };
        await firstValueFrom(this.transactionService.createTransfer(this.currentAccountId, transferData));
      } else {
        // --- Call the normal UPSERT service method ---
        const transactionData = {
          id: formValue.id,
          description: formValue.description,
          amount: formValue.amount,
          date: toDateOnlyString(formValue.date)!,
          type: formValue.type,
          transactionCategoryId: formValue.transactionCategoryId,
          merchantId: formValue.merchantId,
          notes: formValue.notes?.trim() || null,
          tags: (formValue.tags ?? []) as string[],
          accountCategoryId: undefined // Explicitly undefined or omitted
        };
        await firstValueFrom(this.transactionService.upsertTransaction(this.currentAccountId, transactionData));
      }
      await this.accountState.refresh();
      this.ref.close(true); // Close the dialog and signal success
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.message || 'Failed to save transaction' });
      this.isSubmitting.set(false);
    }
  }
}
