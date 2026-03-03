import { type Locator, type Page, expect } from '@playwright/test';

export class ETLGalleryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly cloneButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /workflow gallery|gallery|workflow/i }).first();
    this.cloneButton = page.getByRole('button', { name: /clone/i }).first();
  }

  async goto() {
    try {
      await this.page.goto('/gallery', { waitUntil: 'commit' });
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
    await expect(this.page).toHaveURL(/\/(gallery|login)/);
  }
}
