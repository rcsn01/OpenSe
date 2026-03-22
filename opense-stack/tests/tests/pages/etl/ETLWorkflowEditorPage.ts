import { type Locator, type Page, expect } from '@playwright/test';

export class ETLWorkflowEditorPage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly runButton: Locator;
  readonly importButton: Locator;
  readonly saveButton: Locator;
  readonly workflowNameInput: Locator;
  readonly statusMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('.react-flow, [class*="react-flow"], [data-testid="workflow-canvas"]').first();
    this.runButton = page.getByRole('button', { name: /run/i }).first();
    this.importButton = page.getByRole('button', { name: /import/i }).first();
    this.saveButton = page.getByRole('button', { name: /save/i }).first();
    this.workflowNameInput = page.locator('header input[placeholder="Workflow Name"]').first();
    this.statusMessage = page.locator('.bg-blue-50').first();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/(editor|login)/);
  }

  /** Import a workflow JSON file via the hidden file input. */
  async importWorkflow(filePath: string) {
    const fileInput = this.page.locator('input[type="file"][accept="application/json"]');
    await fileInput.setInputFiles(filePath);
  }

  /** Returns the number of ReactFlow nodes rendered on the canvas. */
  async getNodeCount(): Promise<number> {
    return this.page.locator('.react-flow__node').count();
  }

  /** Returns the current workflow name. */
  async getWorkflowName(): Promise<string> {
    return this.workflowNameInput.inputValue();
  }
}
