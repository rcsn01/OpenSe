import { type Locator, type Page, expect } from '@playwright/test';

export class ETLAdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly organisationsTab: Locator;
  readonly usersTab: Locator;
  readonly orgTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /etl admin/i }).first();
    this.organisationsTab = page.getByRole('button', { name: /organisations/i }).first();
    this.usersTab = page.getByRole('button', { name: /users/i }).first();
    this.orgTable = page.getByRole('table').first();
  }

  async goto() {
    await this.page.goto('/etl-admin');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(etl-admin|login)/);
  }
}
