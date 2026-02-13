import { type Locator, type Page, expect } from '@playwright/test';

export class ETLLandingPage {
  readonly page: Page;
  readonly brand: Locator;
  readonly loginButton: Locator;
  readonly getStartedButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brand = page.getByText(/Open-ETL/i).first();
    this.loginButton = page.getByRole('link', { name: /log in/i }).first();
    this.getStartedButton = page.getByRole('link', { name: /get started/i }).first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.brand).toBeVisible();
    await expect(this.loginButton).toBeVisible();
    await expect(this.getStartedButton).toBeVisible();
  }
}
