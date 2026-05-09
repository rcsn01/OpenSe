import { test, expect } from '@playwright/test';

test.describe('UI Design StoQR page preview', () => {
  test('is listed under Test Pages and renders the StoQR preview', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: 'Stoqr Page' })).toBeVisible();

    await page.getByRole('link', { name: 'Stoqr Page' }).click();

    await expect(page).toHaveURL(/\/preview\/stoqr$/);
    await expect(page.getByRole('heading', { name: 'Open StoQR Operations' })).toBeVisible();
    await expect(page.getByRole('table')).toContainText('PO-2026-1207');
    await expect(page.getByRole('checkbox', { name: 'Select all purchase orders' })).toBeVisible();
  });
});
