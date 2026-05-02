import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('ETL Authentication', () => {
  test('login route shows the shared sign-in form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/login');

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('invalid credentials stay on the shared sign-in flow', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/login');
    await loginPage.login('invalid@example.com', 'wrong-password');

    await expect(page).toHaveURL(/\/login/);
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
