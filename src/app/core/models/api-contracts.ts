import { TransactionType } from './transaction-type';

export interface UpsertAccountRequest {
    id?: number;
    name: string;
    accountCategoryId: number; // Enforce explicit ID
    balance?: number; // Optional for updates?
}

export interface UpsertTransactionRequest {
    id?: number;
    description: string;
    amount: number;
    date: string; // ISO string expected by API
    type: TransactionType;
    accountCategoryId?: number; // Optional?
    transactionCategoryId?: number;
}

export interface TransferRequest {
    amount: number;
    date: string;
    destinationAccountId: number;
    description?: string;
}

export interface SwitchTransactionAccountRequest {
    destinationAccountId: number;
}

export interface UpsertCategoryRequest {
    id?: number;
    name: string;
    isTransferCategory?: boolean; // Only for TransactionCategory
    isLiability?: boolean;        // Only for AccountCategory
    accountType?: number;         // Only for AccountCategory — AccountType enum value
}

export interface BulkTransactionEntry {
    accountId: number;
    destinationAccountId?: number;
    transaction: UpsertTransactionRequest;
}

export interface BulkTransactionPayload {
    transactions: BulkTransactionEntry[];
}

export interface BulkInsertFailure {
    index: number;
    errors: string[];
}

export interface BulkInsertResponse {
    successfulCount: number;
    failedCount: number;
    failedTransactions: BulkInsertFailure[];
}
