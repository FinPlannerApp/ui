import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BLOG_POSTS } from '../blog/blog';
import { BlogLoaderService } from '../blog/blog-loader.service';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-post.html',
})
export class BlogPost implements OnInit {
  private route = inject(ActivatedRoute);
  private blogLoader = inject(BlogLoaderService);

  post = signal<any | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id')!;
    const loaded = await this.blogLoader.loadPost(id);

    if (loaded) {
      this.post.set({
        ...loaded,
        tag: loaded.tag || 'Blog',
        tagColor: loaded.tagColor || '#6366f1',
        date: loaded.publishedAt ? new Date(loaded.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent',
        content: loaded.contentHtml
      });
      setTimeout(() => this.blogLoader.renderMermaidDiagrams(), 100);
    } else {
      const fallback = BLOG_POSTS.find(p => p.id === id);
      if (fallback) {
        this.post.set(fallback);
      }
    }
  }
}
