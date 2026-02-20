import { type Locator, type Page, expect } from '@playwright/test';

export class AdminShellPage {
  readonly page: Page;
  readonly platformLink: Locator;
  readonly organizationsLink: Locator;
  readonly applicationsLink: Locator;
  readonly financialsLink: Locator;
  readonly platformAdminLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.platformLink = page.getByText(/global overview|platform/i).first();
    this.organizationsLink = page.getByText(/organizations list|organisations/i).first();
    this.applicationsLink = page.getByText(/application mgmt|application management/i).first();
    this.financialsLink = page.getByText(/financials/i).first();
    this.platformAdminLink = page.getByText(/platform admin/i).first();
    this.logoutButton = page.getByRole('button', { name: /sign out|log out/i }).first();
  }

  async expectNavVisible() {
    await expect(this.platformLink).toBeVisible();
    await expect(this.organizationsLink).toBeVisible();
    await expect(this.applicationsLink).toBeVisible();
    await expect(this.financialsLink).toBeVisible();
    await expect(this.platformAdminLink).toBeVisible();
  }
}
