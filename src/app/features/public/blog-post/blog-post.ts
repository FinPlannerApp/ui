import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BLOG_POSTS } from '../blog/blog';

@Component({
  selector: 'app-blog-post',
  imports: [RouterLink],
  templateUrl: './blog-post.html',
})
export class BlogPost {
  private route = inject(ActivatedRoute);

  post: any;

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      this.post = BLOG_POSTS.find(p => p.id === id);
    });
  }
}
