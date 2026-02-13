import { test as base } from '@playwright/test';
import { Page } from '@playwright/test';

export type TestUser = {
  email: string;
  password: string;
};

export const TEST_USER: TestUser = {
  email: process.env.E2E_TEST_EMAIL || 'test@example.com',
  password: process.env.E2E_TEST_PASSWORD || 'testpassword123',
};

export const DEMO_USER: TestUser = {
  email: process.env.E2E_DEMO_EMAIL || 'demo@example.com',
  password: process.env.E2E_DEMO_PASSWORD || 'demo',
};

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const hasStoqrCredentials = () => Boolean(TEST_USER.email && TEST_USER.password);

export const loginToStoqr = async (page: Page, email = TEST_USER.email, password = TEST_USER.password) => {
  await page.goto('/auth');

  const emailInput = page.locator('input#email, input[name="email"]').first();
  const passwordInput = page.locator('input#password, input[name="password"]').first();
  const demoButton = page.getByRole('button', { name: /demo/i }).first();

  if (await emailInput.isVisible().catch(() => false)) {
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();
  } else if (await demoButton.isVisible().catch(() => false)) {
    await demoButton.click();
  }

  await page.waitForURL(/\/(dashboard|inventory|auth|login)/);
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginToStoqr(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
