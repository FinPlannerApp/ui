import { Injectable, inject } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { BlogPost, BlogPostMeta } from './blog-post.model';

@Injectable({ providedIn: 'root' })
export class BlogLoaderService {
  private api = inject(GenericApi);
  private mermaidInitialized = false;

  async loadAllMeta(): Promise<BlogPostMeta[]> {
    try {
      const result = await firstValueFrom(this.api.get<BlogPostMeta[]>('Blog/published'));
      if (result.isSuccess && result.value && result.value.length > 0) {
        return result.value;
      }
    } catch {
      // Fallback
    }
    return [];
  }

  async loadPost(slug: string): Promise<BlogPost | null> {
    try {
      const result = await firstValueFrom(this.api.get<any>(`Blog/published/${slug}`));
      if (result.isSuccess && result.value) {
        const rawHtml = await marked.parse(result.value.contentMarkdown || '');
        const contentHtml = DOMPurify.sanitize(rawHtml as string);
        return {
          ...result.value,
          contentHtml
        };
      }
    } catch {
      // Fallback
    }
    return null;
  }

  async renderMermaidDiagrams(): Promise<void> {
    if (!this.mermaidInitialized) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      this.mermaidInitialized = true;
    }
    try {
      await mermaid.run({ querySelector: '.language-mermaid' });
    } catch {
      // Ignore mermaid rendering errors if no diagrams present
    }
  }
}
