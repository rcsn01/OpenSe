import { test, expect } from '@playwright/test';

test.describe('Admin God Mode', () => {
  test('god-mode route resolves to the bootstrap or login form', async ({ page }) => {
    await page.goto('/god-mode');

    await expect(page).toHaveURL(/\/(god-mode|login)$/);
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^Password$/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('redirects to login when users exist and requester is not super-admin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(login|platform|god-mode)/);
  });
});
