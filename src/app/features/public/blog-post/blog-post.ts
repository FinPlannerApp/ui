import { Component, inject, OnInit, signal, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BLOG_POSTS } from '../blog/blog';
import { BlogLoaderService, parseMarkdownWithAlerts } from '../blog/blog-loader.service';
import { Auth } from '../../../core/services/auth';
import { BlogCommentsComponent } from '../blog/blog-comments.component';
import { NotificationService } from '../../../core/services/notification.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';

export interface TocItem {
  id: string;
  text: string;
  level: number; // 2 for H2, 3 for H3
}

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [CommonModule, RouterLink, BlogCommentsComponent, ...sharedPrimeModules],
  templateUrl: './blog-post.html',
})
export class BlogPost implements OnInit {
  private route = inject(ActivatedRoute);
  private blogLoader = inject(BlogLoaderService);
  private notification = inject(NotificationService);
  auth = inject(Auth);

  post = signal<any | null>(null);
  readingTime = signal<string>('3 min read');
  scrollProgress = signal<number>(0);
  tableOfContents = signal<TocItem[]>([]);
  activeTocId = signal<string>('');
  rawMarkdown = signal<string>('');

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height > 0) {
      this.scrollProgress.set(Math.min(100, Math.max(0, (winScroll / height) * 100)));
    }

    // Update active TOC item based on scroll position
    const toc = this.tableOfContents();
    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= 250) {
          this.activeTocId.set(item.id);
          break;
        }
      }
    }
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    const loaded = await this.blogLoader.loadPost(id);

    if (loaded) {
      const markdown = loaded.contentMarkdown || loaded.contentHtml || '';
      this.rawMarkdown.set(markdown);
      const words = markdown.split(/\s+/).length;
      const readMin = Math.max(1, Math.ceil(words / 200));
      this.readingTime.set(`${readMin} min read (${words} words)`);

      const processedContent = this.processHtmlHeadings(loaded.contentHtml || parseMarkdownWithAlerts(markdown));

      this.post.set({
        ...loaded,
        tag: loaded.tag || 'Blog',
        tagColor: loaded.tagColor || '#6366f1',
        date: loaded.publishedAt ? new Date(loaded.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        content: processedContent
      });
      setTimeout(() => this.blogLoader.renderMermaidDiagrams(), 150);
    } else {
      const fallback = BLOG_POSTS.find(p => p.id === id);
      if (fallback) {
        let contentHtml = fallback.content;
        if (fallback.content && !fallback.content.includes('<p>')) {
          contentHtml = parseMarkdownWithAlerts(fallback.content);
        }
        this.rawMarkdown.set(fallback.content || '');
        const words = (fallback.content || '').split(/\s+/).length;
        const readMin = Math.max(1, Math.ceil(words / 200));
        this.readingTime.set(`${readMin} min read (${words} words)`);

        const processedContent = this.processHtmlHeadings(contentHtml);

        this.post.set({
          ...fallback,
          content: processedContent
        });
        setTimeout(() => this.blogLoader.renderMermaidDiagrams(), 150);
      }
    }
  }

  // Extract H2 & H3 headings to populate Table of Contents and assign IDs
  private processHtmlHeadings(htmlContent: string): string {
    const tocItems: TocItem[] = [];
    let counter = 0;

    const updatedHtml = htmlContent.replace(/<h([23])(.*?)>(.*?)<\/h\1>/gi, (match, levelStr, attrs, innerText) => {
      counter++;
      const id = `heading-toc-${counter}`;
      const level = parseInt(levelStr, 10);
      const cleanText = innerText.replace(/<[^>]*>/g, '').trim();

      tocItems.push({ id, text: cleanText, level });

      return `<h${levelStr}${attrs} id="${id}">${innerText}</h${levelStr}>`;
    });

    this.tableOfContents.set(tocItems);
    if (tocItems.length > 0) {
      this.activeTocId.set(tocItems[0].id);
    }

    return updatedHtml;
  }

  scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeTocId.set(id);
    }
  }

  copyArticleLink(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.notification.showSuccess('Article link copied to clipboard!');
    }
  }

  copyRawMarkdown(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.rawMarkdown());
      this.notification.showSuccess('Raw Markdown copied to clipboard!');
    }
  }

  downloadMarkdown(): void {
    const blob = new Blob([this.rawMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.post()?.slug || 'article'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    this.notification.showSuccess('Markdown file downloaded.');
  }
}
