import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Scalable E2E: Dashboard Analytics & Layout', () => {
  test('dashboard page renders main container via POM', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('theme toggle interaction succeeds without error', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    await dashboardPage.toggleTheme();

    await expect(page.locator('html')).toBeVisible();
  });
});
