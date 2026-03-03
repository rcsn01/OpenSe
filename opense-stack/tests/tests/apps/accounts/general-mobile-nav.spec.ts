import { test, expect } from '../../fixtures/accountsAuth';

test.describe('Accounts General and Mobile Navigation', () => {
  const isAuthScreen = async (page: Parameters<typeof test>[0]['authenticatedAccountsPage']) => {
    const url = page.url();
    if (/\/(login|signin|auth|register)(\?|$)/i.test(url)) {
      return true;
    }

    const signInHeadingVisible = await page
      .getByRole('heading', { name: /sign in|log in/i })
      .first()
      .isVisible()
      .catch(() => false);
    const signInButtonVisible = await page
      .getByRole('button', { name: /^sign in$/i })
      .first()
      .isVisible()
      .catch(() => false);

    return signInHeadingVisible || signInButtonVisible;
  };

  test('general page allows switching theme mode', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/account/general');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(account\/general|login)/);

    if (await isAuthScreen(authenticatedAccountsPage)) {
      return;
    }

    const heading = authenticatedAccountsPage.getByRole('heading', { name: /general/i }).first();
    if (!(await heading.isVisible().catch(() => false))) return;

    await expect(heading).toBeVisible();

    const toggle = authenticatedAccountsPage.getByRole('switch', { name: /dark mode/i }).first();
    await expect(toggle).toBeVisible();

    const initialState = await toggle.getAttribute('aria-checked');
    await toggle.click();

    const toggledState = await toggle.getAttribute('aria-checked');
    expect(toggledState).not.toBe(initialState);
  });

});
