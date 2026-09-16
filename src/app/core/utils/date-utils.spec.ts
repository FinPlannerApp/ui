import { toDateOnlyString, fromDateOnlyString } from './date-utils';

/**
 * These specifically test the fix for a real bug found during
 * development: Date.prototype.toISOString() converts through UTC,
 * which silently shifts a date backward by a day in any timezone
 * ahead of UTC (including India) — the root cause of a loan EMI date
 * disappearing from the obligations list after being saved. Every
 * test below is designed around that exact failure mode, not generic
 * date-handling coverage.
 */
describe('toDateOnlyString', () => {
  it('returns null for null input', () => {
    expect(toDateOnlyString(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(toDateOnlyString(undefined)).toBeNull();
  });

  it('formats a plain local date correctly, zero-padded', () => {
    const d = new Date(2026, 0, 5); // Jan 5, 2026 — month is 0-indexed in JS
    expect(toDateOnlyString(d)).toBe('2026-01-05');
  });

  it('does not zero-pad a two-digit day or month unnecessarily', () => {
    const d = new Date(2026, 11, 25); // Dec 25, 2026
    expect(toDateOnlyString(d)).toBe('2026-12-25');
  });

  it('never shifts the calendar date, regardless of time-of-day on the Date object', () => {
    // This is the actual regression test for the real bug. A Date
    // constructed at local midnight is exactly the case that
    // toISOString() got wrong — it would report the PREVIOUS day in
    // any timezone ahead of UTC. This function must return the exact
    // date that was constructed, with no dependency on the runtime's
    // configured timezone.
    const midnightLocal = new Date(2026, 2, 15, 0, 0, 0);
    expect(toDateOnlyString(midnightLocal)).toBe('2026-03-15');

    // Also true for a Date holding a specific time later in the day —
    // the time component must never influence which calendar day is
    // reported.
    const eveningLocal = new Date(2026, 2, 15, 23, 45, 0);
    expect(toDateOnlyString(eveningLocal)).toBe('2026-03-15');
  });

  it('handles a leap-year February 29 correctly', () => {
    const d = new Date(2028, 1, 29); // 2028 is a leap year
    expect(toDateOnlyString(d)).toBe('2028-02-29');
  });
});

describe('fromDateOnlyString', () => {
  it('returns null for null input', () => {
    expect(fromDateOnlyString(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(fromDateOnlyString(undefined)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(fromDateOnlyString('')).toBeNull();
  });

  it('parses a plain YYYY-MM-DD string into the correct local calendar date', () => {
    const result = fromDateOnlyString('2026-03-15');
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(2); // 0-indexed — March
    expect(result!.getDate()).toBe(15);
  });

  it('is not shifted by the runtime timezone — this is the mirror-image bug new Date(string) has', () => {
    // new Date('2026-03-15') (no explicit time) is parsed by the
    // JS engine as UTC midnight, which — in any timezone BEHIND UTC —
    // displays as March 14th locally, not March 15th. This function
    // exists specifically to avoid that; the result must genuinely be
    // local March 15th regardless of the runtime's own timezone.
    const result = fromDateOnlyString('2026-03-15');
    expect(result!.getDate()).toBe(15);
    expect(result!.getMonth()).toBe(2);
  });

  it('takes only the date portion when given a full ISO datetime string', () => {
    const result = fromDateOnlyString('2026-03-15T18:30:00.000Z');
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(2);
    expect(result!.getDate()).toBe(15);
  });

  it('round-trips correctly with toDateOnlyString for an arbitrary date', () => {
    const original = new Date(2026, 6, 4); // July 4, 2026
    const asString = toDateOnlyString(original);
    const parsedBack = fromDateOnlyString(asString);

    expect(parsedBack!.getFullYear()).toBe(original.getFullYear());
    expect(parsedBack!.getMonth()).toBe(original.getMonth());
    expect(parsedBack!.getDate()).toBe(original.getDate());
  });
});
