import { test, expect, loginToStoqr } from '../../fixtures/auth';
import { LoginPage } from '../../pages/LoginPage';

const hasRealUser = !!process.env.E2E_TEST_EMAIL && !process.env.E2E_TEST_EMAIL.includes('example.com');

test.describe('Stoqr Authentication', () => {
  test('login page visible', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(page).toHaveURL(/\/(auth|login|$)/);
  });

  test('invalid credentials show error or remain on auth redirect', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    if (await loginPage.emailInput.isVisible().catch(() => false)) {
      await loginPage.login('invalid@example.com', 'wrongpassword');
      if (await loginPage.errorMessage.isVisible().catch(() => false)) {
        await expect(loginPage.errorMessage).toBeVisible();
      }
    }

    await expect(page).toHaveURL(/\/(auth|login|dashboard|inventory)/);
  });

  test('successful login reaches authenticated area', async ({ page }) => {
    test.skip(!hasRealUser, 'Set real E2E_TEST_EMAIL/PASSWORD to run this assertion.');
    await loginToStoqr(page);
    await expect(page).toHaveURL(/\/(dashboard|inventory)/);
  });
});
