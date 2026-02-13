import { test as base, expect } from '@playwright/test';

const test = base;

test.describe('Landing Page', () => {
  test('should show landing page content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Inventory Control Made Simple')).toBeVisible();
  });
});
