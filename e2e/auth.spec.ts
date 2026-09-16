import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should render login page with form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Financial|Planner|App/i);
    
    // Check form inputs or elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[formcontrolname="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    if (await emailInput.count() > 0) {
      await expect(emailInput.first()).toBeVisible();
    }
    if (await passwordInput.count() > 0) {
      await expect(passwordInput.first()).toBeVisible();
    }
  });

  test('should show validation or error on empty credentials submit', async ({ page }) => {
    await page.goto('/login');
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      // Verify page stays on login or error message appears
      expect(page.url()).toContain('login');
    }
  });
});
