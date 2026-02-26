import { test, expect } from '@playwright/test';

test.describe('UI Design Mobile Side Navigation', () => {
  test('side panel retracts and opens on mobile viewport', async ({ page }) => {
    await page.goto('/buttons');
    await expect(page).toHaveURL(/\/buttons$/);

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

    const getToggleCenterX = async () => {
      return toggleNavButton.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.x + rect.width / 2;
      });
    };

    await expect(toggleNavButton).toBeVisible();
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeLessThanOrEqual(-120);
    await expect.poll(async () => {
      const metrics = await getSidebarMetrics();
      const toggleCenterX = await getToggleCenterX();
      return Math.abs(toggleCenterX - metrics.right);
    }).toBeLessThanOrEqual(8);

    await toggleNavButton.click();
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeGreaterThanOrEqual(-4);
    await expect.poll(async () => {
      const metrics = await getSidebarMetrics();
      const toggleCenterX = await getToggleCenterX();
      return Math.abs(toggleCenterX - metrics.right);
    }).toBeLessThanOrEqual(8);

    await toggleNavButton.click();
    await expect(toggleNavButton).toBeVisible();
    await expect.poll(async () => (await getSidebarMetrics()).x).toBeLessThanOrEqual(-120);
    await expect.poll(async () => {
      const metrics = await getSidebarMetrics();
      const toggleCenterX = await getToggleCenterX();
      return Math.abs(toggleCenterX - metrics.right);
    }).toBeLessThanOrEqual(8);
  });
});
