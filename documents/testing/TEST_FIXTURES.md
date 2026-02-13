# Test Fixtures

## Overview

Fixtures provide reusable test utilities and setup logic. They help reduce duplication across tests and ensure consistent test setup.

## Location

Fixtures are located in `tests/fixtures/`.

## Current Fixtures

### auth.ts

The `auth.ts` fixture provides authentication-related utilities:

```typescript
// tests/fixtures/auth.ts
import { test as base } from '@playwright/test';

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

// Extended test function with custom fixtures
export const test = base.extend({
  // Custom fixtures can be added here
});

export { expect } from '@playwright/test';
```

## Using Fixtures

### In Test Files

```typescript
import { test, expect, TEST_USER, DEMO_USER } from '../../fixtures/auth';

test('should login with test user', async ({ page }) => {
  await page.goto('/auth');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
});
```

### Custom Fixtures

You can extend the test function with custom fixtures:

```typescript
import { test as base, type Page } from '@playwright/test';

// Define custom fixtures
interface AuthFixtures {
  authenticatedPage: Page;
}

const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login before tests
    await page.goto('/auth');
    await page.getByLabel('Email').fill('demo@example.com');
    await page.getByLabel('Password').fill('demo');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/(dashboard|inventory)/);
    
    // Use the authenticated page
    await use(page);
    
    // Teardown: Cleanup if needed
  },
});

export { test };
```

Then use in tests:

```typescript
import { test } from '../../fixtures/auth';

test('should access dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // Page is already authenticated
});
```

## Environment Variables

Test credentials can be configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `E2E_TEST_EMAIL` | Test user email | `test@example.com` |
| `E2E_TEST_PASSWORD` | Test user password | `testpassword123` |
| `E2E_DEMO_EMAIL` | Demo user email | `demo@example.com` |
| `E2E_DEMO_PASSWORD` | Demo user password | `demo` |
| `BASE_URL` | Base URL for tests | `http://localhost:5992` |

Create a `.env.test` file (do not commit):

```bash
E2E_TEST_EMAIL=your-test-email@example.com
E2E_TEST_PASSWORD=your-password
BASE_URL=http://localhost:5992
```

## Best Practices

1. **Keep fixtures focused** - Each fixture should handle one concern (auth, data setup, etc.)
2. **Use descriptive names** - Name fixtures after what they provide
3. **Handle cleanup** - Use fixtures' teardown phase to clean up test data
4. **Avoid hardcoding** - Use environment variables for credentials and URLs
5. **Document usage** - Include examples in fixture comments
