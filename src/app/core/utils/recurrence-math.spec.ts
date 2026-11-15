import { RecurrenceFrequency } from '../models/recurring-transaction.model';
import { monthlyFactor, occurrencesBetween, stepDate, toFrequency } from './recurrence-math';

describe('recurrence-math', () => {
  it('maps API frequency names and numbers', () => {
    expect(toFrequency('Monthly')).toBe(RecurrenceFrequency.Monthly);
    expect(toFrequency('HalfYearly')).toBe(RecurrenceFrequency.HalfYearly);
    expect(toFrequency(4)).toBe(RecurrenceFrequency.Yearly);
  });

  it('normalises billing cycles to a monthly cost', () => {
    expect(monthlyFactor(RecurrenceFrequency.Yearly)).toBeCloseTo(1 / 12);
    expect(monthlyFactor(RecurrenceFrequency.Quarterly)).toBeCloseTo(1 / 3);
    expect(monthlyFactor(RecurrenceFrequency.OneTime)).toBe(0);
  });

  it('clamps a 31st to the end of a shorter month', () => {
    const next = stepDate(new Date(2026, 0, 31), RecurrenceFrequency.Monthly)!;
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it('lists occurrences up to the horizon and stops at the end date', () => {
    const list = occurrencesBetween(new Date(2026, 0, 1), RecurrenceFrequency.Weekly, new Date(2026, 0, 31));
    expect(list.length).toBe(5);
    const capped = occurrencesBetween(new Date(2026, 0, 1), RecurrenceFrequency.Weekly, new Date(2026, 0, 31), new Date(2026, 0, 15));
    expect(capped.length).toBe(3);
  });
});
