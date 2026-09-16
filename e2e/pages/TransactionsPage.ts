import { Page, Locator } from '@playwright/test';

export class TransactionsPage {
  readonly page: Page;
  readonly transactionTable: Locator;
  readonly searchInput: Locator;
  readonly addTransactionBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.transactionTable = page.locator('table, .p-datatable, .transaction-list').first();
    this.searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    this.addTransactionBtn = page.locator('button:has-text("Add"), button:has-text("New Transaction")').first();
  }

  async goto() {
    await this.page.goto('/transactions');
  }

  async search(query: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query);
    }
  }
}
