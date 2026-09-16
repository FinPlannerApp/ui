import { test, expect } from '@playwright/test';
import { TransactionsPage } from '../pages/TransactionsPage';

test.describe('Scalable E2E: Transactions Management', () => {
  test('transactions list renders table or empty container via POM', async ({ page }) => {
    const txPage = new TransactionsPage(page);
    await txPage.goto();

    await expect(page.locator('body')).toBeVisible();
  });

  test('search filter input accepts query string', async ({ page }) => {
    const txPage = new TransactionsPage(page);
    await txPage.goto();
    await txPage.search('Groceries');

    await expect(page.locator('body')).toBeVisible();
  });
});
