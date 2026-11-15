import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { GenericApi } from '../../../core/services/generic-api';
import { DiagnosticsService } from '../../../core/services/diagnostics.service';
import { sharedPrimeModules } from '../../prime-imports';
import { QuickFeedbackService } from './quick-feedback.service';

type Severity = 'Minor' | 'Major' | 'Critical';

/**
 * Quick bug report: type what went wrong and send. The screenshot and technical details (page, recent errors, API calls,
 * steps) are attached automatically, shown first and removable, and land in the Feedback Hub as a normal bug.
 */
@Component({
  selector: 'app-quick-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TextareaModule, ...sharedPrimeModules],
  template: `
<p-dialog header="Report a problem" [visible]="feedback.visible()" (visibleChange)="$event ? null : feedback.close()"
  [modal]="true" [draggable]="false" [dismissableMask]="true" [style]="{ width: 'min(36rem, 96vw)' }" appendTo="body">
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <label for="qf-text" class="text-sm font-semibold">What went wrong?</label>
      <textarea id="qf-text" pTextarea rows="4" maxlength="4000" class="w-full" autofocus
        placeholder="For example: after paying my card bill the balance did not change"
        [ngModel]="text()" (ngModelChange)="text.set($event)"></textarea>
      <span class="text-xs text-[var(--text-muted)]">{{ text().length }}/4000. You do not need to explain where you were: the page and your recent steps are attached.</span>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-sm font-semibold">How bad is it?</span>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Severity">
        @for (o of severities; track o.value) {
          <button type="button" role="radio" [attr.aria-checked]="severity() === o.value" (click)="severity.set(o.value)"
            class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all"
            [class]="severity() === o.value ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-transparent text-[var(--text-main)] border-[var(--glass-border)]'">{{ o.label }}</button>
        }
      </div>
    </div>

    <div class="flex flex-col gap-2 rounded-xl border border-[var(--glass-border)] p-3">
      <label class="flex items-start gap-2 text-sm cursor-pointer">
        <input type="checkbox" class="mt-1" [ngModel]="withShot()" (ngModelChange)="withShot.set($event)" [disabled]="!feedback.screenshot()" />
        <span><b>Include a screenshot</b>
          @if (!feedback.screenshot()) { <span class="text-[var(--text-muted)]"> (could not be taken here)</span> }
          <span class="block text-xs text-[var(--text-muted)]">It shows what was on screen, amounts included. Untick it if anything private is visible.</span></span>
      </label>
      @if (feedback.screenshot() && withShot()) {
        <img [src]="feedback.screenshot()" alt="Screenshot that will be sent" class="rounded-lg border border-[var(--glass-border)] max-h-48 object-contain self-start" />
      }

      <label class="flex items-start gap-2 text-sm cursor-pointer">
        <input type="checkbox" class="mt-1" [ngModel]="withDetails()" (ngModelChange)="withDetails.set($event)" />
        <span><b>Include technical details</b>
          <span class="block text-xs text-[var(--text-muted)]">Page, device, recent errors, which API calls failed, and your last few taps. No passwords, no typed text, no amounts from the server.</span></span>
      </label>
      @if (withDetails()) {
        <details class="text-xs">
          <summary class="cursor-pointer text-[var(--text-muted)]">{{ summary() }}</summary>
          <pre class="mt-2 p-2 rounded-lg bg-black/20 overflow-auto max-h-56 whitespace-pre-wrap break-words">{{ detailsText() }}</pre>
        </details>
      }
    </div>

    @if (error()) { <div class="text-sm text-red-400" role="alert">{{ error() }}</div> }
  </div>

  <ng-template #footer>
    <div class="flex flex-wrap justify-between items-center gap-2 w-full">
      <span class="text-xs text-[var(--text-muted)]">Shortcut: {{ feedback.shortcutLabel }}</span>
      <div class="flex gap-2">
        <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="feedback.close()"></p-button>
        <p-button label="Send report" icon="pi pi-send" [loading]="sending()" [disabled]="text().trim().length < 3" (onClick)="send()"></p-button>
      </div>
    </div>
  </ng-template>
</p-dialog>`,
})
export class QuickFeedback {
  protected feedback = inject(QuickFeedbackService);
  private diagnostics = inject(DiagnosticsService);
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  readonly severities: { value: Severity; label: string }[] = [
    { value: 'Minor', label: 'Small glitch' },
    { value: 'Major', label: 'Something is broken' },
    { value: 'Critical', label: 'Wrong money or I am stuck' },
  ];

  text = signal('');
  severity = signal<Severity>('Minor');
  withShot = signal(true);
  withDetails = signal(true);
  sending = signal(false);
  error = signal<string | null>(null);

  /** Taken when the dialog opens, so what the user sees in "technical details" is what is sent. */
  private details = computed(() => (this.feedback.visible() ? this.diagnostics.snapshot() : null));
  detailsText = computed(() => JSON.stringify(this.details(), null, 2));
  summary = computed(() => {
    const d = this.details() as { consoleErrors?: unknown[]; recentApiCalls?: unknown[]; recentSteps?: unknown[] } | null;
    return `${d?.consoleErrors?.length ?? 0} errors, ${d?.recentApiCalls?.length ?? 0} API calls, ${d?.recentSteps?.length ?? 0} steps (tap to read)`;
  });

  send(): void {
    const description = this.text().trim();
    if (description.length < 3 || this.sending()) return;
    this.sending.set(true);
    this.error.set(null);
    const body = {
      description,
      severity: this.severity(),
      impactsMoney: this.severity() === 'Critical',
      contextJson: this.withDetails() ? JSON.stringify(this.diagnostics.snapshot()) : JSON.stringify({ note: 'Technical details were not included.', page: window.location.pathname }),
      screenshotBase64: this.withShot() ? this.feedback.screenshot() : null,
    };
    this.api.post<{ id: number }>('Issues/quick-report', body).subscribe({
      next: r => {
        this.sending.set(false);
        if (!r.isSuccess) { this.error.set(r.error?.description ?? 'The report could not be sent.'); return; }
        this.toast.add({ severity: 'success', summary: 'Report sent', detail: `Thanks! It is in the Feedback Hub as #${r.value.id}.`, life: 6000 });
        this.text.set('');
        this.severity.set('Minor');
        this.feedback.close();
      },
      error: () => { this.sending.set(false); this.error.set('Could not reach the server. Your text is kept: try again.'); },
    });
  }
}
