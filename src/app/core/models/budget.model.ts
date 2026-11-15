export enum BudgetPeriod {
    Monthly = 1,
    Yearly = 2
}

export interface Budget {
    id: number;
    transactionCategoryId?: number;
    categoryName?: string;
    amount: number;
    period: BudgetPeriod;
    startDate: string;
    endDate?: string;
    alertThresholdPercent?: number | null;
}

export interface UpsertBudgetRequest {
    transactionCategoryId?: number;
    amount: number;
    period: BudgetPeriod;
    startDate: string;
    endDate?: string;
}

export interface BudgetProgress {
    budgetId: number;
    transactionCategoryId?: number;
    categoryName?: string;
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
    period: BudgetPeriod;
    startDate: string;
    endDate?: string;

    alertThresholdPercent: number;
    hasThresholdOverride: boolean;
    periodStart: string;
    periodEnd: string;
    daysTotal: number;
    daysElapsed: number;
    expectedPercent: number;
    projectedSpend: number;
    dailyAllowance: number;
    daysRemainingInPeriod: number;
    /** safe | alert | limit | over */
    status: BudgetStatus;
}

export type BudgetStatus = 'safe' | 'alert' | 'limit' | 'over';

export interface BudgetHistoryPoint { label: string; spent: number; budgeted: number; }

export interface BudgetAlertEvent {
    budgetId: number;
    categoryName?: string;
    level: number;
    thresholdPercent: number;
    percentUsed: number;
    spentAmount: number;
    budgetAmount: number;
    createdAt: string;
}

export interface BudgetAlert {
    budgetId: number;
    categoryName: string;
    level: number;
    thresholdPercent: number;
    percentUsed: number;
    spentAmount: number;
    budgetAmount: number;
}

export interface BudgetDashboard {
    budgets: BudgetProgress[];
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    percentUsed: number;
    safeCount: number;
    alertCount: number;
    overCount: number;
    periodStart: string;
    periodEnd: string;
    daysLeft: number;
    history: BudgetHistoryPoint[];
    recentAlerts: BudgetAlertEvent[];
    alertsThisPeriod: number;
    settings: { defaultAlertPercent: number; toastAlerts: boolean; emailAlerts: boolean };
    monthStartDay: number;
}

/** Colour grading shared by the dashboard widget and /budgets. */
export const BUDGET_STATUS_COLORS: Record<BudgetStatus, string> = {
    safe: '#10b981',
    alert: '#f59e0b',
    limit: '#ef4444',
    over: '#b91c1c'
};

export interface BudgetAlertPatterns {
  months: number;
  totalAlerts: number;
  warnings: number;
  breaches: number;
  insights: string[];
  categories: { categoryName: string; warnings: number; breaches: number; monthsBreached: number; avgBreachDay: number }[];
  byMonth: { label: string; warnings: number; breaches: number }[];
  byWeekday: number[];
  byPartOfMonth: number[];
}

export interface BudgetBreakdownRow {
  categoryId: number | null;
  name: string;
  spent: number;
  transactionCount: number;
  shareOfSpend: number;
  percentOfBudget: number;
  hasSubCategories: boolean;
}
export interface BudgetBreakdown {
  budgetId: number;
  name: string;
  budgetAmount: number;
  totalSpent: number;
  level: 'sub-categories' | 'categories';
  rows: BudgetBreakdownRow[];
}
