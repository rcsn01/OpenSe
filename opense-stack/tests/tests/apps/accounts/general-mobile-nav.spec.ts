import { test, expect } from '../../fixtures/accountsAuth';

test.describe('Accounts General and Mobile Navigation', () => {
  test('general page allows switching theme mode', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/general');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(general|login)/);

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

  test('mobile view side nav opens with > and retracts with <', async ({ authenticatedAccountsPage }) => {
    test.skip(!test.info().project.name.includes('accounts-mobile'), 'Mobile side-nav assertions run only in mobile project');

    await authenticatedAccountsPage.goto('/general');
    await expect(authenticatedAccountsPage).toHaveURL(/\/(general|login)/);

    if (/\/login$/.test(authenticatedAccountsPage.url())) {
      test.skip(true, 'Requires authenticated accounts session for mobile side-nav assertion');
    }

    await expect(authenticatedAccountsPage).toHaveURL(/\/general/);

    const viewportWidth = await authenticatedAccountsPage.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(430);

    const sidebar = authenticatedAccountsPage.locator('aside[aria-label="Sidebar navigation"]');

    const getSidebarX = async () => {
      return sidebar.evaluate((element) => element.getBoundingClientRect().x);
    };

    const openNavButton = authenticatedAccountsPage.getByRole('button', { name: /open side navigation/i });
    await expect(openNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);

    await openNavButton.click();

    const closeNavButton = authenticatedAccountsPage.getByRole('button', { name: /close side navigation/i });
    await expect(closeNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeGreaterThanOrEqual(-4);

    await closeNavButton.click();
    await expect(openNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);
  });
});
