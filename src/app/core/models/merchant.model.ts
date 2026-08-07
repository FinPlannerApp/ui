export interface Merchant {
  id: number;
  name: string;
  aliases: string[];
}

export interface UpsertMerchantRequest {
  id?: number;
  name: string;
  aliases: string[];
}

export interface MerchantSpending {
  merchantId: number;
  merchantName: string;
  totalSpent: number;
  transactionCount: number;
}
