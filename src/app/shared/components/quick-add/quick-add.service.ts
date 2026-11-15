import { Injectable, signal } from '@angular/core';

/** Opens the Quick add dialog from anywhere (the floating + button, the PWA shortcut, a keyboard shortcut). */
@Injectable({ providedIn: 'root' })
export class QuickAddService {
  readonly visible = signal(false);
  open(): void { this.visible.set(true); }
  close(): void { this.visible.set(false); }
}
