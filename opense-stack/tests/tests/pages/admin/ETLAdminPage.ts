import { type Locator, type Page, expect } from '@playwright/test';

export class ETLAdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly organisationsTab: Locator;
  readonly usersTab: Locator;
  readonly etlConfigTab: Locator;
  readonly orgTable: Locator;
  readonly addWorkflowButton: Locator;
  readonly removeWorkflowButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /etl super admin|etl admin/i }).first();
    this.organisationsTab = page.getByRole('button', { name: /organisations/i }).first();
    this.usersTab = page.getByRole('button', { name: /users/i }).first();
    this.etlConfigTab = page.getByRole('button', { name: /etl config/i }).first();
    this.orgTable = page.getByRole('table').first();
    this.addWorkflowButton = page.getByRole('button', { name: /^add workflow$/i });
    this.removeWorkflowButton = page.getByRole('button', { name: /^remove$/i }).first();
  }

  async goto() {
    await this.page.goto('/organisations');
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(organisations|login)/);
  }
}
