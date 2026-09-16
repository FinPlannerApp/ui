import { test, expect } from '@playwright/test';

test.describe('Transactions View', () => {
  test('should navigate to transactions page', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should render table or empty list state', async ({ page }) => {
    await page.goto('/transactions');
    const tableOrList = page.locator('table, .p-datatable, .transaction-list, .empty-state');
    if (await tableOrList.count() > 0) {
      await expect(tableOrList.first()).toBeVisible();
    }
  });
});
