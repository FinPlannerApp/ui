import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Shell for /app/budgets: a tab strip (Dashboard · Manage · Settings) above the active child page. */
@Component({
  selector: 'app-budgets-hub',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex gap-1.5 mb-4 overflow-x-auto pb-1" aria-label="Budgets sections">
      @for (t of tabs; track t.path) {
        <a [routerLink]="t.path" routerLinkActive="bg-emerald-500 text-white shadow-md"
           [routerLinkActiveOptions]="{ exact: true }"
           class="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap text-muted hover:text-main transition-all cursor-pointer no-underline">
          <i [class]="t.icon + ' text-xs'"></i><span>{{ t.label }}</span>
        </a>
      }
    </nav>
    <router-outlet />
  `
})
export class BudgetsHub {
  readonly tabs = [
    { path: '/app/budgets', label: 'Dashboard', icon: 'pi pi-chart-pie' },
    { path: '/app/budgets/manage', label: 'Manage', icon: 'pi pi-list' },
    { path: '/app/budgets/settings', label: 'Settings', icon: 'pi pi-sliders-h' }
  ];
}
