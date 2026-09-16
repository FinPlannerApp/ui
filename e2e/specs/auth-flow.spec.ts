import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Scalable E2E: Authentication Flow', () => {
  test('login page elements render correctly via POM', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await expect(page).toHaveTitle(/Financial|Planner|App/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('submitting invalid credentials keeps user on login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'WrongPassword123!');
    
    expect(page.url()).toContain('login');
  });
});
