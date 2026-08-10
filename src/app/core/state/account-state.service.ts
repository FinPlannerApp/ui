import { computed, inject, Injectable, signal } from '@angular/core';
import { Account } from '../../features/accounts/account'; // Importing the service class as interface? 
// No, Account in 'account.ts' is both interface and class. I should be careful.
// Let's check imports in account.ts.
// It exports interface Account.
import { GenericApi } from '../services/generic-api';
import { firstValueFrom } from 'rxjs';
import { DashboardState } from './dashboard-state.service';
import { UpsertAccountRequest } from '../models/api-contracts';

@Injectable({
    providedIn: 'root'
})
export class AccountState {
    private api = inject(GenericApi);
    private dashboardState = inject(DashboardState);
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
     * @returns A Promise that resolves when loading is complete.
     */
    async loadAccounts(force: boolean = false): Promise<void> {
        if (!force && this._accounts().length > 0) return;
        this._isLoading.set(true);
        try {
            // Fetch all accounts. PageSize 999 for now to get all for client-side state
            const result = await firstValueFrom(this.api.search<Account>(this.endpoint, { pageNumber: 1, pageSize: 999 }));

            // GUARD: Ensure we have an array
            if (Array.isArray(result.value.data)) {
                this._accounts.set(result.value.data);
            } else {
                this._accounts.set([]);
            }

        } catch (err) {
            // On error, perhaps keep previous state or empty? Keeping previous for now.
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Creates or updates an account and refreshes the state.
     * @param accountData The account data to upsert.
     * @returns A Promise that resolves when the operation is complete.
     */
    async addAccount(accountData: UpsertAccountRequest): Promise<void> {
        this._isLoading.set(true);
        try {
            const response = await firstValueFrom(this.api.upsert<Account>(this.endpoint, accountData));
            if (!response.isSuccess) {
                throw new Error(response.error?.description || 'Failed to save account');
            }
            // Refresh list to get updated IDs and calculation
            await Promise.all([
                this.loadAccounts(),
                this.dashboardState.refresh()
            ]);
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Deletes an account by ID and refreshes state.
     * @param accountId ID of the account to delete.
     */
    async deleteAccount(accountId: number): Promise<void> {
        this._isLoading.set(true);
        try {
            const response = await firstValueFrom(this.api.delete<boolean>(this.endpoint, accountId));
            if (!response.isSuccess) {
                throw new Error(response.error?.description || 'Failed to delete account');
            }
            await this.refresh();
        } finally {
            this._isLoading.set(false);
        }
    }

    /**
     * Refreshes the account state and the dashboard state.
     * @returns A Promise that resolves when both states are refreshed.
     */
    async refresh(): Promise<void> {
        // Reloads accounts and triggers dashboard refresh
        await Promise.all([
            this.loadAccounts(),
            this.dashboardState.refresh()
        ]);
    }
}
