import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/preview/landing-navbar',
  '/preview/stoqr',
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('UI Design Route Coverage', () => {
  for (const route of routes) {
    test(`route ${route} renders`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}$`));

      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('wildcard route redirects to root', async ({ page }) => {
    await page.goto('/non-existent-path');
    await expect(page).toHaveURL(/\/$/);
  });

  test('gallery anchors are hash based', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Foundations' }).click();
    await expect(page).toHaveURL(/\/#foundations$/);
    await expect(page.getByRole('heading', { name: 'Foundations' })).toBeVisible();
  });
});
