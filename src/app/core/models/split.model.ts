export enum SplitType { Equal = 0, Exact = 1, Percentage = 2, Shares = 3 }
export enum SettlementMethod { Upi = 0, Cash = 1, BankTransfer = 2, Other = 3 }
export enum SettlementStatus { Pending = 0, Completed = 1 }

export interface SplitMember {
  id: number;
  name: string;
  linkedUserId: string | null;
  upiId: string | null;
}

export interface SplitGroup {
  id: number;
  name: string;
  currency: string;
  status: number;
  shareToken: string;
  members: SplitMember[];
  totalSpend: number;
}

export interface CreateGroupRequest {
  name: string;
  creatorName: string;
}

export interface ExpensePayerLine {
  memberId: number;
  amountPaid: number;
}

export interface ExpenseParticipantLine {
  memberId: number;
  exactAmount?: number | null;
  percentage?: number | null;
  shares?: number | null;
}

export interface CreateExpenseRequest {
  groupId: number;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  splitType: SplitType;
  payers: ExpensePayerLine[];
  participants: ExpenseParticipantLine[];
}

export interface PayerLine { memberName: string; amountPaid: number; }
export interface ParticipantLine { memberName: string; shareAmount: number; }

export interface SplitExpense {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  splitType: SplitType;
  payers: PayerLine[];
  participants: ParticipantLine[];
}

export interface MemberBalance {
  memberId: number;
  memberName: string;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface SimplifiedDebt {
  fromMemberId: number;
  fromMemberName: string;
  toMemberId: number;
  toMemberName: string;
  amount: number;
}

export interface GroupBalances {
  balances: MemberBalance[];
  simplifiedPlan: SimplifiedDebt[];
}

export interface CreateSettlementRequest {
  groupId: number;
  fromMemberId: number;
  toMemberId: number;
  amount: number;
  method: SettlementMethod;
}

export interface PaymentRequest {
  upiDeepLink: string;
  amount: number;
  recipientName: string;
  paymentReference: string;
}

export interface PublicGroupView {
  groupName: string;
  currency: string;
  members: SplitMember[];
  expenses: SplitExpense[];
  balances: GroupBalances;
}
