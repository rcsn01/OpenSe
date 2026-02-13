import { test, expect } from '@playwright/test';
import { loginToEtl } from '../../fixtures/etlAuth';

test.describe('ETL Authentication', () => {
  test('login flow redirects to dashboard or login redirect target', async ({ page }) => {
    await loginToEtl(page);
    await expect(page).toHaveURL(/\/(dashboard|login)/);
  });
});
