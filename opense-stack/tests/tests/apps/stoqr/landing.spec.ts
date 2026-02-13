import { test, expect } from '@playwright/test';

test.describe('Stoqr Landing', () => {
  test('landing page shows features and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Inventory Control/i).first()).toBeVisible();
    await expect(page.getByText(/Everything You Need to Manage Inventory/i).first()).toBeVisible();

    const cta = page.getByRole('link', { name: /Go to Dashboard|Get Started|Log in/i }).first();
    await expect(cta).toBeVisible();
  });
});
