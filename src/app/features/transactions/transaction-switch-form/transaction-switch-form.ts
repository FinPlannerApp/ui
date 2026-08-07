import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { AccountState } from '../../../core/state/account-state.service';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-transaction-switch-form',
  imports: [SelectModule, ButtonModule, ReactiveFormsModule],
  templateUrl: './transaction-switch-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionSwitchForm implements OnInit {
  private fb = inject(FormBuilder);
  public ref = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  private accountState = inject(AccountState);

  switchForm: FormGroup;
  currentAccountId: number;

  filteredAccounts = computed(() =>
    this.accountState.accounts().filter(a => a.id !== this.currentAccountId)
  );

  constructor() {
    this.currentAccountId = this.config.data.currentAccountId;
    this.switchForm = this.fb.group({
      destinationAccountId: [null, Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    // Ensure data is loaded
    if (this.accountState.accounts().length === 0) {
      await this.accountState.refresh();
    }
  }

  onSubmit(): void {
    if (this.switchForm.valid) {
      this.ref.close(this.switchForm.value); // Return { destinationAccountId: 123 }
    }
  }
}
