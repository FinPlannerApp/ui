export interface DecisionJournalEntry {
  id: number;
  title: string;
  reasoning: string;
  amount: number | null;
  decisionDate: string;
  outcome: string | null;
  outcomeRecordedAt: string | null;
}

export interface UpsertDecisionJournalEntryRequest {
  id?: number;
  title: string;
  reasoning: string;
  amount: number | null;
  decisionDate: string;
}

export interface RecordOutcomeRequest {
  id: number;
  outcome: string;
}
