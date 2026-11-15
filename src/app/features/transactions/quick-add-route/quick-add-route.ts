import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QuickAddService } from '../../../shared/components/quick-add/quick-add.service';

/** Target of the PWA "Add transaction" shortcut (/app/quick-add): opens the Quick add dialog over the dashboard. */
@Component({ selector: 'app-quick-add-route', standalone: true, template: '' })
export class QuickAddRoute implements OnInit {
  private router = inject(Router);
  private quickAdd = inject(QuickAddService);
  ngOnInit(): void {
    void this.router.navigateByUrl('/app/dashboard', { replaceUrl: true }).then(() => this.quickAdd.open());
  }
}
