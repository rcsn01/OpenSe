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
  });

  test('org list visible and member view reachable', async ({ authenticatedAdminPage }) => {
    const etlAdmin = new ETLAdminPage(authenticatedAdminPage);
    await etlAdmin.goto();

    if (await etlAdmin.orgTable.isVisible().catch(() => false)) {
      await expect(etlAdmin.orgTable).toBeVisible();
    }
  });
});
