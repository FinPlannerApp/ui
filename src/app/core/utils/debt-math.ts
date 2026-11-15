/** Pure maths for the loan and card what-ifs. Amounts in rupees, rates as yearly percent. */

export interface PayoffResult {
  /** Months until the balance is cleared, or null when the payment never covers the interest. */
  months: number | null;
  totalInterest: number;
  totalPaid: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Standard EMI for a principal, yearly rate and number of months. */
export function emi(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 1200;
  if (r === 0) return round2(principal / months);
  const f = Math.pow(1 + r, months);
  return round2(principal * r * f / (f - 1));
}

/** Month-by-month payoff with a fixed monthly payment (interest charged on the opening balance each month). */
export function payoff(balance: number, annualRate: number, payment: number, oneTime = 0, maxMonths = 1200): PayoffResult {
  let b = Math.max(0, balance - Math.max(0, oneTime));
  const r = annualRate / 1200;
  let interest = 0, paid = Math.max(0, oneTime), m = 0;
  if (b === 0) return { months: 0, totalInterest: 0, totalPaid: round2(paid) };
  if (payment <= b * r + 1e-9 && r > 0) return { months: null, totalInterest: 0, totalPaid: 0 };   // never clears
  while (b > 1 && m < maxMonths) {
    const i = b * r;
    interest += i;
    const pay = Math.min(payment, b + i);
    b = b + i - pay;
    paid += pay;
    m++;
  }
  if (b > 1) return { months: null, totalInterest: 0, totalPaid: 0 };
  return { months: m, totalInterest: round2(interest), totalPaid: round2(paid) };
}

/** Minimum due on a card: a percentage of the balance, never below a floor, never above the balance. */
export function cardMinimum(balance: number, percent: number, floor: number): number {
  return round2(Math.min(balance, Math.max(balance * percent / 100, floor)));
}

/** Pays only the minimum every month (the minimum shrinks with the balance) until the card is cleared. */
export function minimumOnlyPayoff(balance: number, annualRate: number, percent: number, floor: number, maxMonths = 1200): PayoffResult {
  let b = balance, interest = 0, paid = 0, m = 0;
  const r = annualRate / 1200;
  while (b > 1 && m < maxMonths) {
    const i = b * r;
    b += i; interest += i;
    const pay = cardMinimum(b, percent, floor);
    if (pay <= i && r > 0 && b > 1 && pay < b) return { months: null, totalInterest: 0, totalPaid: 0 };
    b -= pay; paid += pay; m++;
  }
  if (b > 1) return { months: null, totalInterest: 0, totalPaid: 0 };
  return { months: m, totalInterest: round2(interest), totalPaid: round2(paid) };
}

export function yearsMonths(months: number | null): string {
  if (months === null) return 'never';
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} yr` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || '0 mo';
}
