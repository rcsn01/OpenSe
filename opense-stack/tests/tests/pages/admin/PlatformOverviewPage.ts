import { type Locator, type Page, expect } from '@playwright/test';

export class PlatformOverviewPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly manageEtlButton: Locator;
  readonly manageStoqrButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /platform overview/i });
    this.manageEtlButton = page.getByRole('button', { name: /manage etl/i });
    this.manageStoqrButton = page.getByRole('button', { name: /manage stoqr/i });
  }

  async goto() {
    await this.page.goto('/platform');
  }

  async expectLoaded() {
    await expect(this.heading).toBeVisible();
    await expect(this.page.getByText(/ETL Organisations|ETL Users|Super Admins|StoQR Companies/i).first()).toBeVisible();
  }
}
