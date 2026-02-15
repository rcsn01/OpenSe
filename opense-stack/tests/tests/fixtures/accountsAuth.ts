import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

export type AccountsUser = {
  email: string;
  password: string;
};

export const ACCOUNTS_USER: AccountsUser = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

export const hasAccountsCredentials = () => Boolean(ACCOUNTS_USER.email && ACCOUNTS_USER.password);

export const loginToAccounts = async (page: Page, user: AccountsUser = ACCOUNTS_USER) => {
  await page.goto('/login');

  const emailInput = page.locator('input#email, input[name="email"]').first();
  const passwordInput = page.locator('input#password, input[name="password"]').first();
  const submit = page.getByRole('button', { name: /sign in|log in|continue/i }).first();

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(user.email);
    await passwordInput.fill(user.password);
    await submit.click();
  }

  await page.waitForURL(/\/(billing|login)/);
};

export interface AccountsAuthFixtures {
  authenticatedAccountsPage: Page;
}

export const test = base.extend<AccountsAuthFixtures>({
  authenticatedAccountsPage: async ({ page }, use) => {
    await loginToAccounts(page);
    await page.goto('/billing');
    await use(page);
  },
});

export { expect } from '@playwright/test';
