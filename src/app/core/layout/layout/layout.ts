import { Component, inject, computed } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Auth } from '../../services/auth';
import { MenuItem } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { ThemeEngine } from '../../services/theme';
import { BreadcrumbService } from '../breadcrumb.service';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, CommonModule, ...sharedPrimeModules],
  templateUrl: './layout.html',
})

export class Layout {
  public authService = inject(Auth);
  public themeEngine = inject(ThemeEngine);
  public breadcrumbService = inject(BreadcrumbService);
  public loadingService = inject(LoadingService);
  private router = inject(Router);

  sidebarVisible = false;
  navItems: MenuItem[];
  appVersion: string;

  userInitials = computed(() => {
    const name = this.authService.currentUser();
    return name ? name.substring(0, 2).toUpperCase() : '';
  });

  constructor() {
    this.appVersion = environment.appVersion;
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
          { label: 'Transactions', icon: 'pi pi-list', routerLink: '/app/transactions', command: () => { this.sidebarVisible = false; } },
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
          { label: 'Feedback Hub', icon: 'pi pi-comments', routerLink: '/app/issues', command: () => { this.sidebarVisible = false; } },
          { label: 'Merge Duplicates', icon: 'pi pi-sync', routerLink: '/app/merge-duplicates', command: () => { this.sidebarVisible = false; } }
        ]
      }
    ];
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
