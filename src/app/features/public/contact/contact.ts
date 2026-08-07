import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-contact',
  imports: [FormsModule, InputTextModule, Textarea, ButtonModule],
  templateUrl: './contact.html',
})
export class Contact {
  form = {
    name: '',
    email: '',
    subject: '',
    message: ''
  };

  onSubmit() {
    // Future: hook up to a backend endpoint or email service
  }
}
