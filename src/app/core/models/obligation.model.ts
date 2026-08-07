export interface UpcomingObligation {
  description: string;
  accountName: string;
  amount: number | null;
  minimumDueAmount: number | null; // only set for source === 'CreditCard'
  dueDate: string;
  source: 'Recurring' | 'CreditCard';
}
