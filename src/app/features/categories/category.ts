import { Injectable, signal } from '@angular/core';
import { ApiResult, GenericApi } from '../../core/services/generic-api';
import { map, Observable, of, tap } from 'rxjs';
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

  private _accountCategories = signal<AccountCategory[] | null>(null);
  private _transactionCategories = signal<TransactionCategory[] | null>(null);

  constructor(private apiService: GenericApi) { }

  // --- Account Category Methods ---

  getAccountCategories(force: boolean = false): Observable<AccountCategory[]> {
    if (!force && this._accountCategories() !== null) {
      return of(this._accountCategories()!);
    }
    return this.apiService.get<AccountCategory[]>(this.accountCategoryEndpoint).pipe(
      map(response => response.value || []),
      tap(list => this._accountCategories.set(list))
    );
  }

  upsertAccountCategory(categoryData: UpsertCategoryRequest): Observable<AccountCategory> {
    return this.apiService.upsert<AccountCategory>(this.accountCategoryEndpoint, categoryData).pipe(
      map(response => response.value),
      tap(saved => {
        if (saved && this._accountCategories()) {
          this._accountCategories.update(current => {
            const idx = (current || []).findIndex(c => c.id === saved.id);
            if (idx !== -1) {
              const updated = [...(current || [])];
              updated[idx] = saved;
              return updated;
            }
            return [...(current || []), saved];
          });
        }
      })
    );
  }

  deleteAccountCategory(id: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.accountCategoryEndpoint, id).pipe(
      map(response => response.value),
      tap(success => {
        if (success && this._accountCategories()) {
          this._accountCategories.update(current => (current || []).filter(c => c.id !== id));
        }
      })
    );
  }

  // --- Transaction Category Methods ---

  getTransactionCategories(force: boolean = false): Observable<TransactionCategory[]> {
    if (!force && this._transactionCategories() !== null) {
      return of(this._transactionCategories()!);
    }
    return this.apiService.get<TransactionCategory[]>(this.transactionCategoryEndpoint).pipe(
      map(response => response.value || []),
      tap(list => this._transactionCategories.set(list))
    );
  }

  upsertTransactionCategory(categoryData: UpsertCategoryRequest): Observable<TransactionCategory> {
    return this.apiService.upsert<TransactionCategory>(this.transactionCategoryEndpoint, categoryData).pipe(
      map(response => response.value),
      tap(saved => {
        if (saved && this._transactionCategories()) {
          this._transactionCategories.update(current => {
            const idx = (current || []).findIndex(c => c.id === saved.id);
            if (idx !== -1) {
              const updated = [...(current || [])];
              updated[idx] = saved;
              return updated;
            }
            return [...(current || []), saved];
          });
        }
      })
    );
  }

  deleteTransactionCategory(id: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.transactionCategoryEndpoint, id).pipe(
      map(response => response.value),
      tap(success => {
        if (success && this._transactionCategories()) {
          this._transactionCategories.update(current => (current || []).filter(c => c.id !== id));
        }
      })
    );
  }
}
