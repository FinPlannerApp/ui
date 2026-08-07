import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { GenericApi, PaginatedResult } from '../../core/services/generic-api';
import { AccountType, CreditCardDetails, LoanDetails, BankAccountDetails } from '../../core/models/account-type.model';

export interface Account {
  id: number;
  name: string;
  balance: number;
  userId: string;
  accountCategoryName?: string;
  accountCategoryId?: number;
  isLiability?: boolean;
  accountType?: AccountType;
  creditCardDetails?: CreditCardDetails | null;
  loanDetails?: LoanDetails | null;
  bankAccountDetails?: BankAccountDetails | null;
}

@Injectable({
  providedIn: 'root'
})
export class Account {
  private endpoint = 'Accounts';

  constructor(private apiService: GenericApi) { }

  /**
   * Fetches a paginated list of accounts using the new '/search' endpoint.
   */
  getAccounts(queryParams: any): Observable<PaginatedResult<Account>> {
    // Use the 'search' method and map the result from the ApiResult
    return this.apiService.search<Account>(this.endpoint, queryParams).pipe(
      map(response => response.value)
    );
  }

  /**
   * Creates or updates an account using the new '/upsert' endpoint.
   */
  upsertAccount(accountData: any): Observable<Account> {
    // Use the generic 'upsert' method
    return this.apiService.upsert<Account>(this.endpoint, accountData).pipe(
      map(response => response.value)
    );
  }

  /**
   * Deletes an account by its ID.
   */
  deleteAccount(accountId: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.endpoint, accountId).pipe(
      map(response => response.value)
    );
  }
} 
