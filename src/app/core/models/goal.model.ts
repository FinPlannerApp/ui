export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  isAchieved: boolean;
  savingsBucketId: number | null;
  savingsBucketName: string | null;
  linkedAccountId: number | null;
  linkedAccountName: string | null;
  /** Where currentAmount comes from. */
  source: 'bucket' | 'account' | 'manual';
  currentAmount: number;
  progressPercent: number;
  requiredMonthlySaving: number | null;
  status: 'achieved' | 'no-date' | 'overdue' | 'on-track' | 'behind' | 'not-started';
  expectedPercent: number | null;
  projectedDate: string | null;
  nextMilestonePercent: number | null;
  milestonesReached: number;
}

export interface UpsertGoalRequest {
  id?: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  savingsBucketId: number | null;
  /** Follow this account's live balance (used when no bucket is chosen). */
  linkedAccountId?: number | null;
  manualCurrentAmount: number;
}

export interface BucketOption {
  id: number;
  accountId: number;
  accountName: string;
  name: string;
  allocatedAmount: number;
  targetAmount: number | null;
}
