import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { GenericApi } from '../../../core/services/generic-api';
import { PageHeader } from '../../../shared/components/page-header/page-header';

interface IntegrityIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  accountName?: string | null;
  amount?: number | null;
}
interface IntegrityReport {
  generatedAtUtc: string;
  accountsChecked: number;
  transactionsChecked: number;
  issues: IntegrityIssue[];
}

/** Read-only "Data health" report: shows where stored balances, transfers, duplicates or card bills disagree. */
@Component({
  selector: 'app-data-health',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, CurrencyPipe, DatePipe, PageHeader, RouterLink],
  template: `
    <div class="page">
      <app-page-header title="Data health" subtitle="Checks your balances, transfers, duplicates and card bills against your transactions. Nothing here changes your data.">
        <p-button label="Re-check" icon="pi pi-refresh" [loading]="loading()" (onClick)="load()" />
        <a routerLink="/app/accounts" class="p-button p-button-text p-button-sm">Back to accounts</a>
      </app-page-header>

      @if (error()) { <p class="text-sm" style="color:var(--danger,#f87171)">{{ error() }}</p> }

      @if (report(); as r) {
        <p class="text-sm" style="color:var(--text-dim)">
          Checked {{ r.accountsChecked }} accounts and {{ r.transactionsChecked }} transactions · {{ r.generatedAtUtc | date:'medium' }}
        </p>
        @if (!r.issues.length) {
          <div class="issue ok"><strong>All good.</strong> No mismatches found.</div>
        }
        @for (i of r.issues; track $index) {
          <div class="issue" [class]="i.severity">
            <div class="head">
              <span class="badge">{{ i.severity }}</span>
              <strong>{{ i.title }}</strong>
              @if (i.accountName) { <span class="acct">{{ i.accountName }}</span> }
              @if (i.amount != null) { <span class="amt">{{ i.amount | currency:'INR' }}</span> }
            </div>
            <p>{{ i.detail }}</p>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .issue { border: 1px solid var(--border, #334155); border-left-width: 4px; border-radius: 12px; padding: .75rem 1rem; margin-bottom: .75rem; background: var(--surface, transparent); }
    .issue p { margin: .35rem 0 0; font-size: .875rem; color: var(--text-dim, #94a3b8); }
    .issue.error { border-left-color: #f87171; } .issue.warning { border-left-color: #fbbf24; }
    .issue.info { border-left-color: #60a5fa; } .issue.ok { border-left-color: #34d399; }
    .head { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
    .badge { text-transform: uppercase; font-size: .65rem; letter-spacing: .05em; padding: .1rem .45rem; border-radius: 999px; background: rgba(148,163,184,.2); }
    .amt { margin-left: auto; font-variant-numeric: tabular-nums; }
    .acct { font-size: .8rem; color: var(--text-dim, #94a3b8); }
  `],
})
export class DataHealth implements OnInit {
  private readonly api = inject(GenericApi);
  readonly report = signal<IntegrityReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void { void this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(this.api.get<IntegrityReport>('Accounts/integrity'));
      if (res.isSuccess) this.report.set(res.value);
      else this.error.set(res.error?.description ?? 'Could not run the check.');
    } catch {
      this.error.set('Could not run the check.');
    } finally {
      this.loading.set(false);
    }
  }
}
