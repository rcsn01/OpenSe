import { test, expect } from '../../fixtures/etlAuth';

test.describe('ETL Activity Tabs', () => {
  test('tab clicks update URL', async ({ authenticatedEtlPage }) => {
    await authenticatedEtlPage.goto('/activity/usage');
    await expect(authenticatedEtlPage).toHaveURL(/\/activity\/usage$/);

    const logsTab = authenticatedEtlPage.getByRole('button', { name: /logs/i }).first();
    if (await logsTab.isVisible().catch(() => false)) {
      await logsTab.click();
      await expect(authenticatedEtlPage).toHaveURL(/\/activity\/logs$/);
    }

    const usageTab = authenticatedEtlPage.getByRole('button', { name: /usage analytics/i }).first();
    if (await usageTab.isVisible().catch(() => false)) {
      await usageTab.click();
      await expect(authenticatedEtlPage).toHaveURL(/\/activity\/usage$/);
    }
  });
});
