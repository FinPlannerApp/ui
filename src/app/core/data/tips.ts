/** One-line "how do I…" tips. Add new features here — the footer ticker and the Tips page both read this list. */
export interface Tip { area: string; text: string; link?: string; }

/** Which tips area a page belongs to, from its URL (used by the header "?" help button). */
export function areaForUrl(url: string): string {
  const seg = url.split('?')[0].split('/')[2] ?? '';
  const map: Record<string, string> = {
    accounts: 'Accounts', transactions: 'Transactions', budgets: 'Budgets', settings: 'Settings',
    subscriptions: 'Subscriptions', 'recurring-transactions': 'Recurring',
    'transaction-categories': 'Transactions', undo: 'Transactions', 'account-categories': 'Accounts'
  };
  return map[seg] ?? '';
}

export const TIPS: Tip[] = [
  { area: 'Accounts', text: 'Click an account card (or table row) to open its transactions.', link: '/app/accounts' },
  { area: 'Accounts', text: 'Change an account\'s limit, statement date, interest rate or minimum balance: open the account → ⚙ Settings.', link: '/app/accounts' },
  { area: 'Accounts', text: 'Balance doesn\'t match the bank? Account ⚙ Settings → Adjust balance records a visible correction.', link: '/app/accounts' },
  { area: 'Accounts', text: 'Delete an account from its ⚙ Settings → Danger zone. Its transactions stay saved.', link: '/app/accounts' },
  { area: 'Accounts', text: 'Hide balances with the eye button on Accounts — handy in public.', link: '/app/accounts' },
  { area: 'Credit cards', text: 'Record each statement; the card\'s transactions then show per statement cycle with spend-this-cycle.', link: '/app/accounts' },
  { area: 'Credit cards', text: 'Use Pay bill to settle a statement — it links the payment to that statement.', link: '/app/accounts' },
  { area: 'Transactions', text: 'Deleted by mistake? Open the Undo centre (sidebar) within 10 minutes: it shows what restoring will do to balances and budgets.', link: '/app/undo' },
  { area: 'Transactions', text: 'Add #tags (trip, work…) and a note to any transaction; click a tag in the list to see everything with it.', link: '/app/transactions' },
  { area: 'Transactions', text: 'Bulk add shows Quick Cards: your most repeated entries (Bus ₹16, Auto ₹18…). Tap one to add today\'s copy.', link: '/app/bulk-transaction-add' },
  { area: 'Transactions', text: 'Hide a Quick Card you never use with its ✕; it stays hidden on this device. By default cards need the same entry 3 times in the last 4 months; change this (or hide the strip) in Transactions → Settings.', link: '/app/bulk-transaction-add' },
  { area: 'Transactions', text: 'Set a default account and category in Transactions → Settings; Bulk add and the new-transaction form pre-fill them.', link: '/app/transactions/settings' },
  { area: 'Transactions', text: 'Tap Select on the transaction list to tick several rows, then set a category, add a tag or delete them together. Deletes can be undone for 10 minutes.', link: '/app/transactions' },
  { area: 'Transactions', text: 'Filtered by a category or search? Tap "Save this filter" to keep it as a one-tap chip above the list.', link: '/app/transactions' },
  { area: 'Transactions', text: 'Make a rule (Transactions → Rules): e.g. description contains “swiggy” → category Food. New transactions get filled in automatically, and your own choices are never overwritten.', link: '/app/transactions/rules' },
  { area: 'Transactions', text: 'The Transactions overview now has a spending heatmap for the month and your top merchants. Tag expenses with a merchant (or make a Rule that does) to fill it.', link: '/app/transactions/overview' },
  { area: 'Transactions', text: 'Tap the round + button (bottom right) to add a transaction in seconds: amount, what for, done. It remembers your last account and category, so repeat entries take a few taps.', link: '/app/dashboard' },
  { area: 'Transactions', text: 'Install the app on your phone and long-press its icon: "Add transaction" opens Quick add straight away.', link: '/app/dashboard' },
  { area: 'Transactions', text: 'Less typing: Quick Cards in Bulk add turn your repeat entries (Bus ₹16, Auto ₹18…) into one-tap cards, and Rules fill category and tags automatically.', link: '/app/bulk-transaction-add' },
  { area: 'Accounts', text: 'Accounts → What-ifs shows what an extra EMI, a prepayment or a rate change would save on a loan, and what paying only the minimum costs on a card.', link: '/app/accounts/what-if' },
  { area: 'Transactions', text: 'Want a nudge before bills fall due? Turn on Payment reminders in Settings → Notifications (off by default): a morning email lists subscriptions, premiums and card bills due in the next few days.', link: '/app/settings' },
  { area: 'Transactions', text: 'Attach a receipt to a transaction: edit it, or use the Documents link on the row (Drive upload or a share link).', link: '/app/transactions' },
  { area: 'Transactions', text: 'Use Bulk add to enter many transactions in one go.', link: '/app/transactions' },
  { area: 'Transactions', text: 'Import a bank or card statement to avoid typing transactions.', link: '/app/transactions' },
  { area: 'Transactions', text: 'Duplicate-entry guard and large-expense limit: Transactions → Settings.', link: '/app/transactions/settings' },
  { area: 'Budgets', text: 'Set a budget\'s own alert level when creating it, or a default for all in Budgets → Settings.', link: '/app/budgets/settings' },
  { area: 'Budgets', text: 'Budgets → Dashboard shows pace: the tick marks where you should be by today.', link: '/app/budgets' },
  { area: 'Settings', text: 'Salary on the 5th? Set “Your month” in App Settings so budgets and reports follow it.', link: '/app/settings' },
  { area: 'Settings', text: 'Email alerts are off by default. Turn on only what you want in App Settings → Notifications.', link: '/app/settings' },
  { area: 'Subscriptions', text: 'Get renewal alerts earlier or later: Subscriptions → Settings.', link: '/app/subscriptions/settings' },
  { area: 'Recurring', text: 'Recurring → Overview shows what is due in the next 30 days.', link: '/app/recurring-transactions/overview' },
];
