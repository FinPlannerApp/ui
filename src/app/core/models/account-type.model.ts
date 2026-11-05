// Matches Domain.Enums.AccountType / InterestFrequency and the three
// detail DTOs on the backend exactly.

export enum AccountType {
    Bank = 0,
    CreditCard = 1,
    Loan = 2,
    Cash = 3,
    Other = 4
}

export enum InterestFrequency {
    Monthly = 0,
    Quarterly = 1,
    Yearly = 2,
    Daily = 3
}

export interface CreditCardDetails {
    creditLimit?: number | null;
    minimumDueAmount?: number | null;
    dueDate?: string | null;
    statementClosingDate?: string | null;
    annualFee?: number | null;
    interestRate?: number | null;
    latestBillAmount?: number | null;
    latestBillIsPaid?: boolean;
    remainingBillAmount?: number | null;
    totalPaidForCycle?: number | null;
    isPaid?: boolean;
    lastStatementDate?: string | null;
}

export interface LoanDetails {
    principalAmount?: number | null;
    interestRate?: number | null;
    emiAmount?: number | null;
    tenureMonths?: number | null;
    nextEmiDueDate?: string | null;
    startDate?: string | null;
}

export interface BankAccountDetails {
    interestRate?: number | null;
    interestFrequency?: InterestFrequency | null;
    minimumBalance?: number | null;
}
