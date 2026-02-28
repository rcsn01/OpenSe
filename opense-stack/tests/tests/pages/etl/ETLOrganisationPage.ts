import { type Locator, type Page, expect } from '@playwright/test';

export class ETLOrganisationPage {
  readonly page: Page;
  readonly teamTab: Locator;
  readonly permissionsTab: Locator;
  readonly usageTab: Locator;
  readonly logsTab: Locator;

  constructor(page: Page) {
    this.page = page;
    this.teamTab = page.getByRole('button', { name: /team/i }).first();
    this.permissionsTab = page.getByRole('button', { name: /permissions/i }).first();
    this.usageTab = page.getByRole('button', { name: /usage/i }).first();
    this.logsTab = page.getByRole('button', { name: /logs/i }).first();
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
