/**
 * Itemised bills: every dish/item is shared by the people who had it, and tax and tip
 * are shared in proportion to what each person ordered. Works in whole paise so the
 * per-person amounts always add up to exactly the bill total (the last person absorbs
 * any rounding remainder, like the server's share calculator).
 */
export interface BillItem {
  name: string;
  price: number | null;
  memberIds: number[];
}

export type ExtraMode = 'percent' | 'amount';

export interface ItemizeInput {
  items: BillItem[];
  /** Members in display order; the last one with a share absorbs rounding. */
  memberOrder: number[];
  taxMode: ExtraMode;
  taxValue: number | null;
  tipMode: ExtraMode;
  tipValue: number | null;
}

export interface ItemizeResult {
  /** memberId -> amount owed, in currency units. Only people with a share appear. */
  shares: Record<number, number>;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  /** Items with a price but nobody ticked, so they can't be billed to anyone. */
  unassignedItems: number;
}

const toPaise = (x: number | null | undefined): number => Math.round((x ?? 0) * 100);

function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  if (Math.abs(x - floor - 0.5) < 1e-9) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(x);
}

/** Splits `paise` between `weights`, proportionally, the last non-zero weight absorbing the remainder. */
function allocate(paise: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const out = weights.map(() => 0);
  if (paise === 0 || totalWeight <= 0) return out;
  let lastIdx = -1;
  weights.forEach((w, i) => {
    if (w > 0) {
      out[i] = roundHalfEven(paise * w / totalWeight);
      lastIdx = i;
    }
  });
  out[lastIdx] += paise - out.reduce((a, b) => a + b, 0);
  return out;
}

export function itemize(input: ItemizeInput): ItemizeResult {
  const order = input.memberOrder;
  const base: Record<number, number> = {};
  for (const id of order) base[id] = 0;
  let unassigned = 0;

  for (const item of input.items) {
    const price = toPaise(item.price);
    if (price <= 0) continue;
    const sharers = order.filter(id => item.memberIds.includes(id));
    if (sharers.length === 0) {
      unassigned++;
      continue;
    }
    const parts = allocate(price, sharers.map(() => 1));
    sharers.forEach((id, i) => (base[id] += parts[i]));
  }

  const subtotal = order.reduce((sum, id) => sum + base[id], 0);
  const extra = (mode: ExtraMode, value: number | null): number =>
    mode === 'percent' ? roundHalfEven(subtotal * Math.max(value ?? 0, 0) / 100) : toPaise(Math.max(value ?? 0, 0));
  const tax = extra(input.taxMode, input.taxValue);
  const tip = extra(input.tipMode, input.tipValue);

  const weights = order.map(id => base[id]);
  const taxParts = allocate(tax, weights);
  const tipParts = allocate(tip, weights);

  const shares: Record<number, number> = {};
  order.forEach((id, i) => {
    const paise = base[id] + taxParts[i] + tipParts[i];
    if (paise > 0) shares[id] = paise / 100;
  });

  return {
    shares,
    subtotal: subtotal / 100,
    tax: tax / 100,
    tip: tip / 100,
    total: (subtotal + tax + tip) / 100,
    unassignedItems: unassigned
  };
}
