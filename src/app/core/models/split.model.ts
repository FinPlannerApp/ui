export enum SplitType { Equal = 0, Exact = 1, Percentage = 2, Shares = 3 }
export enum SettlementMethod { Upi = 0, Cash = 1, BankTransfer = 2, Other = 3 }
export enum SettlementStatus { Pending = 0, AwaitingConfirmation = 1, Completed = 2 }

export interface SplitMember {
  id: number;
  name: string;
  linkedUserId: string | null;
  upiId: string | null;
}

export interface SplitGroup {
  id: number;
  name: string;
  createdByUserId: string;
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

export interface UpdateGroupRequest {
  groupId: number;
  name: string;
}

export interface RenameMemberRequest {
  memberId: number;
  name: string;
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

export interface PayerLine {
  memberId: number;
  memberName: string;
  amountPaid: number;
}

export interface ParticipantLine {
  memberId: number;
  memberName: string;
  shareAmount: number;
  /** Raw input behind the share: exact amount / percentage / share count (null for Equal). */
  splitValue?: number | null;
}
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
  totalPaid?: number;
  totalShare?: number;
  settledPaid?: number;
  settledReceived?: number;
  /** Signed amount of payments marked "sent" but not yet confirmed (+ sender, - receiver). */
  inTransit?: number;
  /** totalPaid - totalShare + settledPaid - settledReceived. Positive = owed money. */
  netBalance: number;
}

export interface SimplifiedDebt {
  fromMemberId: number;
  fromMemberName: string;
  toMemberId: number;
  toMemberName: string;
  amount: number;
}

export interface Settlement {
  id: number;
  fromMemberId: number;
  fromMemberName: string;
  toMemberId: number;
  toMemberName: string;
  amount: number;
  method: SettlementMethod;
  status: SettlementStatus;
  paymentReference: string;
  completedAt: string | null;
}

export interface CategorySpend {
  category: string;
  amount: number;
  count: number;
}

export interface GroupBalances {
  balances: MemberBalance[];
  simplifiedPlan: SimplifiedDebt[];
  categoryBreakdown?: CategorySpend[];
  expenseCount?: number;
}

export interface ExpensePage {
  items: SplitExpense[];
  nextCursor: string | null;
  totalCount: number;
}

export interface GroupFullDetails {
  group: SplitGroup;
  expenses: SplitExpense[];
  nextCursor: string | null;
  totalExpenseCount: number;
  balances: GroupBalances;
}

export interface GroupExport {
  groupName: string;
  currency: string;
  exportedAtUtc: string;
  members: SplitMember[];
  expenses: SplitExpense[];
  settlements: Settlement[];
  balances: GroupBalances;
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
  nextCursor?: string | null;
  totalExpenseCount?: number;
  balances: GroupBalances;
}

export interface InvitePreview {
  groupName: string;
  memberCount: number;
  isValid: boolean;
  invalidReason: string | null;
}

export interface CreateInviteRequest {
  groupId: number;
  expiresAt: string | null;
  maxUses: number | null;
}

export interface InviteCreated {
  token: string;
  expiresAt: string | null;
  maxUses: number | null;
}

export interface ImportToLedgerRequest {
  groupId: number;
  accountId: number;
}

export interface ImportToLedgerResult {
  transactionsCreated: number;
  alreadyImportedCount: number;
}


