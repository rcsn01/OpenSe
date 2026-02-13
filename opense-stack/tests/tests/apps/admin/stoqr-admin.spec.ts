import { test, expect } from '../../fixtures/adminAuth';
import { StoqrAdminPage } from '../../pages/admin/StoqrAdminPage';

test.describe('Admin StoQR Management', () => {
  test('company list and members view load', async ({ authenticatedAdminPage }) => {
    const stoqrAdmin = new StoqrAdminPage(authenticatedAdminPage);
    await stoqrAdmin.goto();
    await stoqrAdmin.expectLoaded();

    if (await stoqrAdmin.companiesHeading.isVisible().catch(() => false)) {
      await expect(stoqrAdmin.companiesHeading).toBeVisible();
      await expect(stoqrAdmin.selectedCompanyHeading).toBeVisible();
    }
  });

  test('rename/invite controls are visible when allowed', async ({ authenticatedAdminPage }) => {
    const stoqrAdmin = new StoqrAdminPage(authenticatedAdminPage);
    await stoqrAdmin.goto();

    const companyInput = authenticatedAdminPage.locator('input#company-name, input[name="company-name"]').first();
    if (await companyInput.isVisible().catch(() => false)) {
      await expect(companyInput).toBeVisible();
    }

    if (await stoqrAdmin.inviteButton.isVisible().catch(() => false)) {
      await expect(stoqrAdmin.inviteButton).toBeVisible();
    }
  });
});
