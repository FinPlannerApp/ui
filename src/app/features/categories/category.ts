import { Injectable } from '@angular/core';
import { ApiResult, GenericApi } from '../../core/services/generic-api';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UpsertCategoryRequest } from '../../core/models/api-contracts';
import { AccountType } from '../../core/models/account-type.model';

export interface AccountCategory {
  id: number;
  name: string;
  isLiability: boolean;
  accountType: AccountType;
}

export interface TransactionCategory {
  id: number;
  name: string;
  isTransferCategory: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Category {
  private accountCategoryEndpoint = 'AccountCategories';
  private transactionCategoryEndpoint = 'TransactionCategories';

  constructor(private apiService: GenericApi) { }

  // --- Account Category Methods ---

  getAccountCategories(): Observable<AccountCategory[]> {
    return this.apiService.get<AccountCategory[]>(this.accountCategoryEndpoint).pipe(
      map(response => response.value || [])
    );
  }

  upsertAccountCategory(categoryData: UpsertCategoryRequest): Observable<AccountCategory> {
    return this.apiService.upsert<AccountCategory>(this.accountCategoryEndpoint, categoryData).pipe(
      map(response => response.value)
    );
  }

  deleteAccountCategory(id: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.accountCategoryEndpoint, id).pipe(
      map(response => response.value)
    );
  }

  // --- Transaction Category Methods ---

  getTransactionCategories(): Observable<TransactionCategory[]> {
    return this.apiService.get<TransactionCategory[]>(this.transactionCategoryEndpoint).pipe(
      map(response => response.value || [])
    );
  }

  upsertTransactionCategory(categoryData: UpsertCategoryRequest): Observable<TransactionCategory> {
    return this.apiService.upsert<TransactionCategory>(this.transactionCategoryEndpoint, categoryData).pipe(
      map(response => response.value)
    );
  }

  deleteTransactionCategory(id: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.transactionCategoryEndpoint, id).pipe(
      map(response => response.value)
    );
  }
}
