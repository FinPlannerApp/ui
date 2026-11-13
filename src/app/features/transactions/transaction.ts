import { inject, Injectable } from '@angular/core';
import { GenericApi, PaginatedResult } from '../../core/services/generic-api';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TransactionType } from '../../core/models/transaction-type';
import { SwitchTransactionAccountRequest, TransferRequest, UpsertTransactionRequest } from '../../core/models/api-contracts';

// --- TRANSACTION INTERFACES & ENUMS ---
// TransactionType moved to core/models

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: Date;
  type: TransactionType;
  accountId: number;
  accountName?: string;
  categoryName?: string;
}

export interface TransactionPageResult {
  transactions: PaginatedResult<Transaction>;
  balanceBroughtForward: number;
  closingBalance?: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  availableCategories: string[];
}

export interface TransactionQueryParams {
  pageNumber: number;
  pageSize: number;
  globalSearch?: string;
  sortBy?: string;
  sortOrder?: string;
  filters: { [key: string]: string };
}


@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  constructor(private apiService: GenericApi) { }

  // --- Unified Transaction Methods ---

  /**
   * Retrieves paginated transactions across ALL accounts for the logged-in user.
   */
  getAllTransactions(queryParams: TransactionQueryParams): Observable<TransactionPageResult> {
    const endpoint = 'AllTransactions';
    return this.apiService.search<TransactionPageResult>(endpoint, queryParams).pipe(
      map(response => response.value as any as TransactionPageResult)
    );
  }

  // --- Per-Account Transaction Methods ---

  /**
   * Retrieves paginated transactions for a specific account.
   * @param accountId The ID of the account.
   * @param queryParams Pagination and filter parameters.
   * @returns An Observable of paginated transactions.
   */
  getTransactionsForAccount(accountId: number, queryParams: any): Observable<PaginatedResult<Transaction>> {
    if (!accountId || accountId <= 0) {
      return throwError(() => new Error('Invalid Account ID'));
    }
    const endpoint = `Transactions`;
    const payload = { accountId, queryParameters: queryParams };
    return this.apiService.search<Transaction>(endpoint, payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response.error;
        return response.value;
      })
    );
  }

  /**
   * Creates or updates a transaction.
   * @param accountId The ID of the account.
   * @param transactionData The transaction data.
   * @returns An Observable of the upserted transaction.
   */
  upsertTransaction(accountId: number, transactionData: UpsertTransactionRequest): Observable<Transaction> {
    if (!accountId || accountId <= 0) {
      return throwError(() => new Error('Invalid Account ID'));
    }
    const endpoint = `Transactions`;
    const payload = { accountId, transaction: transactionData };
    return this.apiService.upsert<Transaction>(endpoint, payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response.error;
        return response.value;
      })
    );
  }

  /**
   * Bulk upserts multiple transactions across potentially multiple accounts.
   * @param payload The bulk transaction payload.
   * @returns An Observable of the bulk insert response containing success and failure counts.
   */
  bulkValidateTransactions(payload: any): Observable<any> {
    return this.apiService.post<any>('Transactions/bulk-validate', payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response;
        return response.value;
      })
    );
  }

  bulkUpsertTransactions(payload: any): Observable<any> {
    const endpoint = `Transactions/bulk-upsert`;
    return this.apiService.post<any>(endpoint, payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response;
        return response.value;
      })
    );
  }

  /**
   * Deletes a transaction.
   * @param accountId The ID of the account.
   * @param transactionId The ID of the transaction to delete.
   * @returns An Observable emitting true if successful.
   */
  deleteTransaction(accountId: number, transactionId: number): Observable<boolean> {
    if (!accountId || accountId <= 0) {
      return throwError(() => new Error('Invalid Account ID'));
    }
    if (!transactionId || transactionId <= 0) {
      return throwError(() => new Error('Invalid Transaction ID'));
    }
    const endpoint = `Transactions/delete`;
    const payload = { accountId, transactionId };
    return this.apiService.post<boolean>(endpoint, payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response.error;
        return response.value;
      })
    );
  }

  /**
   * Transfers funds between accounts.
   * @param sourceAccountId The ID of the source account.
   * @param transferData The transfer details.
   * @returns An Observable emitting true if successful.
   */
  createTransfer(sourceAccountId: number, transferData: TransferRequest): Observable<boolean> {
    if (!sourceAccountId || sourceAccountId <= 0) {
      return throwError(() => new Error('Invalid Source Account ID'));
    }
    const endpoint = `Transactions/transfer`;
    const payload = { accountId: sourceAccountId, transfer: transferData };
    return this.apiService.post<boolean>(endpoint, payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response.error;
        return response.value;
      })
    );
  }

  /**
   * Switches the account associated with a transaction.
   * @param currentAccountId The current account ID.
   * @param transactionId The transaction ID.
   * @param destinationAccountId The target account ID.
   * @returns An Observable emitting true if successful.
   */
  switchAccount(currentAccountId: number, transactionId: number, destinationAccountId: number): Observable<boolean> {
    if (!currentAccountId || currentAccountId <= 0) {
      return throwError(() => new Error('Invalid Current Account ID'));
    }
    if (!transactionId || transactionId <= 0) {
      return throwError(() => new Error('Invalid Transaction ID'));
    }
    const endpoint = `Transactions/switch-account`;
    const payload = { transactionId, destinationAccountId };
    return this.apiService.post<boolean>(endpoint, payload).pipe(
      map(response => {
        if (!response.isSuccess) throw response.error;
        return response.value;
      })
    );
  }
}
