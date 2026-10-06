import { SplitExpense } from '../../core/models/split.model';
import { fromDateOnlyString, toDateOnlyString } from '../../core/utils/date-utils';

export function expenseDayKey(e: Pick<SplitExpense, 'date'>): string {
  return (e.date ?? '').split('T')[0];
}

/** Same order as the API: newest day first, then highest id first. */
export function compareExpenses(a: SplitExpense, b: SplitExpense): number {
  const da = expenseDayKey(a);
  const db = expenseDayKey(b);
  if (da !== db) return da < db ? 1 : -1;
  return b.id - a.id;
}

export interface ExpenseDayGroup {
  dayKey: string;
  label: string; // "Today", "Yesterday" or ''
  date: Date | null;
  total: number;
  items: SplitExpense[];
}

export function groupExpensesByDay(sorted: SplitExpense[], now: Date = new Date()): ExpenseDayGroup[] {
  const today = toDateOnlyString(now);
  const yesterday = toDateOnlyString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  const groups: ExpenseDayGroup[] = [];
  for (const e of sorted) {
    const key = expenseDayKey(e);
    let g = groups[groups.length - 1];
    if (!g || g.dayKey !== key) {
      g = {
        dayKey: key,
        label: key === today ? 'Today' : key === yesterday ? 'Yesterday' : '',
        date: fromDateOnlyString(key),
        total: 0,
        items: []
      };
      groups.push(g);
    }
    g.items.push(e);
    g.total += e.amount;
  }
  return groups;
}