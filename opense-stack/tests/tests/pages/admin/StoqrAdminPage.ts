import { type Locator, type Page, expect } from '@playwright/test';

export class StoqrAdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly companiesHeading: Locator;
  readonly selectedCompanyHeading: Locator;
  readonly inviteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /stoqr admin/i }).first();
    this.companiesHeading = page.getByRole('heading', { name: /companies/i }).first();
    this.selectedCompanyHeading = page.getByRole('heading', { name: /selected company/i }).first();
    this.inviteButton = page.getByRole('button', { name: /invite/i }).first();
  }

  async goto() {
    await this.page.goto('/stoqr');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(stoqr|login)/);
  }
}
