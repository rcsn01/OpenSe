import { type Locator, type Page, expect } from '@playwright/test';

export class ETLDashboardPage {
  readonly page: Page;
  readonly personalTab: Locator;
  readonly orgTab: Locator;
  readonly newWorkflowButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.personalTab = page.getByRole('tab', { name: /personal/i }).first();
    this.orgTab = page.getByRole('tab', { name: /org/i }).first();
    this.newWorkflowButton = page.getByRole('button', { name: /new workflow/i }).first();
  }

  async goto() {
    try {
      await this.page.goto('/dashboard');
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
    await expect(this.page).toHaveURL(/\/(dashboard|login)/);
  }
}
