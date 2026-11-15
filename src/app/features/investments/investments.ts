import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { GenericApi } from '../../core/services/generic-api';
import { sharedPrimeModules } from '../../shared/prime-imports';

interface Holding {
  accountId: number; name: string; kind: number; symbol?: string | null; notes?: string | null;
  netInvested: number; currentValue: number | null; valuedOn: string | null; isStale: boolean;
  gain: number; gainPercent: number | null; xirrPercent: number | null; monthlySip: number;
  units?: number | null; autoValuation?: boolean; lastPrice?: number | null; lastPriceDate?: string | null; lastPriceError?: string | null;
}
interface Overview {
  totalNetInvested: number; totalValue: number; totalGain: number; totalGainPercent: number | null;
  portfolioXirrPercent: number | null; monthlySipTotal: number;
  holdings: Holding[];
  allocation: { kind: number; value: number; percent: number }[];
  sips: { recurringId: number; description: string; amount: number; frequency: number; nextDate: string; fundingAccountName: string; investmentName: string }[];
}

export const KIND_LABELS: Record<number, string> = {
  0: 'Mutual fund', 1: 'Stock', 2: 'Fixed deposit', 3: 'Recurring deposit', 4: 'PPF', 5: 'EPF', 6: 'Gold', 7: 'Other',
  8: 'NPS', 9: 'Bond / SGB', 10: 'ETF', 11: 'Real estate', 12: 'Crypto', 13: 'Post office scheme',
};
const FREQ: Record<number, string> = { 1: 'Daily', 2: 'Weekly', 3: 'Monthly', 4: 'Yearly', 5: 'Custom', 6: 'One-time' };
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];

@Component({
  selector: 'app-investments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './investments.html',
})
export class Investments {
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  readonly kindOptions = Object.entries(KIND_LABELS).map(([v, l]) => ({ label: l, value: +v }));
  readonly kindLabel = (k: number) => KIND_LABELS[k] ?? 'Other';
  readonly freqLabel = (f: number) => FREQ[f] ?? '';
  readonly color = (i: number) => COLORS[i % COLORS.length];

  data = signal<Overview | null>(null);
  loading = signal(true);
  failed = signal(false);

  // add dialog
  addOpen = false;
  add = { name: '', kind: 0, investedSoFar: 0 as number | null, currentValue: null as number | null, symbol: '', units: null as number | null, auto: false };
  // valuation dialog
  valOpen = false;
  val = { accountId: 0, name: '', kind: 0, currentValue: null as number | null, valuedOn: new Date().toISOString().slice(0, 10), notes: '', symbol: '', units: null as number | null, auto: false };
  refreshing = signal(false);

  // withdrawal dialog
  wdOpen = false;
  wd = { accountId: 0, name: '', destinationAccountId: null as number | null, date: new Date().toISOString().slice(0, 10), receivedAmount: null as number | null, grossAmount: null as number | null, notes: '' };
  wdPreview = signal<{ gross: number; charges: number; costRedeemed: number; gain: number; valueBefore: number; valueAfter: number; estimated: boolean; warning?: string | null } | null>(null);
  accounts = signal<any[]>([]);
  /** Where withdrawn money can land: bank, cash or other; never a card, loan or investment. */
  destAccounts = computed(() => this.accounts()
    .filter(a => { const t = a.accountType ?? a.accountCategory?.accountType; return t === 0 || t === 3 || t === 4; })
    .map(a => ({ label: a.name, value: a.id })));

  /** Which kinds can be valued automatically, and what to type as the symbol. */
  autoCapable = (k: number) => k === 0 || k === 1 || k === 10;
  symbolHint = (k: number) => k === 0 ? 'AMFI scheme code, e.g. 120716' : 'Ticker, e.g. RELIANCE.NS (NSE) or 500325.BO (BSE)';
  unitsLabel = (k: number) => k === 0 ? 'Units held' : 'Shares held';
  saving = signal(false);

  // illustration only
  projReturn: number | null = null;
  projYears = 10;
  projStepUp = 0;
  readonly yearOptions = [5, 10, 15, 20].map(y => ({ label: y + ' years', value: y }));

  /** What today's value plus today's SIPs could become at an assumed yearly return. An illustration, not a forecast. */
  projection(d: Overview) {
    const guess = d.portfolioXirrPercent ?? 10;
    const rate = (this.projReturn ?? Math.min(15, Math.max(4, guess))) / 100;
    const m = Math.pow(1 + rate, 1 / 12) - 1;
    let value = d.totalValue, put = 0, sip = d.monthlySipTotal;
    for (let i = 1; i <= this.projYears * 12; i++) {
      value = value * (1 + m) + sip; put += sip;
      if (i % 12 === 0) sip *= 1 + (this.projStepUp || 0) / 100;
    }
    return { value: Math.round(value), contributed: Math.round(put), rate: Math.round(rate * 1000) / 10 };
  }

  empty = computed(() => (this.data()?.holdings.length ?? 0) === 0);

  constructor() {
    this.load();
    this.api.post<any>('Accounts/search', { pageNumber: 1, pageSize: 100 }).subscribe({
      next: r => { if (r.isSuccess) this.accounts.set((r.value as any).data ?? []); }, error: () => { /* withdrawal needs the list; the dialog says so */ },
    });
  }

