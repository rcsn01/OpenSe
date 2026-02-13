import { test, expect } from '../../fixtures/auth';
import { AttributesPage, TeamSettingsPage } from '../../pages/AppPages';

test.describe('Stoqr Settings', () => {
  test('team settings page loads', async ({ authenticatedPage }) => {
    const teamSettings = new TeamSettingsPage(authenticatedPage);
    await teamSettings.goto();
    await expect(authenticatedPage).toHaveURL(/\/(settings\/team|auth)/);
  });

  test('attributes settings page loads', async ({ authenticatedPage }) => {
    const attributesPage = new AttributesPage(authenticatedPage);
    await attributesPage.goto();
    await attributesPage.expectLoaded();
  });
});
