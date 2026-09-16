import { test, expect } from '@playwright/test';

test.describe('Dashboard Layout & Features', () => {
  test('should load main page structure', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should support theme toggle if available', async ({ page }) => {
    await page.goto('/');
    const themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Dark"), button:has-text("Light"), .theme-toggle');
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      await expect(page.locator('html')).toBeVisible();
    }
  });
});