  load() {
    this.loading.set(true); this.failed.set(false);
    this.api.get<Overview>('Accounts/investments-overview').subscribe({
      next: r => { if (r.isSuccess) this.data.set(r.value as Overview); else this.failed.set(true); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }

  openAdd() { this.add = { name: '', kind: 0, investedSoFar: 0, currentValue: null, symbol: '', units: null, auto: false }; this.addOpen = true; }
  openVal(h: Holding) {
    this.val = { accountId: h.accountId, name: h.name, kind: h.kind, currentValue: h.autoValuation ? null : (h.currentValue ?? h.netInvested), valuedOn: new Date().toISOString().slice(0, 10), notes: h.notes ?? '', symbol: h.symbol ?? '', units: h.units ?? null, auto: !!h.autoValuation };
    this.valOpen = true;
  }

  openWithdraw(h: Holding) {
    this.wd = { accountId: h.accountId, name: h.name, destinationAccountId: null, date: new Date().toISOString().slice(0, 10), receivedAmount: null, grossAmount: null, notes: '' };
    this.wdPreview.set(null); this.wdOpen = true;
  }

  private wdPayload() {
    return {
      accountId: this.wd.accountId, destinationAccountId: this.wd.destinationAccountId, date: this.wd.date,
      receivedAmount: this.wd.receivedAmount, grossAmount: this.wd.grossAmount, notes: this.wd.notes || null,
    };
  }

  previewWithdraw() {
    if (!this.wd.destinationAccountId || !this.wd.receivedAmount) { this.toast.add({ severity: 'warn', summary: 'Missing details', detail: 'Choose the account and enter the amount you received.' }); return; }
    this.saving.set(true);
    this.api.post<any>('Flow/investment-withdraw-preview', this.wdPayload()).subscribe({
      next: r => { this.saving.set(false); if (!r.isSuccess) { this.wdPreview.set(null); return this.fail(r, 'Could not work this out.'); } this.wdPreview.set(r.value); },
      error: () => { this.saving.set(false); this.fail(null, 'Network problem.'); },
    });
  }

  confirmWithdraw() {
    this.saving.set(true);
    this.api.post<any>('Flow/investment-withdraw', this.wdPayload()).subscribe({
      next: r => {
        this.saving.set(false);
        if (!r.isSuccess) return this.fail(r, 'Could not record the withdrawal.');
        this.wdOpen = false; this.toast.add({ severity: 'success', summary: 'Withdrawal recorded' }); this.load();
      },
      error: () => { this.saving.set(false); this.fail(null, 'Network problem. Nothing was saved.'); },
    });
  }

  private fail(r: any, fallback: string) {
    this.toast.add({ severity: 'error', summary: 'Not saved', detail: r?.error?.description ?? fallback });
  }

  refreshPrices() {
    this.refreshing.set(true);
    this.api.post<string>('Accounts/investments-refresh', {}).subscribe({
      next: r => {
        this.refreshing.set(false);
        if (!r.isSuccess) return this.fail(r, 'Could not refresh prices.');
        this.toast.add({ severity: 'info', summary: 'Prices', detail: String(r.value) }); this.load();
      },
      error: () => { this.refreshing.set(false); this.fail(null, 'Network problem.'); },
    });
  }

  saveAdd() {
    if (!this.add.name.trim()) { this.toast.add({ severity: 'warn', summary: 'Name needed', detail: 'Give the investment a name.' }); return; }
    this.saving.set(true);
    this.api.post<number>('Accounts/investment-create', {
      name: this.add.name, kind: this.add.kind, investedSoFar: this.add.investedSoFar ?? 0,
      currentValue: this.add.currentValue, symbol: this.add.symbol || null, units: this.add.units, autoValuation: this.add.auto,
    }).subscribe({
      next: r => {
        this.saving.set(false);
        if (!r.isSuccess) return this.fail(r, 'Could not create the investment.');
        this.addOpen = false; this.toast.add({ severity: 'success', summary: 'Investment added' }); this.load();
      },
      error: () => { this.saving.set(false); this.fail(null, 'Network problem. Nothing was saved.'); },
    });
  }

  saveVal() {
    if (!this.val.auto && (this.val.currentValue == null || this.val.currentValue < 0)) { this.toast.add({ severity: 'warn', summary: 'Value needed', detail: 'Enter what it is worth today.' }); return; }
    this.saving.set(true);
    this.api.post<boolean>('Accounts/investment-valuation', {
      accountId: this.val.accountId, kind: this.val.kind, currentValue: this.val.auto ? null : this.val.currentValue, valuedOn: this.val.valuedOn,
      notes: this.val.notes, symbol: this.val.symbol, units: this.val.units, autoValuation: this.val.auto,
    }).subscribe({
      next: r => {
        this.saving.set(false);
        if (!r.isSuccess) return this.fail(r, 'Could not save the valuation.');
        this.valOpen = false; this.toast.add({ severity: 'success', summary: 'Value updated' }); this.load();
      },
      error: () => { this.saving.set(false); this.fail(null, 'Network problem. Nothing was saved.'); },
    });
  }
}
