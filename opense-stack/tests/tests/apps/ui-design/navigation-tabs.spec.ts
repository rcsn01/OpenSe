import { test, expect } from '@playwright/test';

test.describe('UI Design Navigation Tabs', () => {
  test('tab clicks update URL and render tab content', async ({ page }) => {
    await page.goto('/navigation/overview');
    await expect(page).toHaveURL(/\/navigation\/overview$/);
    await expect(page.getByText(/Overview content goes here\./i)).toBeVisible();

    await page.getByRole('button', { name: /^Settings$/i }).click();
    await expect(page).toHaveURL(/\/navigation\/settings$/);
    await expect(page.getByText(/Settings content goes here\./i)).toBeVisible();

    await page.getByRole('button', { name: /^Members$/i }).click();
    await expect(page).toHaveURL(/\/navigation\/members$/);
    await expect(page.getByText(/Members list goes here\./i)).toBeVisible();
  });

  test('deep-link loads members tab content directly', async ({ page }) => {
    await page.goto('/navigation/members');
    await expect(page).toHaveURL(/\/navigation\/members$/);
    await expect(page.getByText(/Members list goes here\./i)).toBeVisible();
  });
});