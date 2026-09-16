import { test, expect } from '@playwright/test';

test.describe('Categories View', () => {
  test('should navigate to categories page', async ({ page }) => {
    await page.goto('/categories');
    await expect(page.locator('body')).toBeVisible();
  });
});
