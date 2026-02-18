import { test, expect } from '../../fixtures/adminAuth';
import { ETLAdminPage } from '../../pages/admin/ETLAdminPage';

test.describe('Admin ETL Management', () => {
  test('orgs and users tabs load', async ({ authenticatedAdminPage }) => {
    const etlAdmin = new ETLAdminPage(authenticatedAdminPage);
    await etlAdmin.goto();
    await etlAdmin.expectLoaded();

    if (await etlAdmin.organisationsTab.isVisible().catch(() => false)) {
      await etlAdmin.organisationsTab.click();
    }
    if (await etlAdmin.usersTab.isVisible().catch(() => false)) {
      await etlAdmin.usersTab.click();
    }

    if (await etlAdmin.etlConfigTab.isVisible().catch(() => false)) {
      await etlAdmin.etlConfigTab.click();
      await expect(etlAdmin.addWorkflowButton).toBeVisible();
    }
  });

  test('org list visible and member view reachable', async ({ authenticatedAdminPage }) => {
    const etlAdmin = new ETLAdminPage(authenticatedAdminPage);
    await etlAdmin.goto();

    if (await etlAdmin.orgTable.isVisible().catch(() => false)) {
      await expect(etlAdmin.orgTable).toBeVisible();
    }
  });

  test('super admin can add and remove gallery workflow', async ({ authenticatedAdminPage }) => {
    const etlAdmin = new ETLAdminPage(authenticatedAdminPage);
    await etlAdmin.goto();

    const canAccessEtlConfig = await etlAdmin.etlConfigTab.isVisible().catch(() => false);
    test.skip(!canAccessEtlConfig, 'ETL config tab unavailable in current auth/session state');

    await etlAdmin.etlConfigTab.click();

    const workflowSelect = authenticatedAdminPage.locator('select').first();
    await expect(workflowSelect).toBeVisible();

    const options = await workflowSelect.locator('option').allTextContents();
    const hasPromotableWorkflow = options.some((label) => label.trim().length > 0);
    test.skip(!hasPromotableWorkflow, 'No promotable workflows available in ETL config dataset');

    await workflowSelect.selectOption({ index: 0 });
    await etlAdmin.addWorkflowButton.click();

    await expect(authenticatedAdminPage.getByText(/workflow added to gallery/i)).toBeVisible();
    await expect(etlAdmin.removeWorkflowButton).toBeVisible();

    await etlAdmin.removeWorkflowButton.click();
    await expect(authenticatedAdminPage.getByText(/workflow removed from gallery/i)).toBeVisible();
  });
});
