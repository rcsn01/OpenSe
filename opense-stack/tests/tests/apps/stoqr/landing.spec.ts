import { test, expect, type Page } from '@playwright/test';

test.describe('Stoqr Landing', () => {
  test('landing page shows features and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Inventory Control|Inventory Engine|Control your/i).first()).toBeVisible();

    const cta = page.getByRole('link', { name: /Go to Dashboard|Get Started|Log in|Initialize System/i }).first();
    await expect(cta).toBeVisible();
  });
});
