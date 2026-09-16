import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly netWorthCard: Locator;
  readonly navMenu: Locator;
  readonly themeToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.netWorthCard = page.locator('.net-worth-card, .metric-card, .dashboard-summary').first();
    this.navMenu = page.locator('nav, .navbar, .sidebar').first();
    this.themeToggle = page.locator('button[aria-label*="theme"], button:has-text("Dark"), button:has-text("Light"), .theme-toggle').first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async toggleTheme() {
    if (await this.themeToggle.isVisible()) {
      await this.themeToggle.click();
    }
  }
}
