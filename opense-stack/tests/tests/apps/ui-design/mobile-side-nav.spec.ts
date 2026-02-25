import { test, expect } from '@playwright/test';

test.describe('UI Design Mobile Side Navigation', () => {
  test('side panel retracts and opens on mobile viewport', async ({ page }) => {
    await page.goto('/buttons');
    await expect(page).toHaveURL(/\/buttons$/);

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBeLessThanOrEqual(430);

    const sidebar = page.locator('aside[aria-label="Sidebar navigation"]');
    const openNavButton = page.getByRole('button', { name: /open side navigation/i });
    const closeNavButton = page.getByRole('button', { name: /close side navigation/i });

    const getSidebarX = async () => {
      return sidebar.evaluate((element) => element.getBoundingClientRect().x);
    };

    await expect(openNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);

    await openNavButton.click();
    await expect(closeNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeGreaterThanOrEqual(-4);

    await closeNavButton.click();
    await expect(openNavButton).toBeVisible();
    await expect.poll(getSidebarX).toBeLessThanOrEqual(-120);
  });
});
