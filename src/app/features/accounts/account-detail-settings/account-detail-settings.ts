import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { AccountState } from '../../../core/state/account-state.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AccountForm } from '../account-form/account-form';
import { AdjustBalance } from '../adjust-balance/adjust-balance';

/** Everything about ONE account that you change rarely: its terms, balance corrections and deletion. */
@Component({
  selector: 'app-account-detail-settings',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, RouterLink, AccountForm, ...sharedPrimeModules],
  providers: [DialogService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto flex flex-col gap-4">
      <nav class="text-xs flex items-center gap-1.5" style="color:var(--text-dim)">
        <a routerLink="/app/accounts" class="no-underline text-[var(--text-muted)] hover:text-[var(--primary-color)]">Accounts</a>
        <i class="pi pi-angle-right text-[10px]"></i>
        @if (account(); as a) {
          <a [routerLink]="['/app/accounts', a.id, 'transactions']" class="no-underline text-[var(--text-muted)] hover:text-[var(--primary-color)]">{{ a.name }}</a>
          <i class="pi pi-angle-right text-[10px]"></i>
        }
        <span>Settings</span>
      </nav>

      @if (loading()) {
        <p class="text-sm" style="color:var(--text-dim)">Loading…</p>
      } @else if (!account()) {
        <div class="glass-card p-6 rounded-2xl">Account not found. <a routerLink="/app/accounts">Back to accounts</a></div>
      } @else {
        @let a = account()!;
        <header class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 class="text-2xl font-extrabold m-0">{{ a.name }} · Settings</h1>
            <p class="text-xs m-0 mt-1" style="color:var(--text-dim)">{{ a.accountCategoryName }} · balance {{ a.balance | currency:'INR':'symbol':'1.2-2' }}</p>
          </div>
          <a [routerLink]="['/app/accounts', a.id, 'transactions']" class="p-button p-button-text p-button-sm no-underline">
            <i class="pi pi-list mr-2"></i>View transactions
          </a>
        </header>

        <section class="glass-card p-4 sm:p-5 rounded-2xl" aria-labelledby="det">
          <h2 id="det" class="text-base font-extrabold m-0 mb-1">Details &amp; terms</h2>
          <p class="text-xs m-0 mb-3" style="color:var(--text-dim)">
            Name, category, and — depending on the account type — credit limit, statement and due dates, interest rate and mode, minimum balance.
          </p>
          <app-account-form [embeddedAccount]="a" (saved)="onSaved()" />
        </section>

        <section class="glass-card p-4 sm:p-5 rounded-2xl" aria-labelledby="bal">
          <h2 id="bal" class="text-base font-extrabold m-0 mb-1">Balance &amp; corrections</h2>
          <p class="text-xs m-0 mb-3" style="color:var(--text-dim)">
            If the balance doesn't match your bank, correct it here. It records a visible “Balance Adjustment” transaction — nothing is silently overwritten.
          </p>
          <p-button label="Adjust balance" icon="pi pi-sliders-h" severity="warn" [outlined]="true" (onClick)="adjust()"></p-button>
        </section>

        <section class="glass-card p-4 sm:p-5 rounded-2xl border border-red-500/40" aria-labelledby="dng">
          <h2 id="dng" class="text-base font-extrabold m-0 mb-1 text-red-400">Danger zone</h2>
          <p class="text-xs m-0 mb-3" style="color:var(--text-dim)">
            Deleting removes the account from your lists. Its transactions stay saved. To confirm, type the account name:
            <strong>{{ a.name }}</strong>
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <input pInputText class="grow min-w-[12rem]" [ngModel]="typed()" (ngModelChange)="typed.set($event)" placeholder="Type the account name" aria-label="Type the account name to confirm" />
            <p-button label="Delete account" icon="pi pi-trash" severity="danger" [disabled]="!canDelete()" [loading]="deleting()" (onClick)="remove()"></p-button>
          </div>
        </section>
      }
    </div>
  `
})
export class AccountDetailSettings implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private state = inject(AccountState);
  private notify = inject(NotificationService);
  private dialogs = inject(DialogService);

  private id = signal<number | null>(null);
  loading = signal(true);
  typed = signal('');
  deleting = signal(false);

  account = computed(() => {
    const id = this.id();
    return id === null ? null : this.state.accounts().find(a => a.id === id) ?? null;
  });
  canDelete = computed(() => {
    const a = this.account();
    return !!a && this.typed().trim().toLowerCase() === a.name.trim().toLowerCase();
  });

  async ngOnInit(): Promise<void> {
    this.id.set(Number(this.route.snapshot.paramMap.get('id')) || null);
    try { await this.state.loadAccounts(); } finally { this.loading.set(false); }
  }

  async onSaved(): Promise<void> {
    await this.state.loadAccounts();
  }

  adjust(): void {
    const a = this.account();
    if (!a) return;
    const ref = this.dialogs.open(AdjustBalance, {
      header: 'Adjust balance', width: '28rem', modal: true,
      data: { accountId: a.id, accountName: a.name, currentBalance: a.balance }
    });
    ref?.onClose.subscribe(async (changed: boolean) => { if (changed) await this.state.loadAccounts(); });
  }

  async remove(): Promise<void> {
    const a = this.account();
    if (!a || !this.canDelete()) return;
    this.deleting.set(true);
    try {
      await this.state.deleteAccount(a.id);
      this.notify.showSuccess(`Account "${a.name}" deleted.`);
      await this.router.navigate(['/app/accounts']);
    } catch (err: any) {
      this.notify.showError(err?.message || 'Failed to delete account.');
    } finally {
      this.deleting.set(false);
    }
  }
}
