import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerTab: Locator;
  readonly nameInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[type="email"], input[name="email"], input[formcontrolname="email"]').first();
    this.passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    this.submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    this.registerTab = page.locator('a:has-text("Register"), button:has-text("Register"), .tab-register').first();
    this.nameInput = page.locator('input[name="name"], input[formcontrolname="name"]').first();
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, pass: string) {
    if (await this.emailInput.isVisible()) {
      await this.emailInput.fill(email);
    }
    if (await this.passwordInput.isVisible()) {
      await this.passwordInput.fill(pass);
    }
    if (await this.submitButton.isVisible()) {
      await this.submitButton.click();
    }
  }
}
