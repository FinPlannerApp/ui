export enum SplitType { Equal = 0, Exact = 1, Percentage = 2, Shares = 3 }
export enum SettlementMethod { Upi = 0, Cash = 1, BankTransfer = 2, Other = 3 }
export enum SettlementStatus { Pending = 0, AwaitingConfirmation = 1, Completed = 2 }

export interface SplitMember {
  id: number;
  name: string;
  linkedUserId: string | null;
  upiId: string | null;
  leftAt?: string | null;
}

export interface SplitGroup {
  id: number;
  name: string;
  createdByUserId: string;
  currency: string;
  /** true = fewest payments; false = pay back exactly who you owe. */
  simplifyDebts: boolean;
  /** A hidden two-person ledger for a friend (expenses outside any group). */
  isDirect?: boolean;
  /** Optional trip dates (ISO). */
  startDate?: string | null;
  endDate?: string | null;
  status: number;
  shareToken: string;
  members: SplitMember[];
  totalSpend: number;
}

export interface UpdateGroupSettingsRequest {
  currency: string;
  simplifyDebts: boolean;
  /** YYYY-MM-DD */
  startDate: string | null;
  endDate: string | null;
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
  notes?: string | null;
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
  notes?: string | null;
  /** Relative URL of the receipt photo (prefix with the API origin). */
  receiptUrl?: string | null;
  /** Only present in the "recently deleted" list. */
  deletedAt?: string | null;
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
  createdAt?: string;
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
  alreadyPaid?: boolean;
}

export interface UpdateSettlementRequest {
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
  /** Name-only members the joiner can claim as themselves. */
  unclaimedMembers: { id: number; name: string }[];
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

export type ExpenseSort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

/** Everything the expense list can be narrowed or re-ordered by (all optional). */
export interface ExpenseFilters {
  search?: string;
  category?: string | null;
  payerId?: number | null;
  participantId?: number | null;
  /** YYYY-MM-DD */
  from?: string | null;
  /** YYYY-MM-DD */
  to?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
  sort?: ExpenseSort;
}

export interface ActivityItem {
  id: number;
  actorName: string;
  type: string;
  /** Shown as "{actorName} {message}". */
  message: string;
  expenseId: number | null;
  createdAt: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  nextCursor: string | null;
}

export interface GlobalExpenseHit {
  expenseId: number;
  groupId: number;
  groupName: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  paidBy: string;
  currency: string;
}

// ── Friends & cross-group dashboard ─────────────────────────────────────────
export interface CreateFriendRequest {
  friendName: string;
  myName: string;
}

export interface DashboardLine {
  groupId: number;
  groupName: string;
  isDirect: boolean;
  currency: string;
  /** Positive = they owe you; negative = you owe them. */
  amount: number;
}

export interface DashboardTotal {
  currency: string;
  /** Positive = they owe you; negative = you owe them. */
  net: number;
}

export interface DashboardPerson {
  key: string;
  name: string;
  directGroupId: number | null;
  totals: DashboardTotal[];
  lines: DashboardLine[];
}

export interface DashboardCurrencyTotal {
  currency: string;
  youAreOwed: number;
  youOwe: number;
}

export interface SplitDashboard {
  totals: DashboardCurrencyTotal[];
  people: DashboardPerson[];
  groupCount: number;
}

export interface SettleWithPersonRequest {
  personKey: string;
  currency: string;
  method: SettlementMethod;
}

export interface SettleWithPersonResult {
  paymentsRecorded: number;
  net: number;
}


