import { type Locator, type Page, expect } from '@playwright/test';

export class ETLLandingPage {
  readonly page: Page;
  readonly brand: Locator;
  readonly loginButton: Locator;
  readonly getStartedButton: Locator;
  readonly startBuildingButton: Locator;
  readonly sharedAuthHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brand = page.getByText(/Open-ETL/i).first();
    this.loginButton = page.getByRole('link', { name: /log in/i }).first();
    this.getStartedButton = page.getByRole('link', { name: /get started/i }).first();
    this.startBuildingButton = page.getByRole('link', { name: /start building/i }).first();
    this.sharedAuthHeading = page.getByRole('heading', { name: /sign in/i }).first();
  }

  async goto() {
    await this.page.goto('/');
  }

  async expectLoaded() {
    await expect(this.brand).toBeVisible();

    const detectedState = await Promise.race([
      this.sharedAuthHeading.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'shared-auth' as const),
      this.loginButton.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'public-landing' as const),
      this.getStartedButton.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'public-landing' as const),
      this.startBuildingButton.waitFor({ state: 'visible', timeout: 7000 }).then(() => 'public-landing' as const),
    ]).catch(() => null);

    if (detectedState === 'shared-auth') {
      await expect(this.sharedAuthHeading).toBeVisible();
      return;
    }

    // Landing page shows at least one CTA link
    const anyCtaVisible =
      await this.getStartedButton.isVisible().catch(() => false) ||
      await this.startBuildingButton.isVisible().catch(() => false) ||
      await this.loginButton.isVisible().catch(() => false);
    expect(anyCtaVisible).toBe(true);
  }
}
