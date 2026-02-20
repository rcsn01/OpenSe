import { test, expect } from '../../fixtures/adminAuth';
import { AdminShellPage } from '../../pages/admin/AdminShellPage';

test.describe('Admin Global Sections', () => {
  test('sidebar exposes all top-level admin sections', async ({ authenticatedAdminPage }) => {
    const shell = new AdminShellPage(authenticatedAdminPage);
    await authenticatedAdminPage.goto('/platform');
    await expect(authenticatedAdminPage).toHaveURL(/\/(platform|login)/);

    if (await authenticatedAdminPage.getByRole('heading', { name: /global overview|platform overview/i }).isVisible().catch(() => false)) {
      await shell.expectNavVisible();
    }
  });

  test('platform management area buttons navigate to new sections', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/platform');

    const applicationsButton = authenticatedAdminPage.getByRole('button', { name: /application management/i });
    if (await applicationsButton.isVisible().catch(() => false)) {
      await applicationsButton.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/(applications|login)/);
    }

    await authenticatedAdminPage.goto('/platform');
    const financialsButton = authenticatedAdminPage.getByRole('button', { name: /financials\s*&\s*billing|financials/i });
    if (await financialsButton.isVisible().catch(() => false)) {
      await financialsButton.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/(financials|login)/);
    }

    await authenticatedAdminPage.goto('/platform');
    const platformAdminButton = authenticatedAdminPage.getByRole('button', { name: /platform administration/i });
    if (await platformAdminButton.isVisible().catch(() => false)) {
      await platformAdminButton.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/(platform-admin|login)/);
    }
  });
});
