import { type Locator, type Page, expect } from '@playwright/test';

export class ETLWorkflowEditorPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly runButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('.react-flow, [class*="react-flow"], [data-testid="workflow-canvas"]').first();
    this.runButton = page.getByRole('button', { name: /run/i }).first();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(editor|login)/);
  }
}
