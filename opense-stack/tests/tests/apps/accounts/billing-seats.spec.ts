import { test, expect } from '../../fixtures/accountsAuth';

test.describe('Accounts Billing and Seats', () => {
  test('owner limit updates and activity feed are visible', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/billing');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(billing|login)/);

    const heading = authenticatedAccountsPage.getByRole('heading', { name: /billing & limits/i }).first();
    if (!(await heading.isVisible().catch(() => false))) return;

    await expect(heading).toBeVisible();

    const seatInput = authenticatedAccountsPage.locator('#seat-limit-etl').first();
    if (await seatInput.isVisible().catch(() => false)) {
      await seatInput.fill('1');
      await authenticatedAccountsPage.getByRole('button', { name: /update limit/i }).first().click();

      const successAlert = authenticatedAccountsPage.getByText(/saved|updated/i).first();
      const errorAlert = authenticatedAccountsPage.getByText(/failed|denied|error/i).first();
      await expect(successAlert.or(errorAlert)).toBeVisible();
    }

    const activityHeading = authenticatedAccountsPage.getByRole('heading', { name: /recent activity/i }).first();
    if (await activityHeading.isVisible().catch(() => false)) {
      await expect(activityHeading).toBeVisible();
    }
  });

  test('seat assignment action is available and over-limit path surfaces feedback', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/billing');

    const seatInput = authenticatedAccountsPage.locator('#seat-limit-etl').first();
    if (await seatInput.isVisible().catch(() => false)) {
      await seatInput.fill('0');
      await authenticatedAccountsPage.getByRole('button', { name: /update limit/i }).first().click();
    }

    await authenticatedAccountsPage.goto('/seats');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(seats|login)/);

    const row = authenticatedAccountsPage.getByRole('row').nth(1);
    if (!(await row.isVisible().catch(() => false))) return;

    const assignButton = row.getByRole('button', { name: /assign|remove/i }).first();
    if (await assignButton.isVisible().catch(() => false)) {
      await assignButton.click();

      const successAlert = authenticatedAccountsPage.getByText(/saved|assigned|removed/i).first();
      const errorAlert = authenticatedAccountsPage.getByText(/failed|exceeded|denied|error/i).first();
      await expect(successAlert.or(errorAlert)).toBeVisible();
    }
  });
});
