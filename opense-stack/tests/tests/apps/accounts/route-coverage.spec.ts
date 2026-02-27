import { test as baseTest, expect as baseExpect } from '@playwright/test';
import { test as authTest, expect as authExpect } from '../../fixtures/accountsAuth';

const protectedRoutes = ['/account/general', '/account/settings', '/account/organisation', '/account/billing', '/account/seats'];
const onboardingRoutes = [
  '/onboarding',
  '/onboarding/invitations',
  '/onboarding/create-organisation',
  '/onboarding/invite-members',
];
const accountAliasRoutes: Array<[string, string]> = [
  ['/account', '/account/general'],
  ['/general', '/account/general'],
  ['/settings', '/account/settings'],
  ['/organisation', '/account/organisation'],
  ['/billing', '/account/billing'],
  ['/seats', '/account/seats'],
];

baseTest.describe('Accounts Public Route Coverage', () => {
  baseTest('login and signup route aliases resolve', async ({ page }) => {
    await page.goto('/signin');
    await baseExpect(page).toHaveURL(/\/(login|settings|onboarding)/);

    await page.goto('/signup');
    await baseExpect(page).toHaveURL(/\/(register|settings|onboarding)/);
  });

  baseTest('wildcard route redirects to login flow', async ({ page }) => {
    await page.goto('/non-existent-path');
    await baseExpect(page).toHaveURL(/\/(login|settings|onboarding)/);
  });
});

authTest.describe('Accounts Protected Route Coverage', () => {
  for (const route of protectedRoutes) {
    authTest(`protected route ${route} resolves`, async ({ authenticatedAccountsPage }) => {
      await authenticatedAccountsPage.goto(route);
      await authExpect(authenticatedAccountsPage).toHaveURL(new RegExp(`^.+${route}$|\\/login$`));
    });
  }

  for (const route of onboardingRoutes) {
    authTest(`onboarding route ${route} resolves`, async ({ authenticatedAccountsPage }) => {
      await authenticatedAccountsPage.goto(route);
      await authExpect(authenticatedAccountsPage).toHaveURL(/\/(onboarding|settings|login)/);
    });
  }

  for (const [aliasRoute, canonicalRoute] of accountAliasRoutes) {
    authTest(`alias ${aliasRoute} redirects to ${canonicalRoute}`, async ({ authenticatedAccountsPage }) => {
      await authenticatedAccountsPage.goto(aliasRoute);
      await authExpect(authenticatedAccountsPage).toHaveURL(new RegExp(`^.+${canonicalRoute}$|\\/login$`));
    });
  }

  authTest('root route resolves to protected shell', async ({ authenticatedAccountsPage }) => {
    await authenticatedAccountsPage.goto('/');
    await authExpect(authenticatedAccountsPage).toHaveURL(/\/(account\/general|login|onboarding)/);
  });
});
