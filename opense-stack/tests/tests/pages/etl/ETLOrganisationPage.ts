import { type Locator, type Page, expect } from '@playwright/test';

export class ETLOrganisationPage {
  readonly page: Page;
  readonly teamTab: Locator;
  readonly billingTab: Locator;
  readonly usageTab: Locator;
  readonly logsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.teamTab = page.getByRole('link', { name: /team/i }).first();
    this.billingTab = page.getByRole('link', { name: /billing/i }).first();
    this.usageTab = page.getByRole('link', { name: /usage/i }).first();
    this.logsTab = page.getByRole('link', { name: /logs/i }).first();
  }

  async goto() {
    try {
      await this.page.goto('/organisation', { waitUntil: 'commit' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isExpectedRedirectAbort =
        message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

      if (!isExpectedRedirectAbort) {
        throw error;
      }
    }
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(organisation|login)/);
  }
}
