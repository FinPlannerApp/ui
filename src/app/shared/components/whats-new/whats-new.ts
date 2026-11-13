import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChangelogService } from '../../../core/services/changelog.service';
import { sharedPrimeModules } from '../../prime-imports';

/** "What's new" dialog: opens once per update for signed-in users, or from the version label. */
@Component({
  selector: 'app-whats-new',
  imports: [DatePipe, RouterLink, ...sharedPrimeModules],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      header="What's new"
      [visible]="changelog.open()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: '30rem' }"
      [breakpoints]="{ '640px': '94vw' }"
      styleClass="glass-dialog"
    >
      <div class="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1">
        @for (release of releases(); track release.id) {
          <section class="flex flex-col gap-3">
            <div class="flex items-baseline justify-between gap-3">
              <h3 class="m-0 text-base font-extrabold text-main">{{ release.label }}</h3>
              <span class="text-xs text-muted">{{ release.releasedOn | date: 'mediumDate' }}</span>
            </div>
            @if (release.summary) {
              <p class="m-0 text-sm text-muted leading-relaxed">{{ release.summary }}</p>
            }
            @for (group of release.groups; track group.type) {
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  <i [class]="group.icon"></i>
                  <span>{{ group.label }}</span>
                </div>
                <ul class="m-0 pl-5 flex flex-col gap-1 text-sm text-main leading-relaxed">
                  @for (item of group.items; track item.text) {
                    <li>{{ item.text }}</li>
                  }
                </ul>
              </div>
            }
            @if (release.blogSlug) {
              <a [routerLink]="['/blog', release.blogSlug]" (click)="changelog.dismiss()"
                class="text-xs font-semibold text-emerald-400 no-underline hover:text-emerald-300">Read the full write-up</a>
            }
          </section>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex items-center justify-between gap-3 pt-2">
          <a routerLink="/blog" (click)="changelog.dismiss()" class="text-xs font-semibold text-emerald-400 no-underline hover:text-emerald-300">
            All release notes
          </a>
          <p-button label="Got it" icon="pi pi-check" severity="success" (onClick)="changelog.dismiss()"></p-button>
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class WhatsNew implements OnInit {
  protected changelog = inject(ChangelogService);

  protected releases = computed(() =>
    this.changelog.shown().map((release) => ({
      ...release,
      label: this.changelog.label(release),
      groups: this.changelog.groups(release),
    })),
  );

  ngOnInit(): void {
    void this.changelog.showIfNew();
  }

  protected onVisibleChange(visible: boolean): void {
    if (!visible) this.changelog.dismiss();
  }
}
