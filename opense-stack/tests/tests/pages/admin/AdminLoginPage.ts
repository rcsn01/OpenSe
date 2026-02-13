import { type Locator, type Page, expect } from '@playwright/test';

export class AdminLoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input#email, input[name="email"]').first();
    this.passwordInput = page.locator('input#password, input[name="password"]').first();
    this.submitButton = page.getByRole('button', { name: /sign in|log in/i }).first();
    this.errorText = page.getByText(/invalid|failed|error|super-admin/i).first();
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectVisible() {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
  }
}
