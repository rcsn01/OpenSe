import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

const test = base;

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.emailInput.fill('invalid@example.com');
    await loginPage.passwordInput.fill('wrongpassword');
    await loginPage.submitButton.click();
    await expect(page.locator('[class*="red-"]')).toBeVisible({ timeout: 10000 });
  });
});
