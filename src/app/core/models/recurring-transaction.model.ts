export enum RecurrenceFrequency {
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Yearly = 4,
    Custom = 5,
    OneTime = 6
}

// Matches Domain.Enums.RecurrenceDayOfWeek on the backend exactly — same
// bitmask values, so a combined selection (e.g. Mon+Wed+Fri = 1+4+16 = 21)
// round-trips correctly with no translation layer needed on either side.
export enum RecurrenceDayOfWeek {
    None = 0,
    Monday = 1,
    Tuesday = 2,
    Wednesday = 4,
    Thursday = 8,
    Friday = 16,
    Saturday = 32,
    Sunday = 64
}

export interface RecurringTransaction {
    id: number;
    accountId: number;
    accountName: string;
    transactionCategoryId?: number;
    categoryName?: string;
    description: string;
    amount: number;
    type: number; // 0: Income, 1: Expense (or match your TransactionType enum)
    frequency: RecurrenceFrequency;
    customDays?: RecurrenceDayOfWeek | null;
    startDate: string;
    endDate?: string;
    nextProcessDate: string;
    isActive: boolean;
    lastProcessedDate?: string;
}

export interface UpsertRecurringTransactionRequest {
    accountId: number;
    transactionCategoryId?: number;
    description: string;
    amount: number;
    type: number;
    frequency: RecurrenceFrequency;
    customDays?: RecurrenceDayOfWeek | null;
    startDate: string;
    endDate?: string;
    isActive: boolean;
}
