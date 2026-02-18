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
    await this.page.goto('/gallery');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(gallery|login)/);
  }
}
