import { SplitType } from '../../core/models/split.model';

/** Client mirror of the API's SplitShareCalculator (paise, half-even rounding, last person absorbs remainder). */
export interface ShareInput {
  memberId: number;
  /** Exact amount, percentage or share count depending on the split type. */
  value?: number | null;
}

function toPaise(amount: number): number {
  return Math.round(amount * 100);
}

function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  if (Math.abs(x - floor - 0.5) < 1e-9) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.round(x);
}

/** Returns memberId -> share in rupees. */
export function computeShares(
  type: SplitType,
  totalAmount: number | null,
  inputs: ShareInput[]
): Record<number, number> {
  const out: Record<number, number> = {};
  if (inputs.length === 0) return out;

  if (type === SplitType.Exact) {
    for (const i of inputs) out[i.memberId] = i.value ?? 0;
    return out;
  }

  const total = toPaise(totalAmount ?? 0);
  if (total <= 0) {
    for (const i of inputs) out[i.memberId] = 0;
    return out;
  }

  let paise: number[];
  switch (type) {
    case SplitType.Percentage:
      paise = inputs.map(i => roundHalfEven(total * (i.value ?? 0) / 100));
      break;
    case SplitType.Shares: {
      const totalShares = inputs.reduce((sum, i) => sum + (i.value ?? 0), 0);
      paise = totalShares > 0
        ? inputs.map(i => roundHalfEven(total * (i.value ?? 0) / totalShares))
        : inputs.map(() => 0);
      break;
    }
    default: // Equal
      paise = inputs.map(() => roundHalfEven(total / inputs.length));
  }

  const validInput = type !== SplitType.Shares || inputs.some(i => (i.value ?? 0) > 0);
  if (validInput) {
    paise[paise.length - 1] += total - paise.reduce((a, b) => a + b, 0);
  }

  inputs.forEach((i, idx) => (out[i.memberId] = paise[idx] / 100));
  return out;
}

/** Equal percentages that add up to exactly 100. */
export function equalPercentages(memberIds: number[]): Record<number, number> {
  const out: Record<number, number> = {};
  if (memberIds.length === 0) return out;
  const each = Math.round((100 / memberIds.length) * 100) / 100;
  let used = 0;
  memberIds.forEach((id, idx) => {
    if (idx === memberIds.length - 1) {
      out[id] = Math.round((100 - used) * 100) / 100;
    } else {
      out[id] = each;
      used += each;
    }
  });
  return out;
}