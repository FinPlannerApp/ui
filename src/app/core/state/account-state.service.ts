import { computed, inject, Injectable, signal } from '@angular/core';
import { Account } from '../../features/accounts/account';
import { GenericApi } from '../services/generic-api';
import { firstValueFrom } from 'rxjs';
import { UpsertAccountRequest } from '../models/api-contracts';

@Injectable({
    providedIn: 'root'
})
export class AccountState {
    private api = inject(GenericApi);
    private endpoint = 'Accounts';

    // State Signals
    private _accounts = signal<Account[]>([]);
    private _isLoading = signal<boolean>(false);

    // Readonly Public Signals
    public accounts = this._accounts.asReadonly();
    public isLoading = this._isLoading.asReadonly();

    // Computed
    public totalBalance = computed(() => this._accounts().reduce((sum, acc) => sum + acc.balance, 0));

    constructor() {
    }

    /**
     * Loads all accounts from the API and updates the state signal.
     * @param force If true, forces a network refetch even if accounts are already loaded.
     */
    async loadAccounts(force: boolean = false): Promise<void> {
        if (!force && this._accounts().length > 0) return;
        this._isLoading.set(true);
        try {
            const result = await firstValueFrom(this.api.search<Account>(this.endpoint, { pageNumber: 1, pageSize: 999 }));

            if (result?.value?.data && Array.isArray(result.value.data)) {
                this._accounts.set(result.value.data);
            } else {
                this._accounts.set([]);
            }

        } catch (err) {
            // Keep existing accounts state on error
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Creates or updates an account and instantly updates local reactive signals + syncs backend.
     * @param accountData The account data to upsert.
     */
    async addAccount(accountData: UpsertAccountRequest): Promise<void> {
        this._isLoading.set(true);
        try {
            const response = await firstValueFrom(this.api.upsert<Account>(this.endpoint, accountData));
            if (!response.isSuccess) {
                throw new Error(response.error?.description || 'Failed to save account');
            }

            const savedAccount = response.value;
            if (savedAccount) {
                // INSTANT REACTIVE SIGNAL UPDATE: Update local state immediately
                this._accounts.update(current => {
                    const idx = current.findIndex(a => a.id === savedAccount.id);
                    if (idx !== -1) {
                        const updated = [...current];
                        updated[idx] = savedAccount;
                        return updated;
                    } else {
                        return [savedAccount, ...current];
                    }
                });
            }

            // Sync full state with backend
            await this.loadAccounts(true);
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Deletes an account by ID and updates state.
     * @param accountId ID of the account to delete.
     */
    async deleteAccount(accountId: number): Promise<void> {
        this._isLoading.set(true);
        try {
            const response = await firstValueFrom(this.api.delete<boolean>(this.endpoint, accountId));
            if (!response.isSuccess) {
                throw new Error(response.error?.description || 'Failed to delete account');
            }
            this._accounts.update(current => current.filter(a => a.id !== accountId));
            await this.loadAccounts(true);
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Refreshes the account state by forcing a network load.
     */
    async refresh(): Promise<void> {
        await this.loadAccounts(true);
    }
}
