import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { GenericApi } from '../../core/services/generic-api';
import { sharedPrimeModules } from '../../shared/prime-imports';
import { Attachments } from '../../shared/components/attachments/attachments';

interface Policy {
  id: number; kind: number; name: string; insurer?: string | null; policyNumber?: string | null; insuredPeople?: string | null;
  nominee?: string | null; sumAssured: number; premium: number; premiumFrequency: number;
  startDate?: string | null; nextDueDate?: string | null; expiryDate?: string | null; waitingPeriodEnds?: string | null;
  notes?: string | null; isActive: boolean; payFromAccountId?: number | null; payFromAccountName?: string | null; autoRecord?: boolean;
  lastPaidOn?: string | null; totalPaid?: number; paymentsCount?: number; annualPremium: number; daysToDue: number | null; daysToExpiry: number | null; inWaitingPeriod: boolean;
}
interface Overview {
  policies: Policy[]; totalAnnualPremium: number; nextThirtyDaysPremium: number;
  byKind: { kind: number; sumAssured: number; annualPremium: number; policies: number }[];
}

export const INS_KINDS: Record<number, string> = {
  0: 'Health', 1: 'Term life', 2: 'Life / endowment', 3: 'Motor', 4: 'Home', 5: 'Travel', 6: 'Personal accident', 7: 'Critical illness', 8: 'Other',
};
const INS_ICONS: Record<number, string> = {
  0: 'pi-heart', 1: 'pi-shield', 2: 'pi-users', 3: 'pi-car', 4: 'pi-home', 5: 'pi-globe', 6: 'pi-exclamation-circle', 7: 'pi-plus-circle', 8: 'pi-file',
};
const INS_FREQ: Record<number, string> = { 0: 'Monthly', 1: 'Quarterly', 2: 'Half-yearly', 3: 'Yearly', 4: 'One-time' };
const INCOME_KEY = 'fp.insurance.annualIncome';

const blank = () => ({
  id: 0, kind: 0, name: '', insurer: '', policyNumber: '', insuredPeople: '', nominee: '',
  sumAssured: null as number | null, premium: null as number | null, premiumFrequency: 3,
  startDate: '', nextDueDate: '', expiryDate: '', waitingPeriodEnds: '', notes: '', isActive: true,
  payFromAccountId: null as number | null, autoRecord: false,
});

@Component({
  selector: 'app-insurance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, Attachments, ...sharedPrimeModules],
  templateUrl: './insurance.html',
})
export class Insurance {
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  readonly kindOptions = Object.entries(INS_KINDS).map(([v, l]) => ({ label: l, value: +v }));
  readonly freqOptions = Object.entries(INS_FREQ).map(([v, l]) => ({ label: l, value: +v }));
  readonly kindLabel = (k: number) => INS_KINDS[k] ?? 'Other';
  readonly kindIcon = (k: number) => 'pi ' + (INS_ICONS[k] ?? 'pi-file');
  readonly freqLabel = (f: number) => INS_FREQ[f] ?? '';

  data = signal<Overview | null>(null);
  loading = signal(true);
  failed = signal(false);
  saving = signal(false);
  showInactive = signal(false);

  accounts = signal<any[]>([]);
  /** Where a premium can be paid from: bank, credit card, cash or other, never a loan or an investment. */
  payAccounts = computed(() => this.accounts()
    .filter(a => { const t = a.accountType ?? a.accountCategory?.accountType; return t !== 2 && t !== 5; })
    .map(a => ({ label: a.name, value: a.id })));

  formOpen = false;
  form = blank();

  /** Optional, kept only in this browser; used for the rule-of-thumb cover check. */
  annualIncome = signal<number | null>(this.readIncome());

  visible = computed(() => {
    const d = this.data(); if (!d) return [];
    return d.policies.filter(p => this.showInactive() || (p.isActive && (p.daysToExpiry === null || p.daysToExpiry >= 0)));
  });
  hiddenCount = computed(() => (this.data()?.policies.length ?? 0) - this.visible().length);
  dueSoon = computed(() => (this.data()?.policies ?? [])
    .filter(p => p.isActive && p.daysToDue !== null && p.daysToDue <= 30)
    .sort((a, b) => (a.daysToDue ?? 0) - (b.daysToDue ?? 0)));
  termCover = computed(() => (this.data()?.byKind.find(k => k.kind === 1)?.sumAssured ?? 0));
  healthCover = computed(() => (this.data()?.byKind.find(k => k.kind === 0)?.sumAssured ?? 0));

  constructor() {
    this.load();
    this.api.post<any>('Accounts/search', { pageNumber: 1, pageSize: 100 }).subscribe({
      next: r => { if (r.isSuccess) this.accounts.set((r.value as any).data ?? []); }, error: () => { /* the form still works without a pay-from account */ },
    });
  }

