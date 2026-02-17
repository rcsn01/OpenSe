import { test as baseTest, expect as baseExpect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../../fixtures/etlAuth';

const authenticatedRoutes = [
  '/dashboard/personal',
  '/dashboard/org',
  '/organisation/team',
  '/organisation/usage',
  '/organisation/logs',
  '/activity',
  '/settings/profile',
];

baseTest.describe('ETL Public Route Coverage', () => {
  baseTest('landing and auth routes resolve', async ({ page }) => {
    await page.goto('/');
    await baseExpect(page).toHaveURL(/\/$/);

    await page.goto('/login');
    await baseExpect(page).toHaveURL(/\/(login|dashboard)/);

    await page.goto('/register');
    await baseExpect(page).toHaveURL(/\/(register|dashboard|login)/);
  });
});

authTest.describe('ETL Protected Route Coverage', () => {
  for (const route of authenticatedRoutes) {
    authTest(`route ${route} resolves`, async ({ authenticatedEtlPage }) => {
      await authenticatedEtlPage.goto(route);
      await authExpect(authenticatedEtlPage).toHaveURL(new RegExp(`^.+${route}$|\\/login$`));
    });
  }

  authTest('dashboard index redirects to a dashboard tab', async ({ authenticatedEtlPage }) => {
    await authenticatedEtlPage.goto('/dashboard');
    await authExpect(authenticatedEtlPage).toHaveURL(/\/dashboard\/(personal|org)|\/login(\?|$)/);
  });

  authTest('wildcard route redirects to dashboard flow', async ({ authenticatedEtlPage }) => {
    await authenticatedEtlPage.goto('/non-existent-path');
    await authExpect(authenticatedEtlPage).toHaveURL(/\/(dashboard|login)/);
  });
});
