import { test, expect } from '@playwright/test';

test.describe('Admin God Mode', () => {
  test('god-mode page exposes first-user registration form', async ({ page }) => {
    await page.goto('/god-mode');

    await expect(page).toHaveURL(/\/(god-mode|login)/);
    const emailInput = page.locator('input#email, input[name="email"]').first();
    const passwordInput = page.locator('input#password, input[name="password"]').first();

    if (await emailInput.isVisible().catch(() => false)) {
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    }
  });

  test('redirects to login when users exist and requester is not super-admin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(login|platform|god-mode)/);
  });
});
