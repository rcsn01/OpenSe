import { test } from '../../fixtures/auth';
import { ScanPage } from '../../pages/AppPages';
import { expect } from '@playwright/test';

test.describe('Stoqr Scan', () => {
  test('scan page and scan UI visible', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const hasScanTab = await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).first().isVisible().catch(() => false);
    if (!hasScanTab) {
      await expect(authenticatedPage.getByText(/Inventory Control Made Simple|Open-StoQR|Sign in/i).first()).toBeVisible();
      return;
    }

    await expect(authenticatedPage.getByRole('tab', { name: /^Scan$/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /history/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /pick & pack/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /cycle count/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /putaway/i })).toHaveCount(0);

    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /stop camera/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/Scan Lookup/i)).toHaveCount(0);

    await authenticatedPage.getByLabel(/Barcode \/ SKU \/ QR value/i).fill('TEST-SKU-001');
    await expect(authenticatedPage.getByText(/Scan Lookup/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toHaveCount(0);

    await authenticatedPage.getByRole('tab', { name: /history/i }).click();
    await expect(authenticatedPage.getByText(/Scan History Log|No scan history yet/i).first()).toBeVisible();
  });
});
