import { test, expect } from '@playwright/test';
import { AdminLoginPage } from '../../pages/admin/AdminLoginPage';

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

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.errorText).toBeVisible();
  });
});
