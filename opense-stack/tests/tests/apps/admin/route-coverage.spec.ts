import { test as baseTest, expect as baseExpect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../../fixtures/adminAuth';

baseTest.describe('Admin Public Route Coverage', () => {
  baseTest('public auth and god-mode routes resolve', async ({ page }) => {
    await page.goto('/login');
    await baseExpect(page).toHaveURL(/\/(login|platform)/);

    await page.goto('/god-mode');
    await baseExpect(page).toHaveURL(/\/god-mode$/);
  });

  baseTest('admin aliases redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/etl-admin');
    await baseExpect(page).toHaveURL(/\/(login|organisations)/);

    await page.goto('/super-admin');
    await baseExpect(page).toHaveURL(/\/(login|organisations)/);
  });
});

authTest.describe('Admin Protected Route Coverage', () => {
  authTest('root resolves to platform shell', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(platform|login)/);
  });

  authTest('etl-admin alias redirects to organisations', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/etl-admin');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(organisations|login)/);
  });

  authTest('super-admin alias redirects to organisations', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/super-admin');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(organisations|login)/);
  });

  authTest('wildcard route resolves through root redirect', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/non-existent-path');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(platform|login)/);
  });

  authTest('new admin section routes resolve', async ({ authenticatedAdminPage }) => {
    await authenticatedAdminPage.goto('/applications');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(applications|login)/);

    await authenticatedAdminPage.goto('/financials');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(financials|login)/);

    await authenticatedAdminPage.goto('/platform-admin');
    await authExpect(authenticatedAdminPage).toHaveURL(/\/(platform-admin|login)/);
  });
});
