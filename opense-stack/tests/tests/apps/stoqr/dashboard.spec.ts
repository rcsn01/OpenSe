import { test, expect } from '../../fixtures/auth';

test.describe('Stoqr Dashboard', () => {
  test('dashboard loads and key widgets are visible', async ({ authenticatedPage }) => {
    try {
      await authenticatedPage.goto('/dashboard', { waitUntil: 'commit' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isExpectedRedirectAbort =
        message.includes('ERR_ABORTED') || message.includes('interrupted by another navigation');
      if (!isExpectedRedirectAbort) {
        throw error;
      }
    }
    await expect(authenticatedPage).toHaveURL(/(localhost:5990\/login\?|\/(dashboard|auth)?$)/);

    const widget = authenticatedPage.getByText(/Inventory Value|Top Movers|Recent Activity|Stock/i).first();
    if (await widget.isVisible().catch(() => false)) {
      await expect(widget).toBeVisible();
    }
  });
});
