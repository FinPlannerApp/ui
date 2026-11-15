export interface GeneralSettings {
  /** Day (1–28) the user's money month starts on, e.g. salary day. 1 = calendar month. */
  monthStartDay: number;
}

export interface BudgetSettings {
  /** Default alert level, 50–100 % of a budget. */
  defaultAlertPercent: number;
  toastAlerts: boolean;
  emailAlerts: boolean;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = { monthStartDay: 1 };
export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = { defaultAlertPercent: 80, toastAlerts: true, emailAlerts: false };

export const MIN_ALERT_PERCENT = 50;
export const MAX_ALERT_PERCENT = 100;

export interface AccountSettings {
  /** Flag bank/cash accounts below this balance. 0 = off. */
  lowBalanceThreshold: number;
  hideBalances: boolean;
  /** Highlight cards due within this many days (0 = off, max 14). */
  cardDueReminderDays: number;
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = { lowBalanceThreshold: 0, hideBalances: false, cardDueReminderDays: 5 };

export interface TransactionSettings {
  /** An identical transaction saved again within this many seconds is rejected. 0 = off. */
  duplicateGuardSeconds: number;
  /** Expenses at or above this amount are called out on the Transactions overview. 0 = off. */
  largeExpenseThreshold: number;
  /** Most Quick Cards shown in Bulk add (0 = hide). */
  quickCardsMax: number;
  /** Repeats needed for an entry to become a Quick Card. */
  quickCardsMinUses: number;
  /** Look-back window in days. */
  quickCardsDays: number;
  /** Account pre-filled in Bulk add (null = none). */
  defaultAccountId?: number | null;
  /** Category pre-filled for new transactions (null = none). */
  defaultCategoryId?: number | null;
}

export const DEFAULT_TRANSACTION_SETTINGS: TransactionSettings = { duplicateGuardSeconds: 3, largeExpenseThreshold: 0, quickCardsMax: 12, quickCardsMinUses: 3, quickCardsDays: 120 };

export interface SubscriptionSettings {
  /** Highlight subscriptions renewing within this many days (0 = off, max 30). */
  renewalAlertDays: number;
  /** Your own monthly ceiling for subscription spend. 0 = off. */
  monthlyTarget: number;
}
export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = { renewalAlertDays: 7, monthlyTarget: 0 };

export interface RecurringSettings {
  /** How far ahead the Recurring overview projects (7–180 days). */
  lookAheadDays: number;
  showPaused: boolean;
}
export const DEFAULT_RECURRING_SETTINGS: RecurringSettings = { lookAheadDays: 30, showPaused: true };

export interface NotificationSettings {
  /** Email me about comments and status changes on issues I reported. Off by default. */
  issueUpdateEmails: boolean;
  /** Daily email digest of payments coming due. Off by default. */
  paymentReminderEmails: boolean;
  /** Days ahead to remind (1-14). */
  reminderDaysBefore: number;
}
