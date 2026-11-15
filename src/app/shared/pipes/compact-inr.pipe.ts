import { Pipe, PipeTransform } from '@angular/core';

/**
 * Short rupee amounts for tight tiles: ₹98,000 stays as is, ₹3,12,000 → ₹3.12L, ₹2,50,00,000 → ₹2.5Cr.
 * Pair it with a `title` carrying the full amount so nothing is hidden.
 */
@Pipe({ name: 'compactInr', standalone: true })
export class CompactInrPipe implements PipeTransform {
  transform(value: number | null | undefined, signed = false): string {
    if (value === null || value === undefined || isNaN(value)) return '—';
    const abs = Math.abs(value);
    const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
    const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');
    if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
    return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`;
  }
}
