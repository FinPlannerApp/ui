export interface TransactionRule {
  id: number;
  name: string;
  matchText: string;
  /** 0 contains, 1 starts with, 2 equals */
  matchMode: number;
  /** null any, 0 income, 1 expense */
  typeFilter: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  transactionCategoryId: number | null;
  categoryName: string | null;
  merchantId: number | null;
  merchantName: string | null;
  tags: string[];
  priority: number;
  isActive: boolean;
}

export type UpsertTransactionRule = Partial<Omit<TransactionRule, 'categoryName' | 'merchantName'>>;

export interface RuleMatch {
  ruleId: number;
  ruleName: string;
  transactionCategoryId: number | null;
  merchantId: number | null;
  tags: string[];
}
