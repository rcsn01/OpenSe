import { test, expect } from '../../fixtures/etlAuth';
import { ETLWorkflowEditorPage } from '../../pages/etl/ETLWorkflowEditorPage';

// Path relative to the Playwright project root (opense-stack/)
const SAMPLE_WORKFLOW = 'tests/tests/fixtures/sample-workflow.json';

/**
 * Regression tests for the workflow import bug where importing a workflow on
 * /editor/new would cause the page to reload on the first attempt and only
 * succeed on the second try.
 *
 * Root cause: React Query's refetchOnWindowFocus fired during the file-dialog
 * blur/focus cycle, causing a re-render cascade that interfered with the
 * file input change event.
 */
test.describe('Workflow Import on /editor/new', () => {
  test('imports a workflow on the first attempt without page reload', async ({ authenticatedEtlPage }) => {
    // Navigate straight to /editor/new
    try {
      await authenticatedEtlPage.goto('/editor/new');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('ERR_ABORTED') && !message.includes('interrupted by another navigation')) {
        throw error;
      }
    }

    // Skip if the environment redirects to login
    test.skip(
      /\/login(\?|$)/.test(authenticatedEtlPage.url()),
      'Editor route redirected to auth — skipping import test',
    );

    const editor = new ETLWorkflowEditorPage(authenticatedEtlPage);
    await editor.expectLoaded();

    // Wait for the editor canvas to be present
    await expect(editor.canvas).toBeVisible({ timeout: 10_000 });

    // Verify the editor starts empty (no nodes)
    const initialNodes = await editor.getNodeCount();
    expect(initialNodes).toBe(0);

    // Record the current URL to detect a full-page reload later
    const urlBefore = authenticatedEtlPage.url();

    // Import the sample workflow on the FIRST attempt
    await editor.importWorkflow(SAMPLE_WORKFLOW);

    // Wait for either a status message confirming import or nodes to appear
    await expect(async () => {
      const nodeCount = await editor.getNodeCount();
      expect(nodeCount).toBeGreaterThan(0);
    }).toPass({ timeout: 5_000 });

    // Verify the page did NOT reload (URL should still be /editor/new or similar)
    expect(authenticatedEtlPage.url()).toBe(urlBefore);

    // The sample workflow has 13 nodes — verify all loaded
    const importedNodeCount = await editor.getNodeCount();
    expect(importedNodeCount).toBe(13);

    // The workflow name should reflect the imported file
    const name = await editor.getWorkflowName();
    expect(name).toContain('Workflow');
  });

  test('import can be repeated without issues (second import replaces first)', async ({ authenticatedEtlPage }) => {
    try {
      await authenticatedEtlPage.goto('/editor/new');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('ERR_ABORTED') && !message.includes('interrupted by another navigation')) {
        throw error;
      }
    }

    test.skip(
      /\/login(\?|$)/.test(authenticatedEtlPage.url()),
      'Editor route redirected to auth — skipping import test',
    );

    const editor = new ETLWorkflowEditorPage(authenticatedEtlPage);
    await editor.expectLoaded();
    await expect(editor.canvas).toBeVisible({ timeout: 10_000 });

    // First import
    await editor.importWorkflow(SAMPLE_WORKFLOW);
    await expect(async () => {
      expect(await editor.getNodeCount()).toBeGreaterThan(0);
    }).toPass({ timeout: 5_000 });

    const firstCount = await editor.getNodeCount();
    expect(firstCount).toBe(13);

    // Second import — should replace the graph cleanly
    await editor.importWorkflow(SAMPLE_WORKFLOW);
    await expect(async () => {
      expect(await editor.getNodeCount()).toBe(13);
    }).toPass({ timeout: 5_000 });
  });

  test('status message shows "Workflow imported" after first import', async ({ authenticatedEtlPage }) => {
    try {
      await authenticatedEtlPage.goto('/editor/new');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('ERR_ABORTED') && !message.includes('interrupted by another navigation')) {
        throw error;
      }
    }

    test.skip(
      /\/login(\?|$)/.test(authenticatedEtlPage.url()),
      'Editor route redirected to auth — skipping import test',
    );

    const editor = new ETLWorkflowEditorPage(authenticatedEtlPage);
    await editor.expectLoaded();
    await expect(editor.canvas).toBeVisible({ timeout: 10_000 });

    await editor.importWorkflow(SAMPLE_WORKFLOW);

    // The status bar should show the 'Workflow imported' message
    await expect(editor.statusMessage).toContainText('Workflow imported', { timeout: 5_000 });
  });
});
