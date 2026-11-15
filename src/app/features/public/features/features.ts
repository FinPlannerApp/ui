import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective, SpotlightDirective } from '../../../shared/directives/reveal.directive';

interface Group { id: string; title: string; blurb: string; color: string; icon: string; items: { t: string; d: string }[]; }

@Component({
  selector: 'app-features',
  imports: [RouterLink, RevealDirective, SpotlightDirective],
  templateUrl: './features.html',
})
export class Features {
  readonly groups: Group[] = [
    { id: 'cash', title: 'Know what’s safe to spend', blurb: 'One honest number instead of a misleading balance.', color: '#10b981', icon: 'pi-wallet', items: [
      { t: 'Real Available Cash & Safe to Spend', d: 'Liquid cash minus card debt (including unpaid statements) minus upcoming commitments.' },
      { t: 'Cash roles per account', d: 'Spendable, Emergency fund, or Held for others — each counted the right way in net worth and cash.' },
      { t: 'Financial health score', d: 'Utilisation, cash cover and net-worth trend rolled into one score with the reasons behind it.' },
      { t: 'Upcoming obligations', d: 'See EMIs, bills and subscriptions due soon, and which ones actually reduce your cash.' } ] },
    { id: 'accounts', title: 'Accounts, cards & loans', blurb: 'Every kind of account, modelled the way it really works.', color: '#38bdf8', icon: 'pi-credit-card', items: [
      { t: 'Banks, cash & wallets', d: 'Unlimited accounts with custom categories, purposes, interest and charge details, archive and merge.' },
      { t: 'Credit-card statements', d: 'Statement date, total, minimum due, interest, GST and other charges; payments by any account; statement and payment history.' },
      { t: 'Cashback & reward points', d: 'Direct and indirect cashback, payment-app wallets and reward points with expiry.' },
      { t: 'Loans & EMIs', d: 'Principal/interest split, amortisation schedule, next due date and a designated paying account.' },
      { t: 'Data Health check', d: 'Finds balance drift, broken transfers, duplicates and overpaid bills — read-only, nothing changes without you.' } ] },
    { id: 'tx', title: 'Transactions without the busywork', blurb: 'Fast to enter, hard to get wrong.', color: '#818cf8', icon: 'pi-bolt', items: [
      { t: 'Search, filter & infinite scroll', d: 'Month view with brought-forward and closing balances that match your spendable cash.' },
      { t: 'Bulk add (up to 500 rows)', d: 'Dry-run validation for duplicates, future dates and overdrafts; applied in date order; safe to retry.' },
      { t: 'Transfers & switching', d: 'Move money between your accounts as linked entries, or switch a transaction to another account.' },
      { t: 'Merchants', d: 'Group the different ways a place shows up in your statements and see spend per merchant.' } ] },
    { id: 'plan', title: 'Plan ahead', blurb: 'Bills, budgets and goals that stay on schedule.', color: '#f59e0b', icon: 'pi-calendar', items: [
      { t: 'Recurring transactions', d: 'Daily, weekly, monthly, yearly or custom days; pause and resume; month-end dates never drift.' },
      { t: 'Subscriptions', d: 'Track what you pay for with tags and a cancellation link, plus nudges when it adds up.' },
      { t: 'Budgets', d: 'Per-category budgets with budget-vs-actual reports.' },
      { t: 'Goals & savings buckets', d: 'Reserve part of an account for a goal so the same rupee is never counted twice.' } ] },
    { id: 'split', title: 'Split with friends', blurb: 'Trips, flats and dinners without the spreadsheet.', color: '#ec4899', icon: 'pi-users', items: [
      { t: 'Flexible splits', d: 'Equal, exact, percentage or shares, with multiple payers on one expense.' },
      { t: 'UPI settle-up', d: 'Pay by UPI, cash or bank; the receiver confirms before it counts as settled.' },
      { t: 'Invites & public links', d: 'Friends without an account can be added by name; share an invite or a read-only view.' },
      { t: 'Live & auditable', d: 'Real-time updates, activity feed, receipts, restore deleted expenses and export.' } ] },
    { id: 'insight', title: 'Understand your money', blurb: 'Reports and nudges that explain, not just show.', color: '#14b8a6', icon: 'pi-chart-line', items: [
      { t: 'Insights', d: 'Spots lifestyle inflation, salary-day spikes and subscription creep.' },
      { t: 'Reports', d: 'Monthly summary, category analysis, budget vs actual, net worth and account statements (CSV).' },
      { t: 'Decision journal', d: 'Record why you made a big decision and how it turned out.' },
      { t: '30-day money challenge', d: 'A guided month of small steps with streaks.' } ] },
    { id: 'community', title: 'Shape the product', blurb: 'Your feedback directly drives what gets built.', color: '#a78bfa', icon: 'pi-comments', items: [
      { t: 'Feedback hub', d: 'Report bugs, request features, vote and comment; a public roadmap and kanban show what’s next.' },
      { t: 'Release notes & blog', d: 'See what changed and why.' } ] },
    { id: 'platform', title: 'Works everywhere', blurb: 'One account, every device.', color: '#f97316', icon: 'pi-mobile', items: [
      { t: 'Installable app', d: 'Add to your home screen; works on phone, tablet and desktop with light and dark themes.' },
      { t: 'Multi-device sign-in', d: 'Each device has its own session, with email verification for new devices.' } ] },
  ];

  readonly soon = ['Bank & card statement import', 'Investments (mutual funds, SIPs, stocks, FD/RD)', 'Interest posting for savings and deposits', 'Purchase planning with cooling-off periods', 'Reminders and push notifications'];
}
