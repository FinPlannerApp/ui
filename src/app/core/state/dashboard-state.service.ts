import { inject, Injectable, signal } from '@angular/core';
import { GenericApi } from '../services/generic-api';
import { firstValueFrom } from 'rxjs';
import { DashboardSummary, SpendingByCategory } from '../../features/dashboard/dashboard';
import { DashboardInsightsDto } from '../models/dashboard-insights';
import { FinancialHealth } from '../models/financial-health.model';

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

    // Global Filter Date (Defaults to current Month/Year)
    private _selectedDate = signal<Date>(new Date());

    // Public
    public summary = this._summary.asReadonly();
    public spending = this._spending.asReadonly();
    public insights = this._insights.asReadonly();
    public budgets = this._budgets.asReadonly();
    public financialHealth = this._financialHealth.asReadonly();
    public isLoading = this._isLoading.asReadonly();
    public selectedDate = this._selectedDate.asReadonly();

    constructor() {
    }

    private _loadPromise: Promise<void> | null = null;

    async load(force: boolean = false): Promise<void> {
        if (this._loadPromise && !force) {
            return this._loadPromise;
        }

        this._loadPromise = (async () => {
            this._isLoading.set(true);
            try {
                // Calculate Start & End of the selected Month
                const current = this._selectedDate();
                const start = new Date(Date.UTC(current.getFullYear(), current.getMonth(), 1));
                const end = new Date(Date.UTC(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999));

                const params = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;

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

                this._summary.set(summaryRes?.value ?? null);
                this._spending.set(spendingRes?.value ?? []);
                this._insights.set(insightsRes?.value ?? null);
                this._budgets.set(budgetsRes?.value ?? []);
                this._financialHealth.set(healthRes?.value ?? null);

            } catch (err) {
            } finally {
                this._isLoading.set(false);
                this._loadPromise = null;
            }
        })();

        return this._loadPromise;
    }

    updateDate(newDate: Date) {
        this._selectedDate.set(newDate);
        this.load(true);
    }

    refresh() {
        return this.load(true);
    }
}
