import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/colors',
  '/typography',
  '/spacing',
  '/buttons',
  '/forms',
  '/cards',
  '/badges',
  '/alerts',
  '/data',
  '/navigation',
  '/overlays',
  '/dividers',
  '/test',
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('UI Design Route Coverage', () => {
  for (const route of routes) {
    test(`route ${route} renders`, async ({ page }) => {
      await page.goto(route);

      if (route === '/') {
        await expect(page).toHaveURL(/\/$/);
      } else {
        await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route)}$`));
      }

      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('wildcard route redirects to root', async ({ page }) => {
    await page.goto('/non-existent-path');
    await expect(page).toHaveURL(/\/$/);
  });
});
