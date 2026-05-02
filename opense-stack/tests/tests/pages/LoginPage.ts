import { type Page, type Locator, expect } from '@playwright/test';
import { DEMO_USER } from '../fixtures/auth';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly demoButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.getByText(/invalid login credentials|invalid|failed|error/i).first();
    this.demoButton = page.getByRole('button', { name: /demo/i });
  }

  async goto() {
    await this.page.goto('/auth');
  }

  async login(email: string = DEMO_USER.email, password: string = DEMO_USER.password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginWithDemo() {
    await this.demoButton.click();
  }

  async expectToBeLoggedIn() {
    await expect(this.page).toHaveURL(/\/(dashboard|inventory)/);
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
