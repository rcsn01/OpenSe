import { test, expect } from '../../fixtures/auth';
import { LoginPage } from '../../pages/LoginPage';

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
    await loginPage.login('invalid@example.com', 'wrongpassword');
    await loginPage.expectError(/invalid|failed|error|Invalid/i);
  });
});
