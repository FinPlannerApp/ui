export interface SavingsBucket {
  id: number;
  accountId: number;
  accountName: string;
  name: string;
  allocatedAmount: number;
  targetAmount: number | null;
}

export interface AccountBucketBreakdown {
  accountId: number;
  accountBalance: number;
  totalAllocated: number;
  unallocated: number;
  buckets: SavingsBucket[];
}

export interface UpsertSavingsBucketRequest {
  id?: number;
  accountId: number;
  name: string;
  allocatedAmount: number;
  targetAmount: number | null;
}
