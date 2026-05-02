import { test, expect, loginToStoqr } from '../../fixtures/auth';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Stoqr Authentication', () => {
  test('auth route redirects to the shared sign-in form', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    await expect(page).toHaveURL(/\/(auth|login)(\?|$)/);
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('invalid credentials keep the user on the sign-in flow', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();

    await loginPage.login('invalid@example.com', 'wrongpassword');

    await expect(page).toHaveURL(/\/(auth|login)(\?|$)/);
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('successful login reaches authenticated area', async ({ page }) => {
    await loginToStoqr(page);
    await expect(page).toHaveURL(/\/(dashboard|inventory)/);
  });
});
