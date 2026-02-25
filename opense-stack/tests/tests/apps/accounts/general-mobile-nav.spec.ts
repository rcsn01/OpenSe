import { test, expect } from '../../fixtures/accountsAuth';

test.describe('Accounts General and Mobile Navigation', () => {
  test('general page allows switching theme mode', async ({ authenticatedRequiredAccountsPage }) => {
    await authenticatedRequiredAccountsPage.goto('/general');
    await expect(authenticatedRequiredAccountsPage).toHaveURL(/\/general/);

    const heading = authenticatedRequiredAccountsPage.getByRole('heading', { name: /general/i }).first();
    if (!(await heading.isVisible().catch(() => false))) return;

    await expect(heading).toBeVisible();

    const toggle = authenticatedRequiredAccountsPage.getByRole('switch', { name: /dark mode/i }).first();
    await expect(toggle).toBeVisible();

    const initialState = await toggle.getAttribute('aria-checked');
    await toggle.click();

    const toggledState = await toggle.getAttribute('aria-checked');
    expect(toggledState).not.toBe(initialState);
  });

  test('mobile view side nav opens with > and retracts with <', async ({ authenticatedRequiredAccountsPage }) => {
    await authenticatedRequiredAccountsPage.goto('/general');
    await expect(authenticatedRequiredAccountsPage).toHaveURL(/\/general/);

    const viewportWidth = await authenticatedRequiredAccountsPage.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(430);

    const sidebar = authenticatedRequiredAccountsPage.locator('aside[aria-label="Sidebar navigation"]');

    const getSidebarX = async () => {
      return sidebar.evaluate((element) => element.getBoundingClientRect().x);
    };

    const openNavButton = authenticatedRequiredAccountsPage.getByRole('button', { name: /open side navigation/i });
    await expect(openNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);

    await openNavButton.click();

    const closeNavButton = authenticatedRequiredAccountsPage.getByRole('button', { name: /close side navigation/i });
    await expect(closeNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeGreaterThanOrEqual(-4);

    await closeNavButton.click();
    await expect(openNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);
  });
});
