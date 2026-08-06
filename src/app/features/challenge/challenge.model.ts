// Matches ChallengeDayDto / ChallengeOverviewDto from the backend exactly.
// camelCase here because ASP.NET Core's default System.Text.Json config
// serializes PascalCase C# properties to camelCase JSON — confirmed by
// every other model in this codebase (Account, Transaction, etc.) already
// following that same convention.

export interface ChallengeDay {
  id: number;
  dayNumber: number;
  weekNumber: number;
  title: string;
  description: string;
  isRestDay: boolean;
  requiresReflection: boolean;
  actionRoute: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  reflectionText: string | null;
}

export interface ChallengeOverview {
  startedAt: string;
  currentDayNumber: number;
  currentStreak: number;
  longestStreak: number;
  completedDaysCount: number;
  totalActionableDays: number;
  isFullyCompleted: boolean;
  completedAt: string | null;
  days: ChallengeDay[];
}

export interface MarkDayCompleteRequest {
  challengeDayId: number;
  reflectionText?: string | null;
}

export interface UnmarkDayRequest {
  challengeDayId: number;
}
