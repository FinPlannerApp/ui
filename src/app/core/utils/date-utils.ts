/**
 * Converts a local Date to a plain YYYY-MM-DD string using the date's
 * own local year/month/day — deliberately never goes through
 * toISOString(), which converts through UTC and silently shifts the
 * calendar date backward by a day in any timezone ahead of UTC
 * (India included). This is the root cause behind dates occasionally
 * vanishing or landing one day off after being saved.
 */
export function toDateOnlyString(d: Date | null | undefined): string | null {
  if (!d) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD (or full ISO datetime) string back into a Date
 * representing that calendar date at LOCAL midnight — deliberately
 * avoids new Date(dateOnlyString)'s own UTC-based parsing, which has
 * the mirror-image problem: it can shift a day BACKWARD when
 * displayed in timezones behind UTC.
 */
export function fromDateOnlyString(s: string | null | undefined): Date | null {
  if (!s) return null;
  const datePart = s.split('T')[0];
  const parts = datePart.split('-').map(Number);
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
