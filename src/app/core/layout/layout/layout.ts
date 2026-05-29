import { Component, inject, computed } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { Auth } from '../../services/auth';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { environment } from '../../../../environments/environment';
import { AvatarModule } from 'primeng/avatar';
import { PopoverModule } from 'primeng/popover';
import { Theme } from '../../services/theme';
import { BreadcrumbService } from '../breadcrumb.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, DrawerModule, ButtonModule, MenuModule, AvatarModule, PopoverModule, BreadcrumbModule, CommonModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})

export class Layout {
  public authService = inject(Auth);
  public themeService = inject(Theme);
  public breadcrumbService = inject(BreadcrumbService);
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
        label: 'Main',
        items: [
          { label: 'Home', icon: 'pi pi-globe', routerLink: '/', command: () => { this.sidebarVisible = false; } },
          { label: 'Dashboard', icon: 'pi pi-home', routerLink: '/app/dashboard', command: () => { this.sidebarVisible = false; } },
          { label: 'Accounts', icon: 'pi pi-wallet', routerLink: '/app/accounts', command: () => { this.sidebarVisible = false; } },
          { label: 'Budgets', icon: 'pi pi-chart-line', routerLink: '/app/budgets', command: () => { this.sidebarVisible = false; } },
          { label: 'Recurring', icon: 'pi pi-sync', routerLink: '/app/recurring-transactions', command: () => { this.sidebarVisible = false; } },
          { label: 'Transactions', icon: 'pi pi-list', routerLink: '/app/transactions', command: () => { this.sidebarVisible = false; } },
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
          { label: 'Feedback Hub', icon: 'pi pi-comments', routerLink: '/app/issues', command: () => { this.sidebarVisible = false; } }
        ]
      }
    ];
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
