import { test, expect } from '@playwright/test';

test.describe('UI Design Navigation Tabs', () => {
  test('sidebar links update hash and reveal gallery sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Shared Component Gallery' })).toBeVisible();

    await page.getByRole('link', { name: 'Forms' }).click();
    await expect(page).toHaveURL(/\/#forms$/);
    await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible();

    await page.getByRole('link', { name: 'Navigation' }).click();
    await expect(page).toHaveURL(/\/#navigation$/);
    await expect(page.getByRole('heading', { name: 'Navigation' })).toBeVisible();
  });

  test('preview links load routed pages directly', async ({ page }) => {
    await page.goto('/preview/landing-navbar');
    await expect(page).toHaveURL(/\/preview\/landing-navbar$/);
    await expect(page.getByRole('heading', { name: /landing navbar/i })).toBeVisible();
  });
});
