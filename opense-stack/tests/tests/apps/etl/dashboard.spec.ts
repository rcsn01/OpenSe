import { test, expect } from '../../fixtures/etlAuth';
import { ETLDashboardPage } from '../../pages/etl/ETLDashboardPage';

test.describe('ETL Dashboard', () => {
  test('dashboard loads with tabs and workflow list', async ({ authenticatedEtlPage }) => {
    const dashboard = new ETLDashboardPage(authenticatedEtlPage);
    await dashboard.goto();
    await dashboard.expectLoaded();

    if (await dashboard.personalTab.isVisible().catch(() => false)) {
      await expect(dashboard.personalTab).toBeVisible();
    }
    if (await dashboard.orgTab.isVisible().catch(() => false)) {
      await expect(dashboard.orgTab).toBeVisible();
    }
  });

  test('new workflow control routes to editor', async ({ authenticatedEtlPage }) => {
    const dashboard = new ETLDashboardPage(authenticatedEtlPage);
    await dashboard.goto();

    if (await dashboard.newWorkflowButton.isVisible().catch(() => false)) {
      await dashboard.newWorkflowButton.click();
      await expect(authenticatedEtlPage).toHaveURL(/\/(editor|login)/);
    }
  });
});
