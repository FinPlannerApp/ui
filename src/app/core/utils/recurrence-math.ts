import { RecurrenceFrequency } from '../models/recurring-transaction.model';

/** The API sends frequency as a name ("Monthly") on subscriptions and as a number on recurring items. */
export function toFrequency(f: string | number | null | undefined): RecurrenceFrequency {
  if (typeof f === 'number') return f as RecurrenceFrequency;
  switch ((f ?? '').toString().toLowerCase().replace(/[\s_-]/g, '')) {
    case 'daily': return RecurrenceFrequency.Daily;
    case 'weekly': return RecurrenceFrequency.Weekly;
    case 'monthly': return RecurrenceFrequency.Monthly;
    case 'quarterly': return RecurrenceFrequency.Quarterly;
    case 'halfyearly': return RecurrenceFrequency.HalfYearly;
    case 'yearly': return RecurrenceFrequency.Yearly;
    case 'onetime': return RecurrenceFrequency.OneTime;
    default: return RecurrenceFrequency.Custom;
  }
}

/** How many times a month one charge of this frequency costs on average. Custom/one-time are not estimated (0). */
export function monthlyFactor(f: RecurrenceFrequency): number {
  switch (f) {
    case RecurrenceFrequency.Daily: return 30.44;
    case RecurrenceFrequency.Weekly: return 52 / 12;
    case RecurrenceFrequency.Monthly: return 1;
    case RecurrenceFrequency.Quarterly: return 1 / 3;
    case RecurrenceFrequency.HalfYearly: return 1 / 6;
    case RecurrenceFrequency.Yearly: return 1 / 12;
    default: return 0;
  }
}

/** The occurrence after `d`, or null when the frequency has no fixed step (custom weekdays, one-time). */
export function stepDate(d: Date, f: RecurrenceFrequency): Date | null {
  const n = new Date(d);
  const day = d.getDate();
  const addMonths = (m: number) => {
    n.setDate(1); n.setMonth(n.getMonth() + m);
    n.setDate(Math.min(day, new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate())); // 31 Jan → 28/29 Feb
  };
  switch (f) {
    case RecurrenceFrequency.Daily: n.setDate(n.getDate() + 1); break;
    case RecurrenceFrequency.Weekly: n.setDate(n.getDate() + 7); break;
    case RecurrenceFrequency.Monthly: addMonths(1); break;
    case RecurrenceFrequency.Quarterly: addMonths(3); break;
    case RecurrenceFrequency.HalfYearly: addMonths(6); break;
    case RecurrenceFrequency.Yearly: addMonths(12); break;
    default: return null;
  }
  return n;
}

/** Every occurrence from `next` (its next due date) up to and including `to`. Capped so a daily item can't flood the UI. */
export function occurrencesBetween(next: Date, f: RecurrenceFrequency, to: Date, endDate?: Date | null, cap = 120): Date[] {
  const out: Date[] = [];
  let cur: Date | null = new Date(next);
  while (cur && cur <= to && out.length < cap) {
    if (endDate && cur > endDate) break;
    out.push(new Date(cur));
    cur = stepDate(cur, f);
  }
  return out;
}

export function startOfToday(): Date { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }
export function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86_400_000); }
