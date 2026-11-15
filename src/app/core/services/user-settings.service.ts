import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from './generic-api';
import { AccountSettings, BudgetSettings, GeneralSettings, NotificationSettings, RecurringSettings, SubscriptionSettings, TransactionSettings } from '../models/user-settings.model';

/** Reads and saves per-module settings (`general`, `budgets`, …) stored by the API as validated JSON. */
@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly api = inject(GenericApi);

  async get<T>(module: string): Promise<T> {
    const res = await firstValueFrom(this.api.get<T>(`user-settings/${module}`));
    if (!res.isSuccess) throw new Error(res.error?.description || 'Could not load settings.');
    return res.value;
  }

  async save<T>(module: string, value: T): Promise<T> {
    const res = await firstValueFrom(this.api.put<T>(`user-settings/${module}`, value));
    if (!res.isSuccess) throw new Error(res.error?.description || 'Could not save settings.');
    return res.value;
  }

  getGeneral = () => this.get<GeneralSettings>('general');
  saveGeneral = (v: GeneralSettings) => this.save<GeneralSettings>('general', v);
  getAccounts = () => this.get<AccountSettings>('accounts');
  saveAccounts = (v: AccountSettings) => this.save<AccountSettings>('accounts', v);
  getTransactions = () => this.get<TransactionSettings>('transactions');
  saveTransactions = (v: TransactionSettings) => this.save<TransactionSettings>('transactions', v);
  getSubscriptions = () => this.get<SubscriptionSettings>('subscriptions');
  saveSubscriptions = (v: SubscriptionSettings) => this.save<SubscriptionSettings>('subscriptions', v);
  getRecurring = () => this.get<RecurringSettings>('recurring');
  saveRecurring = (v: RecurringSettings) => this.save<RecurringSettings>('recurring', v);
  getNotifications = () => this.get<NotificationSettings>('notifications');
  saveNotifications = (v: NotificationSettings) => this.save<NotificationSettings>('notifications', v);
  getBudgets = () => this.get<BudgetSettings>('budgets');
  saveBudgets = (v: BudgetSettings) => this.save<BudgetSettings>('budgets', v);
}
