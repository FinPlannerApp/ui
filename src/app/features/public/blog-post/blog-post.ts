import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BLOG_POSTS } from '../blog/blog';
import { BlogLoaderService, parseMarkdownWithAlerts } from '../blog/blog-loader.service';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Auth } from '../../../core/services/auth';
import { BlogCommentsComponent } from '../blog/blog-comments.component';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, BlogCommentsComponent],
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

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (height > 0) {
      this.scrollProgress.set(Math.min(100, Math.max(0, (winScroll / height) * 100)));
    }
  }

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    const loaded = await this.blogLoader.loadPost(id);

    if (loaded) {
      const markdown = loaded.contentMarkdown || loaded.contentHtml || '';
      const words = markdown.split(/\s+/).length;
      const readMin = Math.max(1, Math.ceil(words / 200));
      this.readingTime.set(`${readMin} min read (${words} words)`);

      this.post.set({
        ...loaded,
        tag: loaded.tag || 'Blog',
        tagColor: loaded.tagColor || '#6366f1',
        date: loaded.publishedAt ? new Date(loaded.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        content: loaded.contentHtml
      });
      setTimeout(() => this.blogLoader.renderMermaidDiagrams(), 150);
    } else {
      const fallback = BLOG_POSTS.find(p => p.id === id);
      if (fallback) {
        let contentHtml = fallback.content;
        if (fallback.content && !fallback.content.includes('<p>')) {
          contentHtml = parseMarkdownWithAlerts(fallback.content);
        }
        const words = (fallback.content || '').split(/\s+/).length;
        const readMin = Math.max(1, Math.ceil(words / 200));
        this.readingTime.set(`${readMin} min read (${words} words)`);

        this.post.set({
          ...fallback,
          content: contentHtml
        });
        setTimeout(() => this.blogLoader.renderMermaidDiagrams(), 150);
      }
    }
  }

  copyArticleLink(): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      this.notification.showSuccess('Article link copied to clipboard!');
    }
  }
}
