import { inject, Injectable, signal } from '@angular/core';
import { GenericApi } from '../services/generic-api';
import { firstValueFrom } from 'rxjs';
import { DashboardSummary, SpendingByCategory } from '../../features/dashboard/dashboard';
import { DashboardInsightsDto } from '../models/dashboard-insights';
import { FinancialHealth } from '../models/financial-health.model';
import { toDateOnlyString } from '../utils/date-utils';

@Injectable({
    providedIn: 'root'
})
export class DashboardState {
    private api = inject(GenericApi);
    private endpoint = 'Dashboard';

    // State
    private _summary = signal<DashboardSummary | null>(null);
    private _spending = signal<SpendingByCategory[]>([]);
    private _insights = signal<DashboardInsightsDto | null>(null);
    private _budgets = signal<any[]>([]);
    private _financialHealth = signal<FinancialHealth | null>(null);
    private _isLoading = signal<boolean>(false);
    private _error = signal<string | null>(null);

    // Global Filter Date (Defaults to current Month/Year)
    private _selectedDate = signal<Date>(new Date());

    // Public
    public summary = this._summary.asReadonly();
    public spending = this._spending.asReadonly();
    public insights = this._insights.asReadonly();
    public budgets = this._budgets.asReadonly();
    public financialHealth = this._financialHealth.asReadonly();
    public isLoading = this._isLoading.asReadonly();
    public error = this._error.asReadonly();
    public selectedDate = this._selectedDate.asReadonly();

    constructor() {
    }

    private _loadPromise: Promise<void> | null = null;
    // Guards against an older, slower response overwriting a newer one
    // (e.g. two quick edits → two refreshes finishing out of order).
    private _seq = 0;

    /**
     * @param force  bypass the in-flight request dedupe
     * @param silent keep the current numbers on screen while refetching (no skeleton flash)
     */
    async load(force: boolean = false, silent: boolean = false): Promise<void> {
        if (this._loadPromise && !force) {
            return this._loadPromise;
        }

        const seq = ++this._seq;
        const promise = (async () => {
            if (!silent) this._isLoading.set(true);
            this._error.set(null);
            try {
                // Calculate Start & End of the selected Month
                const current = this._selectedDate();
                const start = new Date(Date.UTC(current.getFullYear(), current.getMonth(), 1));
                const end = new Date(Date.UTC(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999));

                const params = `?startDate=${toDateOnlyString(start)}&endDate=${toDateOnlyString(end)}`;

                const summaryReq = this.api.get<DashboardSummary>(`${this.endpoint}/summary${params}`);
                const spendingReq = this.api.get<SpendingByCategory[]>(`${this.endpoint}/spending-by-category${params}`);
                const insightsReq = this.api.get<DashboardInsightsDto>(`${this.endpoint}/insights${params}`);
                const budgetsReq = this.api.get<any[]>(`Budgets/progress${params.replace('startDate', 'date')}`);
                const month = current.getMonth() + 1;
                const year = current.getFullYear();
                const healthReq = this.api.get<FinancialHealth>(`${this.endpoint}/financial-health?month=${month}&year=${year}`);

                const [summaryRes, spendingRes, insightsRes, budgetsRes, healthRes] = await Promise.all([
                    firstValueFrom(summaryReq),
                    firstValueFrom(spendingReq),
                    firstValueFrom(insightsReq),
                    firstValueFrom(budgetsReq),
                    firstValueFrom(healthReq)
                ]);

                // A newer load started while this one was in flight — drop this stale result.
                if (seq !== this._seq) return;

                if (!summaryRes?.isSuccess) {
                    this._error.set(summaryRes?.error?.description || 'Could not load your dashboard.');
                }
                this._summary.set(summaryRes?.value ?? null);
                this._spending.set(spendingRes?.value ?? []);
                this._insights.set(insightsRes?.value ?? null);
                this._budgets.set(budgetsRes?.value ?? []);
                this._financialHealth.set(healthRes?.value ?? null);

            } catch (err: any) {
                if (seq === this._seq) {
                    this._error.set(err?.message || 'Could not load your dashboard.');
                }
            } finally {
                if (seq === this._seq) {
                    this._isLoading.set(false);
                    this._loadPromise = null;
                }
            }
        })();

        this._loadPromise = promise;
        return promise;
    }

    /** True once the dashboard has data on screen that could go stale. */
    get hasData(): boolean {
        return this._summary() !== null;
    }

    updateDate(newDate: Date) {
        this._selectedDate.set(newDate);
        this.load(true);
    }

    refresh(silent: boolean = false) {
        return this.load(true, silent);
    }
}
