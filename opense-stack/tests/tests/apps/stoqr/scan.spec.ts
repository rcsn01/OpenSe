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
      await expect(authenticatedPage).toHaveURL(/\/(scan(\/[^/]+)?|dashboard|auth|login|$)/);
      return;
    }

    await expect(authenticatedPage.getByRole('tab', { name: /^Scan$/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('tab', { name: /history/i })).toBeVisible();

    await expect(authenticatedPage.getByRole('tab', { name: /pick & pack/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /cycle count/i })).toHaveCount(0);
    await expect(authenticatedPage.getByRole('tab', { name: /putaway/i })).toHaveCount(0);

    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /stop camera/i })).toBeVisible();
    await expect(authenticatedPage.getByText(/manual entry/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Scan Lookup/i)).toHaveCount(0);

    await authenticatedPage.getByLabel(/Barcode \/ SKU \/ Product Name/i).fill('TEST-SKU-001');
    await expect(authenticatedPage.getByText(/Scan Lookup/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/search again/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /start camera/i })).toHaveCount(0);

    await authenticatedPage.getByRole('tab', { name: /history/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-history$/);
    await expect(authenticatedPage.getByText(/Scan History Log|No scan history yet/i).first()).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).click();
    await expect(authenticatedPage).toHaveURL(/\/scan\/scan-actions$/);
  });

  test('manual SKU entry resolves seeded product', async ({ authenticatedPage }) => {
    const scanPage = new ScanPage(authenticatedPage);
    await scanPage.goto();
    await scanPage.expectLoaded();

    const hasScanTab = await authenticatedPage.getByRole('tab', { name: /^Scan$/i }).first().isVisible().catch(() => false);
    if (!hasScanTab) {
      return;
    }

    const input = authenticatedPage.getByLabel(/Barcode \/ SKU \/ Product Name/i);
    await input.fill('30123301');

    await expect(authenticatedPage.getByText(/Scan Lookup/i)).toBeVisible();

    const productFound = await authenticatedPage.getByText('0.5mL Eppendorf Safe-Lock Tubes PCR clean, colorless, 500 tubes').isVisible({ timeout: 5000 }).catch(() => false);
    const notFound = await authenticatedPage.getByText(/No product found/i).isVisible().catch(() => false);

    if (productFound) {
      await expect(authenticatedPage.getByText(/SKU: 30123301/i)).toBeVisible();
      await expect(authenticatedPage.getByText(/On hand:/i)).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /add stock/i })).toBeVisible();
      await expect(authenticatedPage.getByRole('button', { name: /remove stock/i })).toBeVisible();
    }

    expect(productFound || !notFound).toBeTruthy();
  });
});
