export interface BlogPostMeta {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: string;
  tag?: string;
  tagColor?: string;
  isPublished?: boolean;
}

export interface BlogPost extends BlogPostMeta {
  contentMarkdown: string;
  contentHtml: string;
  isPublished: boolean;
}
