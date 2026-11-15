import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ModuleTab { path: string; label: string; icon: string; }

/** Tab strip shown at the top of a module's pages (e.g. Accounts · Overview · Categories · Settings). */
@Component({
  selector: 'app-module-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex gap-1.5 overflow-x-auto pb-1" [attr.aria-label]="label()">
      @for (t of tabs(); track t.path) {
        <a [routerLink]="t.path" routerLinkActive="bg-emerald-500 text-white shadow-md" [routerLinkActiveOptions]="{ exact: true }"
           class="px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap text-muted hover:text-main transition-all cursor-pointer no-underline">
          <i [class]="t.icon + ' text-xs'"></i><span>{{ t.label }}</span>
        </a>
      }
    </nav>
  `
})
export class ModuleTabs {
  tabs = input.required<ModuleTab[]>();
  label = input('Sections');
}
