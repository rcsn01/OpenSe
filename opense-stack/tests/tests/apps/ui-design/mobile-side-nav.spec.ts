import { test, expect } from '@playwright/test';

test.describe('UI Design Mobile Side Navigation', () => {
  test('side panel opens from top bar and closes via outside tap or swipe left', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(430);

    const sidebar = page.locator('aside[aria-label="Sidebar navigation"]');
    const toggleNavButton = page.getByRole('button', { name: /toggle side navigation/i });

    const getSidebarMetrics = async () => {
      return sidebar.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, right: rect.right };
      });
    };

    await expect(toggleNavButton).toBeVisible();
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeLessThanOrEqual(-120);

    await toggleNavButton.click();
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeGreaterThanOrEqual(-4);

    await page.mouse.click(viewportWidth - 16, 80);
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeLessThanOrEqual(-120);

    await toggleNavButton.click();
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeGreaterThanOrEqual(-4);

    await sidebar.dispatchEvent('touchstart', {
      changedTouches: [{ identifier: 1, clientX: 220, clientY: 200 }],
    });
    await sidebar.dispatchEvent('touchend', {
      changedTouches: [{ identifier: 1, clientX: 100, clientY: 200 }],
    });

    await expect.poll(async () => (await getSidebarMetrics()).x).toBeLessThanOrEqual(-120);
  });
});
