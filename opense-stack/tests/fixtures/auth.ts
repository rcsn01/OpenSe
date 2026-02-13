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
  email: 'demo@example.com',
  password: 'demo',
};

export interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/auth');
    
    const loginPage = {
      emailInput: page.getByLabel('Email'),
      passwordInput: page.getByLabel('Password'),
      submitButton: page.getByRole('button', { name: /sign in/i }),
    };

    await loginPage.emailInput.fill(DEMO_USER.email);
    await loginPage.passwordInput.fill(DEMO_USER.password);
    await loginPage.submitButton.click();

    await page.waitForURL(/\/(dashboard|inventory)/);
    
    await use(page);
  },
});

export { expect } from '@playwright/test';
