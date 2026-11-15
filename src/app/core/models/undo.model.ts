export interface UndoBudgetImpact {
  name: string;
  budgetAmount: number;
  spentNow: number;
  spentAfter: number;
  alertThresholdPercent: number;
}

export interface UndoableTransaction {
  transactionId: number;
  accountId: number;
  accountName: string;
  description: string;
  amount: number;
  type: number;            // 0 income, 1 expense
  date: string;
  categoryName?: string | null;
  deletedAt: string;
  secondsLeft: number;
  canUndo: boolean;
  blockedReason?: string | null;
  balanceNow: number;
  balanceAfter: number;
  isLiability: boolean;
  budget?: UndoBudgetImpact | null;
}

/** An undoable item with a client-side deadline derived from the server's `secondsLeft`. */
export interface UndoItem extends UndoableTransaction {
  expiresAtMs: number;
}
