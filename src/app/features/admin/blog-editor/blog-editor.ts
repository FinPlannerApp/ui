import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { DraftPersistenceService } from '../../../core/services/draft-persistence.service';

@Component({
  selector: 'app-blog-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './blog-editor.html'
})
export class BlogEditor implements OnInit {
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);
  private draftService = inject(DraftPersistenceService);

  postId = signal<number | null>(null);
  title = signal('');
  slug = signal('');
  excerpt = signal('');
  contentMarkdown = signal('');
  isPublished = signal(false);
  isSaving = signal(false);
  isUploadingImage = signal(false);

  previewHtml = computed(() => {
    const raw = marked.parse(this.contentMarkdown(), { async: false }) as string;
    return DOMPurify.sanitize(raw);
  });

  private draftKey = 'blog-editor-draft';

  constructor() {
    this.draftService.autoSave(this.draftKey, () => ({
      title: this.title(),
      slug: this.slug(),
      excerpt: this.excerpt(),
      contentMarkdown: this.contentMarkdown()
    }));
  }

  async ngOnInit(): Promise<void> {
    const draft = this.draftService.load<any>(this.draftKey);
    if (draft) {
      this.title.set(draft.title ?? '');
      this.slug.set(draft.slug ?? '');
      this.excerpt.set(draft.excerpt ?? '');
      this.contentMarkdown.set(draft.contentMarkdown ?? '');
      this.notificationService.showSuccess('Restored your unsaved draft.');
    }
  }

  slugify(): void {
    if (this.slug()) return;
    this.slug.set(
      this.title().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    );
  }

  async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploadingImage.set(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const res = await firstValueFrom(
        this.api.post<any>('Blog/admin/upload-image', formData)
      );

      if (res.isSuccess) {
        const publicUrl = res.value.publicUrl;
        this.contentMarkdown.update(md => `${md}\n\n![${file.name}](${publicUrl})\n`);
        this.notificationService.showSuccess('Image uploaded and inserted as WebP.');
      } else {
        throw new Error('Image upload failed.');
      }
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Image upload failed.');
    } finally {
      this.isUploadingImage.set(false);
      input.value = '';
    }
  }

  async save(): Promise<void> {
    if (!this.title() || !this.slug() || !this.contentMarkdown()) {
      this.notificationService.showError('Title, slug, and content are required.');
      return;
    }

    this.isSaving.set(true);
    try {
      const result = await firstValueFrom(this.api.post<any>('Blog/admin/upsert', {
        id: this.postId(),
        title: this.title(),
        slug: this.slug(),
        contentMarkdown: this.contentMarkdown(),
        excerpt: this.excerpt(),
        isPublished: this.isPublished()
      }));

      if (result.isSuccess) {
        this.postId.set(result.value.id);
        this.notificationService.showSuccess(this.isPublished() ? 'Published.' : 'Saved as draft.');
        this.draftService.clear(this.draftKey);
      }
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Save failed.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
