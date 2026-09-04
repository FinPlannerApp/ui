import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SubscriptionService } from '../subscription.service';
import { Subscription } from '../../../core/models/subscription.model';
import { RecurrenceFrequency } from '../../../core/models/recurring-transaction.model';
import { NotificationService } from '../../../core/services/notification.service';
import { GenericApi } from '../../../core/services/generic-api';
import { toDateOnlyString } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './subscriptions.html'
})
export class Subscriptions implements OnInit {
  private subscriptionService = inject(SubscriptionService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private api = inject(GenericApi);

  subscriptions = signal<Subscription[]>([]);
  accounts = signal<any[]>([]);
  categories = signal<any[]>([]);
  isLoading = signal(true);
  showForm = signal(false);

  formName = signal('');
  formAmount = signal<number | null>(null);
  formAccountId = signal<number | null>(null);
  formFrequency = signal<RecurrenceFrequency>(RecurrenceFrequency.Monthly);
  formStartDate = signal<Date>(new Date());
  formTag = signal('');
  formCancellationUrl = signal('');

  frequencyOptions = [
    { label: 'Daily', value: RecurrenceFrequency.Daily },
    { label: 'Weekly', value: RecurrenceFrequency.Weekly },
    { label: 'Monthly', value: RecurrenceFrequency.Monthly },
    { label: 'Yearly', value: RecurrenceFrequency.Yearly }
  ];

  totalMonthlyEstimate = computed(() => {
    // Rough estimate only — normalizes each subscription to a monthly
    // figure regardless of its actual frequency, purely so there's one
    // "about how much is this costing me a month" number to glance at.
    return this.subscriptions().reduce((sum, s) => {
      const freq = s.frequency.toLowerCase();
      if (freq === 'yearly') return sum + s.amount / 12;
      if (freq === 'weekly') return sum + s.amount * 4.33;
      if (freq === 'daily') return sum + s.amount * 30.44;
      return sum + s.amount; // monthly, or anything else, treated as-is
    }, 0);
  });

  async ngOnInit(): Promise<void> {
    await this.loadSubscriptions();
    await this.loadFormData();
  }

  private async loadSubscriptions(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.subscriptions.set(await this.subscriptionService.getActive());
    } catch {
      this.notificationService.showError('Could not load subscriptions.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadFormData(): Promise<void> {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        firstValueFrom(this.api.post<any>('Accounts/search', { pageNumber: 1, pageSize: 100 })),
        firstValueFrom(this.api.post<any>('TransactionCategories/search', { pageNumber: 1, pageSize: 100 }))
      ]);
      if (accountsRes.isSuccess) this.accounts.set(accountsRes.value.data);
      if (categoriesRes.isSuccess) this.categories.set(categoriesRes.value.data);
    } catch {
      // Non-critical for the list view — only blocks the create form.
    }
  }

  openCreateForm(): void {
    this.formName.set('');
    this.formAmount.set(null);
    this.formAccountId.set(null);
    this.formFrequency.set(RecurrenceFrequency.Monthly);
    this.formStartDate.set(new Date());
    this.formTag.set('');
    this.formCancellationUrl.set('');
    this.showForm.set(true);
  }

  async save(): Promise<void> {
    const name = this.formName().trim();
    const amount = this.formAmount();
    const accountId = this.formAccountId();
    if (!name || amount === null || amount <= 0 || accountId === null) {
      this.notificationService.showError('Name, amount, and account are required.');
      return;
    }

    try {
      await this.subscriptionService.create({
        name,
        amount,
        accountId,
        categoryId: null,
        frequency: this.formFrequency(),
        startDate: toDateOnlyString(this.formStartDate())!,
        tag: this.formTag().trim() || null,
        cancellationUrl: this.formCancellationUrl().trim() || null
      });
      this.notificationService.showSuccess('Subscription added.');
      this.showForm.set(false);
      await this.loadSubscriptions();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to add subscription.');
    }
  }

  confirmCancel(sub: Subscription): void {
    this.confirmationService.confirm({
      header: 'Cancel Subscription',
      message: `Mark "${sub.name}" as cancelled? This pauses the recurring charge — it stops appearing here and stops generating transactions, but past transactions stay in your history.`,
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.subscriptionService.cancel(sub.recurringTransactionId);
          this.subscriptions.update(list => list.filter(s => s.recurringTransactionId !== sub.recurringTransactionId));
          this.notificationService.showSuccess('Subscription cancelled.');
          await this.loadSubscriptions();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to cancel.');
        }
      }
    });
  }
}
