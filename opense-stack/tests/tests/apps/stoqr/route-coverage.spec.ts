import { test, expect } from '../../fixtures/auth';

test.describe('Stoqr Route Coverage', () => {
  test('public auth entry routes resolve', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$|\/dashboard$|\/auth$/);

    await page.goto('/auth');
    await expect(page).toHaveURL(/\/(auth|dashboard|login)/);

    await page.goto('/signup', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/(signup|dashboard|login|$)/);
  });

  test('label studio route resolves', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tools/labels');
    await expect(authenticatedPage).toHaveURL(/\/(tools\/labels|auth|login|$)/);
  });

  test('wildcard route redirects to dashboard flow', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/does-not-exist');
    await expect(authenticatedPage).toHaveURL(/\/(dashboard|auth|login|$)/);
  });
});
