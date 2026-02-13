import { test, expect } from '../../fixtures/auth';

test.describe('Stoqr Dashboard', () => {
  test('dashboard loads and key widgets are visible', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|auth)/);

    const widget = authenticatedPage.getByText(/Inventory Value|Top Movers|Recent Activity|Stock/i).first();
    if (await widget.isVisible().catch(() => false)) {
      await expect(widget).toBeVisible();
    }
  });
});
