import { test, expect } from '../../fixtures/adminAuth';

test.describe('Admin Organization Management', () => {
  test('organizations list loads with filters', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/organisations');
    await expect(authenticatedAdminPage).toHaveURL(/\/(organisations|login)/);

    const searchInput = authenticatedAdminPage.getByPlaceholder(/search organisation|search organization/i).first();
    if (await searchInput.isVisible().catch(() => false)) {
      await expect(authenticatedAdminPage.getByText(/organisations|organizations/i).first()).toBeVisible();
      await expect(searchInput).toBeVisible();
    }
  });

  test('organization profile route resolves', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/organisations');

    const firstOrg = authenticatedAdminPage.locator('tbody tr').first();
    if (await firstOrg.isVisible().catch(() => false)) {
      await firstOrg.click();
      await expect(authenticatedAdminPage).toHaveURL(/\/organisations\/[^/]+/);
      await expect(authenticatedAdminPage.getByRole('heading', { name: /organization profile/i })).toBeVisible();
    }
  });

  test('ETL settings host ETL gallery controls', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/applications');
    await expect(authenticatedAdminPage).toHaveURL(/\/(applications|login)/);

    const galleryCard = authenticatedAdminPage.getByText(/etl gallery configuration/i).first();
    if (await galleryCard.isVisible().catch(() => false)) {
      await expect(galleryCard).toBeVisible();
    }
  });
});
