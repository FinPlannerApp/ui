export interface Subscription {
  id: number;
  name: string;
  amount: number;
  tag: string | null;
  cancellationUrl: string | null;
  nextProcessDate: string;
  frequency: string;
  recurringTransactionId: number;
}

export interface CreateSubscriptionRequest {
  name: string;
  amount: number;
  accountId: number;
  categoryId: number | null;
  frequency: number; // RecurrenceFrequency enum value
  startDate: string;
  tag: string | null;
  cancellationUrl: string | null;
}
