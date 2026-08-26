import { Component, OnInit, computed, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';
import { DraftPersistenceService } from '../../../core/services/draft-persistence.service';
import { BlogLoaderService, parseMarkdownWithAlerts } from '../../public/blog/blog-loader.service';

import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-blog-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './blog-editor.html',
  styles: [`
    /* Rich Markdown Preview Typography */
    .markdown-preview {
      color: var(--text-main, #e2e8f0);
    }
    .markdown-preview h1,
    .markdown-preview h2,
    .markdown-preview h3,
    .markdown-preview h4,
    .markdown-preview h5,
    .markdown-preview h6 {
      color: #ffffff;
      font-weight: 800;
      margin-top: 1.25rem;
      margin-bottom: 0.75rem;
      line-height: 1.25;
    }
    .markdown-preview h1 { font-size: 1.75rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 0.5rem; }
    .markdown-preview h2 { font-size: 1.4rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 0.35rem; }
    .markdown-preview h3 { font-size: 1.2rem; }
    .markdown-preview h4 { font-size: 1.05rem; }
    .markdown-preview p { margin-bottom: 1rem; line-height: 1.7; }
    .markdown-preview ul, .markdown-preview ol { padding-left: 1.5rem; margin-bottom: 1rem; }
    .markdown-preview ul { list-style-type: disc; }
    .markdown-preview ol { list-style-type: decimal; }
    .markdown-preview li { margin-bottom: 0.35rem; line-height: 1.6; }
    .markdown-preview blockquote {
      border-left: 4px solid var(--primary-color, #3b82f6);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      font-style: italic;
      color: #94a3b8;
    }
    .markdown-preview code {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.2rem 0.4rem;
      border-radius: 0.25rem;
      font-family: monospace;
      font-size: 0.85em;
      color: #38bdf8;
    }
    .markdown-preview pre {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1rem;
      border-radius: 0.75rem;
      overflow-x: auto;
      margin-bottom: 1rem;
    }
    .markdown-preview pre code {
      background: transparent;
      padding: 0;
      color: #f1f5f9;
    }
    .markdown-preview table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.25rem;
    }
    .markdown-preview th, .markdown-preview td {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.6rem 0.8rem;
      text-align: left;
    }
    .markdown-preview th {
      background: rgba(255, 255, 255, 0.08);
      font-weight: 700;
    }
    .markdown-preview hr {
      border: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.15);
      margin: 1.5rem 0;
    }
    .markdown-preview kbd {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      box-shadow: 0 1px 1px rgba(0,0,0,0.2);
      color: #f8fafc;
      font-size: 0.85em;
      padding: 2px 6px;
    }
    .markdown-preview mark {
      background: #eab308;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 3px;
      font-weight: 600;
    }

    /* Editor Toolbar Glass Glow Button Effects */
    .editor-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.35rem 0.55rem;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      white-space: nowrap;
    }
    .editor-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
    .editor-btn:active {
      transform: translateY(0);
    }
  `]
})
export class BlogEditor implements OnInit {
  @ViewChild('editorTextarea') editorTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('previewPane') previewPane!: ElementRef<HTMLDivElement>;

  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);
  private draftService = inject(DraftPersistenceService);
  private blogLoader = inject(BlogLoaderService);
  private route = inject(ActivatedRoute);

  postId = signal<number | null>(null);
  title = signal('');
  slug = signal('');
  excerpt = signal('');
  contentMarkdown = signal('');
  isPublished = signal(false);
  isSaving = signal(false);
  isUploadingImage = signal(false);

  // Layout View Modes: 'split' | 'editor' | 'preview'
  viewMode = signal<'split' | 'editor' | 'preview'>('split');
  isFullscreen = signal(false);

  // Active Pane Scroll Lock to Prevent Typing Jumps
  activePane: 'editor' | 'preview' | null = null;
  private isSyncingScroll = false;
  private mermaidDebounceTimer: any = null;

  previewHtml = computed(() => {
    return parseMarkdownWithAlerts(this.contentMarkdown());
  });

  // Content Statistics
  wordCount = computed(() => {
    const text = this.contentMarkdown().trim();
    return text ? text.split(/\s+/).length : 0;
  });

  charCount = computed(() => {
    return this.contentMarkdown().length;
  });

  readingTime = computed(() => {
    const words = this.wordCount();
    return Math.max(1, Math.ceil(words / 200));
  });

  private draftKey = 'blog-editor-draft';

  constructor() {
    this.draftService.autoSave(this.draftKey, () => ({
      title: this.title(),
      slug: this.slug(),
      excerpt: this.excerpt(),
      contentMarkdown: this.contentMarkdown()
    }));

    // Debounced Mermaid Diagram re-rendering to prevent scroll/cursor jumps while actively typing
    effect(() => {
      this.previewHtml();
      if (this.mermaidDebounceTimer) clearTimeout(this.mermaidDebounceTimer);
      this.mermaidDebounceTimer = setTimeout(() => {
        this.blogLoader.renderMermaidDiagrams();
      }, 500);
    });
  }

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.queryParamMap.get('slug');
    if (slug) {
      try {
        const post = await this.blogLoader.loadPost(slug);
        if (post) {
          this.postId.set(post.id ?? null);
          this.title.set(post.title);
          this.slug.set(post.slug);
          this.excerpt.set(post.excerpt || '');
          this.contentMarkdown.set(post.contentMarkdown || post.contentHtml || '');
          this.isPublished.set(post.isPublished ?? true);
          this.notificationService.showSuccess(`Loaded article "${post.title}" for editing.`);
          return;
        }
      } catch {
        // Fallback to draft
      }
    }

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

  // Scroll Sync (Only triggers when the specific pane is hovered/scrolled by user)
  onEditorScroll(): void {
    if (this.isSyncingScroll || this.activePane !== 'editor') return;
    const editor = this.editorTextarea?.nativeElement;
    const preview = this.previewPane?.nativeElement;
    if (!editor || !preview) return;

    this.isSyncingScroll = true;
    const maxEditor = editor.scrollHeight - editor.clientHeight;
    if (maxEditor > 0) {
      const percentage = editor.scrollTop / maxEditor;
      const maxPreview = preview.scrollHeight - preview.clientHeight;
      preview.scrollTop = percentage * maxPreview;
    }
    setTimeout(() => (this.isSyncingScroll = false), 15);
  }

  onPreviewScroll(): void {
    if (this.isSyncingScroll || this.activePane !== 'preview') return;
    const editor = this.editorTextarea?.nativeElement;
    const preview = this.previewPane?.nativeElement;
    if (!editor || !preview) return;

    this.isSyncingScroll = true;
    const maxPreview = preview.scrollHeight - preview.clientHeight;
    if (maxPreview > 0) {
      const percentage = preview.scrollTop / maxPreview;
      const maxEditor = editor.scrollHeight - editor.clientHeight;
      editor.scrollTop = percentage * maxEditor;
    }
    setTimeout(() => (this.isSyncingScroll = false), 15);
  }

  // Smart Selection & Snippet Inserter (Preserves cursor position & scroll)
  insertSnippet(prefix: string, suffix: string = '', defaultPlaceholder: string = ''): void {
    const textarea = this.editorTextarea?.nativeElement;
    if (!textarea) {
      this.contentMarkdown.update(md => `${md}${prefix}${defaultPlaceholder}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const originalScrollTop = textarea.scrollTop;
    const currentText = this.contentMarkdown();
    const selectedText = currentText.substring(start, end);

    const insertion = selectedText.length > 0 ? selectedText : defaultPlaceholder;
    const replacement = `${prefix}${insertion}${suffix}`;

    const updatedText = currentText.substring(0, start) + replacement + currentText.substring(end);
    this.contentMarkdown.set(updatedText);

    // Restore focus, cursor, and scroll position on next microtask
    setTimeout(() => {
      textarea.focus();
      textarea.scrollTop = originalScrollTop;
      const newCursorPos = selectedText.length > 0
        ? start + replacement.length
        : start + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + (selectedText.length > 0 ? 0 : defaultPlaceholder.length));
    }, 0);
  }

  // Specific Toolbar Shortcut Inserters
  insertHeading(level: number): void {
    const hashes = '#'.repeat(level);
    this.insertSnippet(`${hashes} `, '', `Heading ${level}`);
  }

  insertAlert(type: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION'): void {
    this.insertSnippet(`> [!${type}]\n> `, '', `Enter ${type.toLowerCase()} details here...`);
  }

  insertTable(): void {
    const tableTemplate = `\n| Column 1 | Column 2 | Column 3 |\n| :--- | :---: | ---: |\n| Data A | Data B | Data C |\n| Value 1 | Value 2 | Value 3 |\n`;
    this.insertSnippet(tableTemplate);
  }

  insertMermaid(): void {
    const mermaidTemplate = `\n\`\`\`mermaid\ngraph LR\n    A["Start Process"] --> B["Execute Step"]\n    B --> C["Result Success"]\n\`\`\`\n`;
    this.insertSnippet(mermaidTemplate);
  }

  insertDetails(): void {
    const detailsTemplate = `\n<details>\n  <summary>Click to expand additional details</summary>\n  <p>Detailed explanation or hidden code goes here...</p>\n</details>\n`;
    this.insertSnippet(detailsTemplate);
  }

  insertCodeBlock(): void {
    this.insertSnippet(`\n\`\`\`typescript\n`, `\n\`\`\`\n`, `// Write code here`);
  }

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
  }

  async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploadingImage.set(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await firstValueFrom(this.api.postFormData<string>('Blog/admin/upload-image', formData));
      if (!result.isSuccess) throw new Error('Upload failed.');

      const publicUrl = typeof result.value === 'string' ? result.value : (result.value as any)?.publicUrl;
      this.insertSnippet(`\n![${file.name}](${publicUrl})\n`);
      this.notificationService.showSuccess('Image uploaded and inserted as WebP.');
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
