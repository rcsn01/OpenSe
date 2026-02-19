import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

export type EtlUser = {
  email: string;
  password: string;
};

export const ETL_USER: EtlUser = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

export const hasEtlCredentials = () => Boolean(ETL_USER.email && ETL_USER.password);

const safeGoto = async (page: Page, url: string) => {
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

export const loginToEtl = async (page: Page, user: EtlUser = ETL_USER) => {
  await safeGoto(page, '/login');

  const emailInput = page.locator('input#email, input[name="email"]').first();
  const passwordInput = page.locator('input#password, input[name="password"]').first();
  const submit = page.getByRole('button', { name: /sign in|log in|continue/i }).first();

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(user.email);
    await passwordInput.fill(user.password);
    await submit.click();
  }

  await page.waitForURL(/\/(dashboard|login)/);
};

export interface EtlAuthFixtures {
  authenticatedEtlPage: Page;
}

export const test = base.extend<EtlAuthFixtures>({
  authenticatedEtlPage: async ({ page }, use) => {
    await loginToEtl(page);
    await safeGoto(page, '/dashboard');
    await use(page);
  },
});

export { expect } from '@playwright/test';
