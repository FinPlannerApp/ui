import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-contact',
  imports: [FormsModule, RouterLink, RevealDirective],
  templateUrl: './contact.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private http = inject(HttpClient);
  form = { name: '', email: '', subject: '', message: '' };
  sending = signal(false);
  sent = signal(false);
  error = signal('');

  onSubmit() {
    if (this.sending()) return;
    const name = this.form.name.trim(), email = this.form.email.trim();
    const message = this.form.message.trim(), subject = this.form.subject.trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 3) {
      this.error.set('Please add your name, a valid email and a message.');
      return;
    }
    this.error.set('');
    this.sending.set(true);
    const description = (subject ? subject + '\n\n' : '') + message;
    this.http.post<{ isSuccess: boolean }>(`${environment.apiBaseUrl}/Feedback/upsert`, {
      name, email, type: 'Contact', description: description.slice(0, 4000),
    }).subscribe({
      next: (res) => {
        this.sending.set(false);
        if (res?.isSuccess === false) { this.error.set('Could not send your message. Please try again in a few minutes.'); return; }
        this.sent.set(true);
        this.form = { name: '', email: '', subject: '', message: '' };
      },
      error: () => { this.sending.set(false); this.error.set('Could not send your message. Please try again in a few minutes.'); },
    });
  }
}
