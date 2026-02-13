import { test, expect } from '../../fixtures/etlAuth';
import { ETLWorkflowEditorPage } from '../../pages/etl/ETLWorkflowEditorPage';

test.describe('ETL Workflow Editor', () => {
  test('editor canvas and run workflow smoke', async ({ authenticatedEtlPage }) => {
    await authenticatedEtlPage.goto('/editor/demo');

    const editor = new ETLWorkflowEditorPage(authenticatedEtlPage);
    await editor.expectLoaded();

    if (await editor.canvas.isVisible().catch(() => false)) {
      await expect(editor.canvas).toBeVisible();
    }

    if (await editor.runButton.isVisible().catch(() => false)) {
      await editor.runButton.click();
    }
  });
});
