import { type Locator, type Page, expect } from '@playwright/test';

export class ETLActivitiesPage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /activity|activities|usage/i }).first();
  }

  async goto() {
    await this.page.goto('/activity');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(activity|login)/);
  }
}
