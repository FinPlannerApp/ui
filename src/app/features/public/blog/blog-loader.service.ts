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

  async loadPaged(pageNumber: number = 1, pageSize: number = 6, search: string = '', tag: string = ''): Promise<{ items: BlogPostMeta[]; totalCount: number }> {
    try {
      const queryParams = `pageNumber=${pageNumber}&pageSize=${pageSize}&search=${encodeURIComponent(search)}&tag=${encodeURIComponent(tag)}`;
      const result = await firstValueFrom(this.api.get<any>(`Blog/published/paged?${queryParams}`));
      if (result.isSuccess && result.value) {
        return {
          items: result.value.items || result.value.data || [],
          totalCount: result.value.totalCount || result.value.count || 0
        };
      }
    } catch {
      // Fallback handled in component
    }
    return { items: [], totalCount: 0 };
  }

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

  async renderMermaidDiagrams(container?: HTMLElement): Promise<void> {
    const root = container || document;
    const targets = root.querySelectorAll('pre code.language-mermaid, .language-mermaid, pre.mermaid');
    
    if (targets.length === 0) return;

    if (!this.mermaidInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });
      this.mermaidInitialized = true;
    }

    targets.forEach((node) => {
      const code = node.textContent || '';
      if (!code.trim()) return;

      const parent = node.closest('pre') || node;
      const div = document.createElement('div');
      div.className = 'mermaid-diagram my-4 flex justify-center overflow-x-auto p-4 rounded-2xl bg-black/30 border border-white/10';
      div.textContent = code.trim();
      parent.replaceWith(div);
    });

    try {
      await mermaid.run({ querySelector: '.mermaid-diagram' });
    } catch (err) {
      console.warn('Mermaid rendering warning:', err);
    }
  }
}
