import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { GenericApi } from '../../../core/services/generic-api';
import { GoogleDriveService } from '../../../core/services/google-drive';
import { sharedPrimeModules } from '../../prime-imports';

export interface AttachmentItem {
  id: number; entityType: string; entityId: number; provider: number; url: string; host: string; displayName: string;
  mimeType?: string | null; sizeBytes?: number | null; addedByMe: boolean; createdAt: string;
}

/**
 * Documents for a policy, transaction or split expense. Only a reference is stored (a share link, or the id of a
 * file in the user's own Drive). The app never downloads, previews or embeds the target.
 */
@Component({
  selector: 'app-attachments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './attachments.html',
})
export class Attachments {
  private api = inject(GenericApi);
  private toast = inject(MessageService);
  private drive = inject(GoogleDriveService);
  driveAvailable = this.drive.available;
  uploading = signal(false);
  /** Split receipts are meant for the group, so sharing starts ticked there (and is shown, not hidden). */
  shareLink = signal(false);

  entityType = input.required<string>();
  entityId = input.required<number>();
  readonly = input(false);
  /** Sub-folders under FinPlanner in the user's Drive, e.g. ['Insurance', 'Star Health']. */
  folder = input<string[]>([]);
  /** When true nothing is fetched until the user opens it, so long lists don't fire one request per row. */
  lazy = input(false);
  opened = signal(false);

  items = signal<AttachmentItem[]>([]);
  loaded = signal(false);
  loading = signal(false);
  adding = signal(false);
  saving = signal(false);
  form = { name: '', url: '' };
  count = computed(() => this.items().length);

  constructor() { queueMicrotask(() => { if (!this.lazy()) { this.opened.set(true); this.load(); } }); }

  open() { this.opened.set(true); this.load(); }

  load() {
    this.loading.set(true);
    this.api.get<AttachmentItem[]>(`Attachments?entityType=${encodeURIComponent(this.entityType())}&entityId=${this.entityId()}`).subscribe({
      next: r => { if (r.isSuccess) this.items.set(r.value as AttachmentItem[]); this.loaded.set(true); this.loading.set(false); },
      error: () => { this.loaded.set(true); this.loading.set(false); },
    });
  }

  startAdd() { this.form = { name: '', url: '' }; this.shareLink.set(this.entityType() === 'SplitExpense'); this.adding.set(true); }

  saveLink() {
    if (!this.form.name.trim() || !this.form.url.trim()) { this.toast.add({ severity: 'warn', summary: 'Missing details', detail: 'Add a name and paste the link.' }); return; }
    this.saving.set(true);
    this.api.post<AttachmentItem>('Attachments/add', {
      entityType: this.entityType(), entityId: this.entityId(), provider: 0, url: this.form.url.trim(), displayName: this.form.name.trim(),
    }).subscribe({
      next: r => {
        this.saving.set(false);
        if (!r.isSuccess) { this.toast.add({ severity: 'error', summary: 'Not added', detail: (r as any)?.error?.description ?? 'Could not add the link.' }); return; }
        this.adding.set(false); this.load();
      },
      error: () => { this.saving.set(false); this.toast.add({ severity: 'error', summary: 'Network problem', detail: 'Nothing was saved.' }); },
    });
  }

  async onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    const problem = this.drive.validate(file);
    if (problem) { this.toast.add({ severity: 'warn', summary: 'Cannot upload', detail: problem }); return; }
    this.uploading.set(true);
    try {
      const name = (this.form.name.trim() || file.name.replace(/\.[^.]+$/, '')).slice(0, 100);
      const up = await this.drive.upload(file, name, this.shareLink(), this.folder().length ? this.folder() : [this.entityType()]);
      if (this.shareLink() && !up.shared) this.toast.add({ severity: 'warn', summary: 'Uploaded, not shared', detail: 'Google would not let this file be shared by link, so others may not be able to open it. You can share it from Drive.' });
      this.api.post<AttachmentItem>('Attachments/add', {
        entityType: this.entityType(), entityId: this.entityId(), provider: 1, externalId: up.id, displayName: name, mimeType: up.mimeType, sizeBytes: up.size,
      }).subscribe({
        next: r => {
          this.uploading.set(false);
          if (!r.isSuccess) { this.toast.add({ severity: 'error', summary: 'Uploaded, but not linked', detail: (r as any)?.error?.description ?? 'It is in your Drive; add it again by link.' }); return; }
          this.adding.set(false); this.load();
        },
        error: () => { this.uploading.set(false); this.toast.add({ severity: 'error', summary: 'Uploaded, but not linked', detail: 'It is in your Drive folder "FinPlanner".' }); },
      });
    } catch (e: any) {
      this.uploading.set(false);
      this.toast.add({ severity: 'error', summary: 'Upload failed', detail: e?.message ?? 'Could not upload to your Drive.' });
    }
  }

  remove(a: AttachmentItem) {
    if (!confirm(`Remove "${a.displayName}" from here? The file stays in the Drive it was uploaded to, with the same sharing. Change that in Drive if you want.`)) return;
    this.api.post<boolean>('Attachments/delete', { id: a.id }).subscribe({
      next: r => { if (r.isSuccess) this.load(); else this.toast.add({ severity: 'error', summary: 'Not removed', detail: (r as any)?.error?.description ?? '' }); },
      error: () => this.toast.add({ severity: 'error', summary: 'Network problem' }),
    });
  }

  icon(a: AttachmentItem) { return a.provider === 1 ? 'pi pi-google' : 'pi pi-link'; }
}
