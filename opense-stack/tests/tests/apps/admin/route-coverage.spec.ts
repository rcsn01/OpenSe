import { test as baseTest, expect as baseExpect } from '@playwright/test';

baseTest.describe('Admin Public Route Coverage', () => {
  baseTest('public auth and god-mode routes resolve', async ({ page }) => {
    await page.goto('/login');
    await baseExpect(page).toHaveURL(/\/(login|platform)/);

    await page.goto('/god-mode');
    await baseExpect(page).toHaveURL(/\/(god-mode|login)$/);
  });

  baseTest('admin aliases redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/etl-admin');
    await baseExpect(page).toHaveURL(/\/(login|organisations)/);

    await page.goto('/super-admin');
    await baseExpect(page).toHaveURL(/\/(login|organisations)/);
  });
});
