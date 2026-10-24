/** Currencies a group can use. A display label only — amounts are never converted. */
export const SPLIT_CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { code: 'AED', label: 'UAE Dirham (AED)', symbol: 'AED ' },
  { code: 'SGD', label: 'Singapore Dollar (S$)', symbol: 'S$' },
  { code: 'THB', label: 'Thai Baht (฿)', symbol: '฿' },
  { code: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { code: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'CHF ' },
  { code: 'MYR', label: 'Malaysian Ringgit (RM)', symbol: 'RM ' },
  { code: 'IDR', label: 'Indonesian Rupiah (Rp)', symbol: 'Rp ' },
  { code: 'LKR', label: 'Sri Lankan Rupee (Rs)', symbol: 'Rs ' },
  { code: 'NPR', label: 'Nepalese Rupee (Rs)', symbol: 'Rs ' },
  { code: 'BDT', label: 'Bangladeshi Taka (৳)', symbol: '৳' },
  { code: 'NZD', label: 'New Zealand Dollar (NZ$)', symbol: 'NZ$' },
  { code: 'ZAR', label: 'South African Rand (R)', symbol: 'R ' }
];

export function currencySymbol(code: string | null | undefined): string {
  const found = SPLIT_CURRENCIES.find(c => c.code === (code || 'INR'));
  return found ? found.symbol : `${code} `;
}
