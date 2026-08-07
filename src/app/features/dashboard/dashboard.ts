import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { GenericApi } from '../../core/services/generic-api';
export interface AccountSummary {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  broughtForwardAmount: number;
}

export interface DashboardSummary {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  broughtForwardAmount: number;
  realAvailableCash: number;
}

export interface SpendingByCategory {
  categoryName: string;
  totalAmount: number;
}

@Injectable({
  providedIn: 'root'
})

export class DashboardService {
  private endpoint = 'Dashboard';

  constructor(private apiService: GenericApi) { }

  getSummary(): Observable<DashboardSummary> {
    return this.apiService.get<DashboardSummary>(`${this.endpoint}/summary`).pipe(
      map(response => response.value)
    );
  }

  getSpendingByCategory(): Observable<SpendingByCategory[]> {
    return this.apiService.get<SpendingByCategory[]>(`${this.endpoint}/spending-by-category`).pipe(
      map(response => response.value || [])
    );
  }

  getAccountSummary(accountId: number, startDate?: Date, endDate?: Date): Observable<AccountSummary> {
    return this.apiService.post<AccountSummary>(`${this.endpoint}/account-summary`, { accountId, startDate, endDate }).pipe(
      map(response => response.value)
    );
  }
}
