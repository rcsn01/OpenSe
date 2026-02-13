import { type Locator, type Page, expect } from '@playwright/test';

export class AdminShellPage {
  readonly page: Page;
  readonly platformLink: Locator;
  readonly etlAdminLink: Locator;
  readonly stoqrAdminLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.platformLink = page.getByRole('link', { name: /platform/i });
    this.etlAdminLink = page.getByRole('link', { name: /etl admin/i });
    this.stoqrAdminLink = page.getByRole('link', { name: /stoqr admin/i });
    this.logoutButton = page.getByRole('button', { name: /sign out|log out/i }).first();
  }

  async expectNavVisible() {
    await expect(this.platformLink).toBeVisible();
    await expect(this.etlAdminLink).toBeVisible();
    await expect(this.stoqrAdminLink).toBeVisible();
  }
}
