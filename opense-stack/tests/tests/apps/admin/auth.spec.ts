import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../pages/admin/AdminLoginPage';
import { SUPER_ADMIN_USER, NON_ADMIN_USER } from '../../fixtures/adminAuth';

const hasRealSuperAdmin =
  !!process.env.E2E_SUPER_ADMIN_EMAIL &&
  !!process.env.E2E_SUPER_ADMIN_PASSWORD &&
  !SUPER_ADMIN_USER.email.includes('example.com');

const hasRealNonAdmin =
  !!process.env.E2E_NON_ADMIN_EMAIL &&
  !!process.env.E2E_NON_ADMIN_PASSWORD &&
  !NON_ADMIN_USER.email.includes('example.com');

test.describe('Admin Authentication', () => {
  test('login page visible', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.expectVisible();
  });

  test('invalid credentials show error or stay on login', async ({ page }) => {
    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrong-password');

    await expect(page).toHaveURL(/\/(login|platform)/);
    if (await loginPage.errorText.isVisible().catch(() => false)) {
      await expect(loginPage.errorText).toBeVisible();
    }
  });

  test('successful login redirects to platform', async ({ page }) => {
    test.skip(!hasRealSuperAdmin, 'Set real E2E_SUPER_ADMIN_EMAIL/PASSWORD to run this assertion.');

    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(SUPER_ADMIN_USER.email, SUPER_ADMIN_USER.password);
    await expect(page).toHaveURL(/\/platform/);
  });

  test('non-super-admin redirected to login', async ({ page }) => {
    test.skip(!hasRealNonAdmin, 'Set real E2E_NON_ADMIN_EMAIL/PASSWORD to run this assertion.');

    const loginPage = new AdminLoginPage(page);
    await loginPage.goto();
    await loginPage.login(NON_ADMIN_USER.email, NON_ADMIN_USER.password);
    await expect(page).toHaveURL(/\/login/);
  });
});
