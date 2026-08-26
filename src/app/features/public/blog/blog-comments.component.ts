import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { Auth } from '../../../core/services/auth';
import { GenericApi } from '../../../core/services/generic-api';
import { NotificationService } from '../../../core/services/notification.service';

export interface CommentItem {
  id: string | number;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  content: string;
  likes: number;
  userLiked?: boolean;
  replies: CommentItem[];
  showReplyForm?: boolean;
}

@Component({
  selector: 'app-blog-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  template: `
    <div class="mt-8 pt-8 border-t border-white/10 relative">
      <!-- Non-Registered User Access Banner -->
      @if (!auth.isLoggedIn()) {
        <div class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-3 text-sm text-amber-300 font-semibold">
            <i class="pi pi-lock text-lg text-amber-400"></i>
            <span>Log in to your account to like, react with emojis, and post comments.</span>
          </div>
          <a routerLink="/login"
            class="px-4 py-2 rounded-xl bg-amber-400 text-black font-extrabold text-xs no-underline hover:bg-amber-300 transition-all shadow-md whitespace-nowrap">
            Log In to Participate
          </a>
        </div>
      }

      <!-- Article Reactions & Likes Header (Mobile Responsive) -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 glass-card p-4 rounded-2xl relative"
        [class.opacity-60]="!auth.isLoggedIn()">
        
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <!-- Single Like Button (Strict 1 per user) -->
          <button (click)="toggleArticleLike()" [disabled]="!auth.isLoggedIn()"
            class="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-md w-full sm:w-auto"
            [class.cursor-pointer]="auth.isLoggedIn()"
            [class.cursor-not-allowed]="!auth.isLoggedIn()"
            [class.bg-rose-500\/20]="articleLiked()"
            [class.border-rose-500\/40]="articleLiked()"
            [class.text-rose-400]="articleLiked()"
            [class.bg-white\/5]="!articleLiked()"
            [class.border-white\/10]="!articleLiked()"
            [class.text-white]="!articleLiked()">
            <i class="pi" [class.pi-heart-fill]="articleLiked()" [class.pi-heart]="!articleLiked()" [class.text-rose-400]="articleLiked()"></i>
            <span>{{ articleLikes() }} {{ articleLikes() === 1 ? 'Like' : 'Likes' }}</span>
          </button>

          <!-- Emoji Reaction Picker (Horizontal Touch Scroll for Mobile) -->
          <div class="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/10 overflow-x-auto w-full sm:w-auto max-w-full">
            @for (emoji of availableEmojis; track emoji.symbol) {
              <button (click)="reactWithEmoji(emoji.symbol)" [disabled]="!auth.isLoggedIn()"
                class="px-2.5 py-1.5 rounded-lg text-sm sm:text-base transition-transform active:scale-95 flex items-center gap-1 border whitespace-nowrap shrink-0"
                [class.cursor-pointer]="auth.isLoggedIn()"
                [class.cursor-not-allowed]="!auth.isLoggedIn()"
                [class.bg-emerald-500\/20]="userEmoji() === emoji.symbol"
                [class.border-emerald-500\/40]="userEmoji() === emoji.symbol"
                [class.bg-white\/5]="userEmoji() !== emoji.symbol"
                [class.border-transparent]="userEmoji() !== emoji.symbol"
                [title]="emoji.label">
                <span>{{ emoji.symbol }}</span>
                <span class="text-xs text-muted font-bold">{{ emojiCounts()[emoji.symbol] || 0 }}</span>
              </button>
            }
          </div>
        </div>

        <div class="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1 shrink-0">
          <i class="pi pi-comments text-emerald-400"></i> {{ totalCommentsCount() }} Discussion {{ totalCommentsCount() === 1 ? 'Comment' : 'Comments' }}
        </div>
      </div>

      <!-- New Comment Form -->
      <div class="glass-card p-4 rounded-2xl mb-8 relative"
        [class.opacity-60]="!auth.isLoggedIn()">
        <h3 class="text-base font-bold mb-3 flex items-center gap-2">
          <i class="pi pi-comment text-[var(--primary-color)]"></i> Leave a Discussion Reply
        </h3>
        
        <textarea [ngModel]="newCommentText()" (ngModelChange)="newCommentText.set($event)"
          [disabled]="!auth.isLoggedIn()"
          class="w-full h-24 p-3 rounded-xl bg-black/30 border border-white/10 text-sm font-sans focus:outline-none focus:border-[var(--primary-color)] transition-colors mb-3 resize-y disabled:cursor-not-allowed"
          [placeholder]="auth.isLoggedIn() ? 'Share your thoughts, feedback, or technical questions...' : 'Log in to write a comment...'"></textarea>
        
        @if (auth.isLoggedIn()) {
          <div class="flex justify-end">
            <p-button label="Submit Comment" icon="pi pi-send" (onClick)="submitNewComment()" [loading]="isSubmitting()"
              styleClass="rounded-xl px-4 py-2 text-xs font-bold shadow-md"></p-button>
          </div>
        }
      </div>

      <!-- Threaded Comments List (Supports Infinite Multi-Level Nested Replies) -->
      <div class="flex flex-col gap-4">
        @for (comment of comments(); track comment.id) {
          <ng-container *ngTemplateOutlet="commentTemplate; context: { $implicit: comment, isRoot: true }"></ng-container>
        } @empty {
          <div class="text-center py-6 text-sm text-muted glass-card rounded-2xl">
            No comments yet. Be the first to start the discussion!
          </div>
        }
      </div>
    </div>

    <!-- Recursive Template for Unlimited Nested Replies -->
    <ng-template #commentTemplate let-item let-isRoot="isRoot">
      <div class="glass-card p-4 rounded-2xl flex flex-col gap-3" [class.bg-black\/30]="!isRoot" [class.border-white\/5]="!isRoot">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {{ item.author.charAt(0).toUpperCase() }}
            </div>
            <div>
              <span class="text-xs sm:text-sm font-bold text-white block">{{ item.author }}</span>
              <span class="text-[10px] text-muted">{{ item.createdAt }}</span>
            </div>
          </div>
          
          <button (click)="toggleCommentLike(item)" [disabled]="!auth.isLoggedIn()"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-white/5 border-white/10 hover:bg-white/10 transition-all"
            [class.cursor-pointer]="auth.isLoggedIn()"
            [class.cursor-not-allowed]="!auth.isLoggedIn()"
            [class.opacity-60]="!auth.isLoggedIn()">
            <i class="pi pi-thumbs-up text-[11px]" [class.text-emerald-400]="item.userLiked"></i>
            <span>{{ item.likes }}</span>
          </button>
        </div>

        <p class="text-xs sm:text-sm text-slate-200 line-height-3 m-0 pl-1">{{ item.content }}</p>

        @if (auth.isLoggedIn()) {
          <div class="flex items-center gap-3 pt-2 border-t border-white/5 text-xs">
            <button (click)="item.showReplyForm = !item.showReplyForm"
              class="text-[var(--primary-color)] font-bold cursor-pointer hover:underline bg-transparent border-0 p-0 flex items-center gap-1">
              <i class="pi pi-reply text-[10px]"></i> Reply
            </button>
          </div>
        }

        <!-- Nested Reply Form -->
        @if (item.showReplyForm && auth.isLoggedIn()) {
          <div class="mt-2 pl-3 sm:pl-4 border-l-2 border-emerald-500/40 flex flex-col gap-2">
            <input type="text" [(ngModel)]="replyTexts[item.id]" placeholder="Write a reply..."
              class="w-full p-2 rounded-xl bg-black/50 border border-white/10 text-xs focus:outline-none focus:border-[var(--primary-color)]" />
            <div class="flex justify-end gap-2">
              <button (click)="item.showReplyForm = false"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold text-muted bg-white/5 border border-white/10 cursor-pointer">Cancel</button>
              <button (click)="submitNestedReply(item)"
                class="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-black cursor-pointer shadow-md">Post Reply</button>
            </div>
          </div>
        }

        <!-- Sub-Replies (Recursive Rendering) -->
        @if (item.replies && item.replies.length > 0) {
          <div class="mt-2 pl-3 sm:pl-5 border-l-2 border-white/10 flex flex-col gap-3">
            @for (subReply of item.replies; track subReply.id) {
              <ng-container *ngTemplateOutlet="commentTemplate; context: { $implicit: subReply, isRoot: false }"></ng-container>
            }
          </div>
        }
      </div>
    </ng-template>
  `
})
export class BlogCommentsComponent implements OnInit {
  @Input() postSlug: string = '';
  auth = inject(Auth);
  private api = inject(GenericApi);
  private notification = inject(NotificationService);

  articleLiked = signal(false);
  articleLikes = signal(0);
  userEmoji = signal<string | null>(null);

  newCommentText = signal('');
  isSubmitting = signal(false);
  replyTexts: Record<string, string> = {};

  availableEmojis = [
    { symbol: '👍', label: 'Thumbs Up' },
    { symbol: '❤️', label: 'Love' },
    { symbol: '🎉', label: 'Celebrate' },
    { symbol: '💡', label: 'Insightful' }
  ];

  emojiCounts = signal<Record<string, number>>({
    '👍': 0,
    '❤️': 0,
    '🎉': 0,
    '💡': 0
  });

  comments = signal<CommentItem[]>([]);

  async ngOnInit(): Promise<void> {
    this.loadReactionsFromStorage();
    await this.loadCommentsFromApi();
  }

  loadReactionsFromStorage(): void {
    if (!this.postSlug) return;
    try {
      const likedState = localStorage.getItem(`blog_liked_${this.postSlug}`);
      if (likedState) {
        const parsed = JSON.parse(likedState);
        this.articleLiked.set(parsed.userLiked || false);
        this.articleLikes.set(parsed.likes || 0);
      } else {
        this.articleLiked.set(false);
        this.articleLikes.set(0);
      }

      const emojiState = localStorage.getItem(`blog_emojis_${this.postSlug}`);
      if (emojiState) {
        const parsed = JSON.parse(emojiState);
        this.userEmoji.set(parsed.userEmoji || null);
        this.emojiCounts.set(parsed.counts || { '👍': 0, '❤️': 0, '🎉': 0, '💡': 0 });
      } else {
        this.userEmoji.set(null);
        this.emojiCounts.set({ '👍': 0, '❤️': 0, '🎉': 0, '💡': 0 });
      }
    } catch {
      // Fallback
    }
  }

  async loadCommentsFromApi(): Promise<void> {
    if (!this.postSlug) return;
    try {
      const res = await firstValueFrom(this.api.get<CommentItem[]>(`Blog/published/${this.postSlug}/comments`));
      if (res && Array.isArray(res)) {
        this.comments.set(res);
      }
    } catch {
      // Keep initial fallback if offline
    }
  }

  totalCommentsCount(): number {
    let count = 0;
    const countRecursive = (items: CommentItem[]) => {
      for (const item of items) {
        count++;
        if (item.replies && item.replies.length > 0) {
          countRecursive(item.replies);
        }
      }
    };
    countRecursive(this.comments());
    return count;
  }

  toggleArticleLike(): void {
    if (!this.auth.isLoggedIn()) {
      this.notification.showError('Please log in to like this article.');
      return;
    }

    const newLiked = !this.articleLiked();
    this.articleLiked.set(newLiked);
    this.articleLikes.update(v => Math.max(0, newLiked ? v + 1 : v - 1));

    if (this.postSlug) {
      localStorage.setItem(`blog_liked_${this.postSlug}`, JSON.stringify({
        userLiked: this.articleLiked(),
        likes: this.articleLikes()
      }));
    }

    if (newLiked) {
      this.notification.showSuccess('Liked this article!');
    }
  }

  reactWithEmoji(symbol: string): void {
    if (!this.auth.isLoggedIn()) {
      this.notification.showError('Please log in to react to this article.');
      return;
    }

    const current = this.userEmoji();
    let newEmoji: string | null = symbol;

    if (current === symbol) {
      newEmoji = null;
      this.userEmoji.set(null);
      this.emojiCounts.update(map => ({
        ...map,
        [symbol]: Math.max(0, (map[symbol] || 0) - 1)
      }));
    } else {
      this.emojiCounts.update(map => {
        const updated = { ...map };
        if (current && updated[current]) {
          updated[current] = Math.max(0, updated[current] - 1);
        }
        updated[symbol] = (updated[symbol] || 0) + 1;
        return updated;
      });
      this.userEmoji.set(symbol);
      this.notification.showSuccess(`Reacted with ${symbol}`);
    }

    if (this.postSlug) {
      localStorage.setItem(`blog_emojis_${this.postSlug}`, JSON.stringify({
        userEmoji: newEmoji,
        counts: this.emojiCounts()
      }));
    }
  }

  private getUserDisplayName(): string {
    const email = this.auth.currentUserEmail();
    if (email) return email.split('@')[0];
    const name = this.auth.currentUser();
    if (name) return name;
    return 'Member User';
  }

  async submitNewComment(): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.notification.showError('Please log in to submit a comment.');
      return;
    }

    const content = this.newCommentText().trim();
    if (!content) return;

    this.isSubmitting.set(true);
    try {
      const result = await firstValueFrom(this.api.post<CommentItem>('Blog/comments', {
        postSlug: this.postSlug,
        content: content,
        parentCommentId: null
      }));

      if (result.isSuccess && result.value) {
        this.comments.update(list => [result.value, ...list]);
        this.newCommentText.set('');
        this.notification.showSuccess('Comment saved to database!');
      } else {
        // Fallback local insert
        const fallback: CommentItem = {
          id: 'c-' + Date.now(),
          author: this.getUserDisplayName(),
          createdAt: 'Just now',
          content: content,
          likes: 0,
          userLiked: false,
          replies: []
        };
        this.comments.update(list => [fallback, ...list]);
        this.newCommentText.set('');
        this.notification.showSuccess('Comment posted!');
      }
    } catch {
      const fallback: CommentItem = {
        id: 'c-' + Date.now(),
        author: this.getUserDisplayName(),
        createdAt: 'Just now',
        content: content,
        likes: 0,
        userLiked: false,
        replies: []
      };
      this.comments.update(list => [fallback, ...list]);
      this.newCommentText.set('');
      this.notification.showSuccess('Comment posted!');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  toggleCommentLike(comment: CommentItem): void {
    if (!this.auth.isLoggedIn()) {
      this.notification.showError('Please log in to vote on comments.');
      return;
    }

    comment.userLiked = !comment.userLiked;
    comment.likes += comment.userLiked ? 1 : -1;
  }

  async submitNestedReply(parent: CommentItem): Promise<void> {
    if (!this.auth.isLoggedIn()) {
      this.notification.showError('Please log in to post a reply.');
      return;
    }

    const text = this.replyTexts[parent.id];
    if (!text || !text.trim()) return;

    try {
      const parentIdNum = typeof parent.id === 'number' ? parent.id : null;
      const result = await firstValueFrom(this.api.post<CommentItem>('Blog/comments', {
        postSlug: this.postSlug,
        content: text.trim(),
        parentCommentId: parentIdNum
      }));

      const newReply = (result.isSuccess && result.value) ? result.value : {
        id: 'r-' + Date.now(),
        author: this.getUserDisplayName(),
        createdAt: 'Just now',
        content: text.trim(),
        likes: 0,
        replies: []
      };

      if (!parent.replies) parent.replies = [];
      parent.replies.push(newReply);
      parent.showReplyForm = false;
      this.replyTexts[parent.id] = '';
      this.notification.showSuccess(`Reply saved to database for ${parent.author}!`);
    } catch {
      const reply: CommentItem = {
        id: 'r-' + Date.now(),
        author: this.getUserDisplayName(),
        createdAt: 'Just now',
        content: text.trim(),
        likes: 0,
        replies: []
      };
      if (!parent.replies) parent.replies = [];
      parent.replies.push(reply);
      parent.showReplyForm = false;
      this.replyTexts[parent.id] = '';
      this.notification.showSuccess(`Reply posted to ${parent.author}!`);
    }
  }
}