  private readIncome(): number | null {
    try { const v = localStorage.getItem(INCOME_KEY); return v ? +v : null; } catch { return null; }
  }
  setIncome(v: number | null) {
    this.annualIncome.set(v && v > 0 ? v : null);
    try { if (v && v > 0) localStorage.setItem(INCOME_KEY, String(v)); else localStorage.removeItem(INCOME_KEY); } catch { /* storage unavailable */ }
  }

  dueText(p: Policy): string {
    if (p.daysToDue === null) return '';
    if (p.daysToDue < 0) return `Overdue by ${-p.daysToDue} day${p.daysToDue === -1 ? '' : 's'}`;
    if (p.daysToDue === 0) return 'Due today';
    return `Due in ${p.daysToDue} day${p.daysToDue === 1 ? '' : 's'}`;
  }
  expiryText(p: Policy): string {
    if (p.daysToExpiry === null) return '';
    if (p.daysToExpiry < 0) return 'Expired';
    if (p.daysToExpiry <= 60) return `Ends in ${p.daysToExpiry} day${p.daysToExpiry === 1 ? '' : 's'}`;
    return '';
  }

  load() {
    this.loading.set(true); this.failed.set(false);
    this.api.get<Overview>('Insurance/overview').subscribe({
      next: r => { if (r.isSuccess) this.data.set(r.value as Overview); else this.failed.set(true); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }

  private fail(r: any, fallback: string) {
    this.toast.add({ severity: 'error', summary: 'Not saved', detail: r?.error?.description ?? fallback });
  }
  private day = (s?: string | null) => (s ? s.slice(0, 10) : '');

  openNew() { this.form = blank(); this.formOpen = true; }
  openEdit(p: Policy) {
    this.form = {
      id: p.id, kind: p.kind, name: p.name, insurer: p.insurer ?? '', policyNumber: p.policyNumber ?? '', insuredPeople: p.insuredPeople ?? '',
      nominee: p.nominee ?? '', sumAssured: p.sumAssured, premium: p.premium, premiumFrequency: p.premiumFrequency,
      startDate: this.day(p.startDate), nextDueDate: this.day(p.nextDueDate), expiryDate: this.day(p.expiryDate),
      waitingPeriodEnds: this.day(p.waitingPeriodEnds), notes: p.notes ?? '', isActive: p.isActive,
      payFromAccountId: p.payFromAccountId ?? null, autoRecord: !!p.autoRecord,
    };
    this.formOpen = true;
  }

  save() {
    const f = this.form;
    if (!f.name.trim()) { this.toast.add({ severity: 'warn', summary: 'Name needed', detail: 'Give the policy a name.' }); return; }
    if (f.premiumFrequency !== 4 && f.premium && !f.nextDueDate) {
      this.toast.add({ severity: 'info', summary: 'No reminder', detail: 'Add the next due date if you want a reminder.' });
    }
    if (f.autoRecord && (!f.payFromAccountId || !f.nextDueDate || !f.premium)) {
      this.toast.add({ severity: 'warn', summary: 'Automatic recording needs more', detail: 'Choose the account to pay from, the premium and the next due date.' }); return;
    }
    this.saving.set(true);
    this.api.post<Policy>('Insurance/upsert', {
      id: f.id || null, kind: f.kind, name: f.name, insurer: f.insurer || null, policyNumber: f.policyNumber || null,
      insuredPeople: f.insuredPeople || null, nominee: f.nominee || null, sumAssured: f.sumAssured ?? 0, premium: f.premium ?? 0,
      premiumFrequency: f.premiumFrequency, startDate: f.startDate || null, nextDueDate: f.nextDueDate || null,
      expiryDate: f.expiryDate || null, waitingPeriodEnds: f.waitingPeriodEnds || null, notes: f.notes || null, isActive: f.isActive,
      payFromAccountId: f.payFromAccountId, autoRecord: f.autoRecord && !!f.payFromAccountId,
    }).subscribe({
      next: r => {
        this.saving.set(false);
        if (!r.isSuccess) return this.fail(r, 'Could not save the policy.');
        this.formOpen = false; this.toast.add({ severity: 'success', summary: 'Policy saved' }); this.load();
      },
      error: () => { this.saving.set(false); this.fail(null, 'Network problem. Nothing was saved.'); },
    });
  }

  markPaid(p: Policy) {
    this.api.post<Policy>('Insurance/mark-paid', { id: p.id }).subscribe({
      next: r => {
        if (!r.isSuccess) return this.fail(r, 'Could not update the due date.');
        this.toast.add({ severity: 'success', summary: 'Next due date moved', detail: 'Remember to log the premium as an expense (or use a recurring payment).' });
        this.load();
      },
      error: () => this.fail(null, 'Network problem.'),
    });
  }

  remove(p: Policy) {
    if (!confirm(`Delete "${p.name}"? This only removes the record here.`)) return;
    this.api.post<boolean>('Insurance/delete', { id: p.id }).subscribe({
      next: r => { if (!r.isSuccess) return this.fail(r, 'Could not delete.'); this.load(); },
      error: () => this.fail(null, 'Network problem.'),
    });
  }
}
