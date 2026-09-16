import { test, expect } from '@playwright/test';

test.describe('Scalable E2E: Split & Group Settlement', () => {
  test('navigates to split view without application crash', async ({ page }) => {
    await page.goto('/split');
    await expect(page.locator('body')).toBeVisible();
  });
});
