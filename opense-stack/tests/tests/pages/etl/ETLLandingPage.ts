import { type Locator, type Page, expect } from '@playwright/test';

export class ETLLandingPage {
  readonly page: Page;
  readonly brand: Locator;
  readonly loginButton: Locator;
  readonly getStartedButton: Locator;
  readonly dashboardButton: Locator;
  readonly sharedAuthHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brand = page.getByText(/Open-ETL/i).first();
    this.loginButton = page.getByRole('link', { name: /log in/i }).first();
    this.getStartedButton = page.getByRole('link', { name: /get started/i }).first();
    this.dashboardButton = page.getByRole('link', { name: /go to dashboard/i }).first();
    this.sharedAuthHeading = page.getByRole('heading', { name: /sign in/i }).first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.brand).toBeVisible();

    const detectedState = await Promise.race([
      this.sharedAuthHeading.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'shared-auth'),
      this.loginButton.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'public-landing'),
      this.dashboardButton.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'authenticated-landing'),
    ]).catch(() => null);

    if (detectedState === 'shared-auth') {
      await expect(this.sharedAuthHeading).toBeVisible();
      return;
    }

    if (detectedState === 'public-landing') {
      await expect(this.loginButton).toBeVisible();
      await expect(this.getStartedButton).toBeVisible();
      return;
    }

    await expect(this.dashboardButton).toBeVisible();
  }
}
