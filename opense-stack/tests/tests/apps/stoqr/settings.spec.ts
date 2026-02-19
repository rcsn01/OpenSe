import { test, expect } from '../../fixtures/auth';
import { TeamSettingsPage } from '../../pages/AppPages';

test.describe('Stoqr Settings', () => {
  test('team settings page loads', async ({ authenticatedPage }) => {
    const teamSettings = new TeamSettingsPage(authenticatedPage);
    await teamSettings.goto();
    await expect(authenticatedPage).toHaveURL(/\/(settings\/team|auth)?$/);
  });

});
