export interface UpcomingObligation {
  id: number;
  accountName: string;
  categoryName: string | null;
  description: string;
  amount: number;
  nextProcessDate: string;
}
