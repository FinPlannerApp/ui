import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ModuleTabs } from '../../../shared/components/module-tabs/module-tabs';
import { ACCOUNTS_TABS } from '../accounts-tabs';
import { InterestDue } from '../interest-due/interest-due';

/** Interest earned on bank accounts and paid on loans, and the credits waiting to be confirmed. Lives in its own tab so it never pushes the account list around. */
@Component({
  selector: 'app-interest-page',
  standalone: true,
  imports: [ModuleTabs, InterestDue],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="w-full flex flex-col gap-4 py-4">
  <app-module-tabs [tabs]="tabs" label="Accounts sections" />
  <div>
    <h1 class="text-2xl font-bold m-0 gradient-text">Interest</h1>
    <p class="text-sm text-muted mt-1 mb-0">Interest your accounts have earned, and credits from your bank that are waiting for you to confirm.</p>
  </div>
  <app-interest-due [always]="true"></app-interest-due>
</div>`,
})
export class InterestPage {
  readonly tabs = ACCOUNTS_TABS;
}
