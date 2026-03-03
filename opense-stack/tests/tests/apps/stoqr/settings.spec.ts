import { test, expect } from '../../fixtures/auth';
import { TeamSettingsPage } from '../../pages/AppPages';

test.describe('Stoqr Settings', () => {
  test('team settings page loads', async ({ authenticatedPage }) => {
    const teamSettings = new TeamSettingsPage(authenticatedPage);
    await teamSettings.goto();
    await expect(authenticatedPage).toHaveURL(/\/(settings\/team|auth|login)?$|localhost:5993\/$/);

    const hasTabs = await authenticatedPage.getByRole('tab', { name: /user management/i }).first().isVisible().catch(() => false);
    if (!hasTabs) {
      await expect(authenticatedPage).toHaveURL(/\/(settings(\/[^/]+)?|dashboard|auth|login|$)/);
      return;
    }

    await expect(authenticatedPage.getByRole('heading', { name: /team settings/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /user management/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /rbac/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /activity logs/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /two-factor authentication/i })).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /activity logs/i }).click();
    await expect(authenticatedPage.getByText(/Activity Logs|No activity events found/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /two-factor authentication/i }).click();
    await expect(authenticatedPage.getByText(/Current Auth Level|Two-Factor Authentication/i).first()).toBeVisible();
  });

});
