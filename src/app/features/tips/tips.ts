import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TIPS } from '../../core/data/tips';

@Component({
  selector: 'app-tips',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto flex flex-col gap-4">
      <header>
        <h1 class="text-2xl font-extrabold m-0">Tips &amp; how-tos</h1>
        <p class="text-xs m-0 mt-1" style="color:var(--text-dim)">Quick answers to “how do I…”. The footer shows one at a time.</p>
      </header>
      <input class="p-inputtext w-full" placeholder="Search tips" aria-label="Search tips" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      @for (g of groups(); track g.area) {
        <section class="glass-card p-4 rounded-2xl">
          <h2 class="text-sm font-extrabold m-0 mb-2">{{ g.area }}</h2>
          <ul class="m-0 pl-4 flex flex-col gap-1.5 text-sm">
            @for (t of g.tips; track t.text) {
              <li>{{ t.text }} @if (t.link) { <a [routerLink]="t.link" class="text-xs ml-1">Go →</a> }</li>
            }
          </ul>
        </section>
      } @empty { <p class="text-sm" style="color:var(--text-dim)">No tips match “{{ q() }}”.</p> }
    </div>
  `
})
export class Tips {
  private route = inject(ActivatedRoute);
  q = signal(this.route.snapshot.queryParamMap.get('area') ?? '');
  groups = computed(() => {
    const q = this.q().trim().toLowerCase();
    const list = q ? TIPS.filter(t => (t.area + ' ' + t.text).toLowerCase().includes(q)) : TIPS;
    const map = new Map<string, typeof TIPS>();
    for (const t of list) map.set(t.area, [...(map.get(t.area) ?? []), t]);
    return [...map].map(([area, tips]) => ({ area, tips }));
  });
}
