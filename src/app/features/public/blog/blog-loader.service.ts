import { Injectable, inject } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import mermaid from 'mermaid';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { BlogPost, BlogPostMeta } from './blog-post.model';
import { DiagramViewerModalService } from '../../../shared/components/diagram-viewer-modal/diagram-viewer-modal.service';

@Injectable({ providedIn: 'root' })
export class BlogLoaderService {
  private api = inject(GenericApi);
  private diagramViewerModal = inject(DiagramViewerModalService);
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

    targets.forEach((node, index) => {
      const code = node.textContent || '';
      if (!code.trim()) return;

      const parent = node.closest('pre') || node;
      const id = `mermaid-id-${Date.now()}-${index}`;
      const div = document.createElement('div');
      div.className = 'mermaid-diagram my-4 flex justify-center overflow-x-auto p-4 rounded-2xl bg-slate-900/40 border border-white/10 cursor-pointer relative';
      div.setAttribute('data-raw-code', code.trim());
      div.setAttribute('id', id);
      div.textContent = code.trim();
      parent.replaceWith(div);
    });

    try {
      await mermaid.run({ querySelector: '.mermaid-diagram' });
    } catch (err) {
      console.warn('Mermaid rendering warning:', err);
    }

    // Attach interactive toolbars & fullscreen modal triggers
    const renderedDiagrams = root.querySelectorAll('.mermaid-diagram');
    renderedDiagrams.forEach((container) => {
      if (container.querySelector('.mermaid-toolbar')) return; // Avoid duplicates

      const rawCode = container.getAttribute('data-raw-code') || '';
      const svg = container.querySelector('svg');
      if (!svg) return;

      // Wrap container
      container.classList.add('group', 'relative');

      // Create toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'mermaid-toolbar absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-white/15 shadow-xl';

      const expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'p-1.5 px-2.5 bg-indigo-600/80 hover:bg-indigo-600 rounded-lg text-white transition-all text-xs font-medium flex items-center gap-1.5 shadow-md';
      expandBtn.innerHTML = '<i class="pi pi-expand text-xs"></i><span>Expand</span>';
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        const svgContent = container.querySelector('svg')?.outerHTML || '';
        this.diagramViewerModal.openModal(svgContent, 'Interactive Diagram Viewer', rawCode);
      };

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all text-xs flex items-center justify-center';
      copyBtn.title = 'Copy Mermaid Source Code';
      copyBtn.innerHTML = '<i class="pi pi-copy text-xs"></i>';
      copyBtn.onclick = (e) => {
        e.stopPropagation();
        if (rawCode && navigator.clipboard) {
          navigator.clipboard.writeText(rawCode);
        }
      };

      toolbar.appendChild(expandBtn);
      toolbar.appendChild(copyBtn);
      container.appendChild(toolbar);

      // Clicking diagram also opens modal
      (container as HTMLElement).onclick = () => {
        const svgContent = container.querySelector('svg')?.outerHTML || '';
        this.diagramViewerModal.openModal(svgContent, 'Interactive Diagram Viewer', rawCode);
      };
    });
  }
}
