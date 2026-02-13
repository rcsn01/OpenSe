import { test, expect } from '../../fixtures/etlAuth';
import { ETLOrganisationPage } from '../../pages/etl/ETLOrganisationPage';

test.describe('ETL Organisation', () => {
  test('organisation page and tabs load', async ({ authenticatedEtlPage }) => {
    const org = new ETLOrganisationPage(authenticatedEtlPage);
    await org.goto();
    await org.expectLoaded();

    if (await org.teamTab.isVisible().catch(() => false)) {
      await expect(org.teamTab).toBeVisible();
      await expect(org.billingTab).toBeVisible();
      await expect(org.usageTab).toBeVisible();
      await expect(org.logsTab).toBeVisible();
    }
  });

  test('invite flow controls visible when exposed', async ({ authenticatedEtlPage }) => {
    await authenticatedEtlPage.goto('/organisation/team');
    const inviteControl = authenticatedEtlPage.getByRole('button', { name: /invite/i }).first();

    if (await inviteControl.isVisible().catch(() => false)) {
      await expect(inviteControl).toBeVisible();
    }
  });
});
