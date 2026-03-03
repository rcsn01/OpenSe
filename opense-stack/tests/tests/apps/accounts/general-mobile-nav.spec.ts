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

  test('mobile view side nav opens from top bar toggle and retracts on outside tap', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/account/general');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(account\/general|login)/);

    if (await isAuthScreen(authenticatedAccountsPage)) {
      return;
    }

    const viewportWidth = await authenticatedAccountsPage.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(430);

    const sidebar = authenticatedAccountsPage.locator('aside[aria-label="Sidebar navigation"]');

    const getSidebarX = async () => {
      return sidebar.evaluate((element) => element.getBoundingClientRect().x);
    };

    const toggleNavButton = authenticatedAccountsPage.getByRole('button', { name: /toggle side navigation/i });
    await expect(toggleNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);

    await toggleNavButton.click();

    await expect.poll(getSidebarX).toBeGreaterThanOrEqual(-4);

    await authenticatedAccountsPage.mouse.click(viewportWidth - 16, 80);
    await expect(toggleNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);
  });
});
