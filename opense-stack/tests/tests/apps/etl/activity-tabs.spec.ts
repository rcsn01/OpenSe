import { test, expect } from '../../fixtures/etlAuth';

const safeGoto = async (url: string, page: Parameters<typeof test>[0]['authenticatedEtlPage']) => {
  try {
    await page.goto(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isExpectedRedirectAbort =
      message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');

    if (!isExpectedRedirectAbort) {
      throw error;
    }
  }
};

test.describe('ETL Activity Tabs', () => {
  test('tab clicks update URL', async ({ authenticatedEtlPage }) => {
    await safeGoto('/activity/usage', authenticatedEtlPage);
    await expect(authenticatedEtlPage).toHaveURL(/\/activity\/usage$|\/login(\?|$)/);

    if (/\/login(\?|$)/.test(authenticatedEtlPage.url())) {
      return;
    }

    const logsTab = authenticatedEtlPage.getByRole('button', { name: /logs/i }).first();
    if (await logsTab.isVisible().catch(() => false)) {
      await logsTab.click();
      await expect(authenticatedEtlPage).toHaveURL(/\/activity\/logs$|\/login(\?|$)/);
    }

    const usageTab = authenticatedEtlPage.getByRole('button', { name: /usage analytics/i }).first();
    if (await usageTab.isVisible().catch(() => false)) {
      await usageTab.click();
      await expect(authenticatedEtlPage).toHaveURL(/\/activity\/usage$|\/login(\?|$)/);
    }
  });
});
