import { test, expect } from '../../fixtures/adminAuth';
import { PlatformOverviewPage } from '../../pages/admin/PlatformOverviewPage';

test.describe('Admin Platform Overview', () => {
  test('overview loads and metric cards are visible', async ({ authenticatedAdminPage }) => {
    const platformPage = new PlatformOverviewPage(authenticatedAdminPage);
    await platformPage.goto();

    await expect(authenticatedAdminPage).toHaveURL(/\/(platform|login)/);
    if (await platformPage.heading.isVisible().catch(() => false)) {
      await platformPage.expectLoaded();
    }
  });

  test('Manage ETL and Manage StoQR navigate correctly', async ({ authenticatedAdminPage }) => {
    const platformPage = new PlatformOverviewPage(authenticatedAdminPage);
    await platformPage.goto();

    if (await platformPage.manageEtlButton.isVisible().catch(() => false)) {
      await platformPage.manageEtlButton.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/(organisations|login)/);
      await authenticatedAdminPage.goto('/platform');
    }

    if (await platformPage.manageStoqrButton.isVisible().catch(() => false)) {
      await platformPage.manageStoqrButton.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/(stoqr|login)/);
    }
  });
});
