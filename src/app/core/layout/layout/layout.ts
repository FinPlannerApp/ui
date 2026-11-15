import { areaForUrl } from '../../data/tips';
import { TipTicker } from '../tip-ticker';
import { Component, inject, computed } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Auth } from '../../services/auth';
import { MenuItem } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { ChangelogService } from '../../services/changelog.service';
import { WhatsNew } from '../../../shared/components/whats-new/whats-new';
import { ThemeEngine } from '../../services/theme';
import { BreadcrumbService } from '../breadcrumb.service';
import { CommonModule } from '@angular/common';
import { QuickFeedback } from '../../../shared/components/quick-feedback/quick-feedback';
import { QuickFeedbackService } from '../../../shared/components/quick-feedback/quick-feedback.service';
import { LoadingService } from '../../services/loading.service';
import { PwaUpdateService } from '../../services/pwa-update.service';
import { MessageService } from 'primeng/api';
import { QuickAdd } from '../../../shared/components/quick-add/quick-add';
import { QuickAddService } from '../../../shared/components/quick-add/quick-add.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, CommonModule, WhatsNew, TipTicker, QuickAdd, QuickFeedback, ...sharedPrimeModules],
  templateUrl: './layout.html',
})

export class Layout {
  public authService = inject(Auth);
  public quickAdd = inject(QuickAddService);
  public feedback = inject(QuickFeedbackService);
  public themeEngine = inject(ThemeEngine);
  public breadcrumbService = inject(BreadcrumbService);
  public loadingService = inject(LoadingService);
  public changelog = inject(ChangelogService);
  private router = inject(Router);
  private pwaUpdate = inject(PwaUpdateService);
  private toast = inject(MessageService);
  checkingUpdate = false;

  sidebarVisible = false;
  navItems: MenuItem[];
  appVersion: string;

  userInitials = computed(() => {
    const name = this.authService.currentUser();
    return name ? name.substring(0, 2).toUpperCase() : '';
  });

  constructor() {
    this.appVersion = environment.appVersion;
    void this.changelog.loadServerVersion();
    this.navItems = [
      {
        label: 'Overview',
        items: [
          { label: 'Home', icon: 'pi pi-globe', routerLink: '/', command: () => { this.sidebarVisible = false; } },
          { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/app/dashboard', command: () => { this.sidebarVisible = false; } },
        ],
      },
      {
        label: 'Money',
        items: [
          { label: 'Accounts', icon: 'pi pi-wallet', routerLink: '/app/accounts', command: () => { this.sidebarVisible = false; } },
          { label: 'Account insights', icon: 'pi pi-chart-line', routerLink: '/app/accounts/insights', command: () => { this.sidebarVisible = false; } },
          { label: 'Cards', icon: 'pi pi-credit-card', routerLink: '/app/cards', command: () => { this.sidebarVisible = false; } },
          { label: 'Transactions', icon: 'pi pi-list', routerLink: '/app/transactions', command: () => { this.sidebarVisible = false; } },
          { label: 'Investments', icon: 'pi pi-chart-bar', routerLink: '/app/investments', command: () => { this.sidebarVisible = false; } },
          { label: 'Outlook', icon: 'pi pi-compass', routerLink: '/app/outlook', command: () => { this.sidebarVisible = false; } },
          { label: 'Obligations', icon: 'pi pi-calendar', routerLink: '/app/obligations', command: () => { this.sidebarVisible = false; } },
          { label: 'Insurance', icon: 'pi pi-shield', routerLink: '/app/insurance', command: () => { this.sidebarVisible = false; } },
          { label: 'Recurring', icon: 'pi pi-sync', routerLink: '/app/recurring-transactions', command: () => { this.sidebarVisible = false; } },
          { label: 'Subscriptions', icon: 'pi pi-refresh', routerLink: '/app/subscriptions', command: () => { this.sidebarVisible = false; } },
          { label: 'Merchants', icon: 'pi pi-shop', routerLink: '/app/merchants', command: () => { this.sidebarVisible = false; } },
          { label: 'Split', icon: 'pi pi-users', routerLink: '/app/split', command: () => { this.sidebarVisible = false; } },
        ],
      },
      {
        label: 'Planning',
        items: [
          { label: 'Budgets', icon: 'pi pi-chart-line', routerLink: '/app/budgets', command: () => { this.sidebarVisible = false; } },
          { label: 'Goals', icon: 'pi pi-flag-fill', routerLink: '/app/goals', command: () => { this.sidebarVisible = false; } },
        ],
      },
      {
        label: 'Insights',
        items: [
          { label: 'Reports', icon: 'pi pi-file-export', routerLink: '/app/reports', command: () => { this.sidebarVisible = false; } },
          { label: 'Cashback Wallets', icon: 'pi pi-wallet', routerLink: '/app/cashback-wallets', command: () => { this.sidebarVisible = false; } },
          { label: 'Decision Journal', icon: 'pi pi-book', routerLink: '/app/decision-journal', command: () => { this.sidebarVisible = false; } },
          { label: '30-Day Challenge', icon: 'pi pi-flag', routerLink: '/app/challenge', command: () => { this.sidebarVisible = false; } },
        ],
      },
      {
        label: 'Categories',
        items: [
          { label: 'Account Categories', icon: 'pi pi-folder', routerLink: '/app/account-categories', command: () => { this.sidebarVisible = false; } },
          { label: 'Transaction Categories', icon: 'pi pi-tag', routerLink: '/app/transaction-categories', command: () => { this.sidebarVisible = false; } },
        ]
      },
      {
        label: 'Settings',
        items: [
          { label: 'Settings', icon: 'pi pi-cog', routerLink: '/app/settings', command: () => { this.sidebarVisible = false; } },
          { label: 'Undo centre', icon: 'pi pi-undo', routerLink: '/app/undo', command: () => { this.sidebarVisible = false; } },
          { label: 'Tips & how-tos', icon: 'pi pi-lightbulb', routerLink: '/app/tips', command: () => { this.sidebarVisible = false; } },
          { label: 'Feedback Hub', icon: 'pi pi-comments', routerLink: '/app/issues', command: () => { this.sidebarVisible = false; } },
          { label: 'Merge Duplicates', icon: 'pi pi-sync', routerLink: '/app/merge-duplicates', command: () => { this.sidebarVisible = false; } }
        ]
      }
    ];
  }

  helpArea(): string { return areaForUrl(this.router.url); }

  openHelp(): void {
    const area = this.helpArea();
    this.router.navigate(['/app/tips'], area ? { queryParams: { area } } : {});
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  async checkForUpdates(): Promise<void> {
    if (this.checkingUpdate) return;
    this.checkingUpdate = true;
    try {
      const r = await this.pwaUpdate.checkNow();
      if (r === 'latest') this.toast.add({ severity: 'success', summary: 'Up to date', detail: 'You are on the latest version.', life: 3000 });
      else if (r === 'error') this.toast.add({ severity: 'warn', summary: 'Could not check', detail: 'Check your connection and try again.', life: 4000 });
    } finally { this.checkingUpdate = false; }
  }

  async forceReload(): Promise<void> { await this.pwaUpdate.hardReload(); }
}
