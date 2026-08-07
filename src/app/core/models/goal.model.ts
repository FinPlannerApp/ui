export interface Goal {
  id: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  isAchieved: boolean;
  savingsBucketId: number | null;
  savingsBucketName: string | null;
  currentAmount: number;
  progressPercent: number;
  requiredMonthlySaving: number | null;
}

export interface UpsertGoalRequest {
  id?: number;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  savingsBucketId: number | null;
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
