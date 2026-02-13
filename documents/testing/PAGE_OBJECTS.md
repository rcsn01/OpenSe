# Page Objects

## Overview

Page Objects are a design pattern that encapsulates the structure and behavior of a page. They provide a clean API for interacting with pages in tests, making tests more readable and maintainable.

## Location

Page Objects are located in `tests/pages/`.

## Example: LoginPage

```typescript
// tests/pages/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('[class*="red-"]');
  }

  async goto() {
    await this.page.goto('/auth');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectToBeLoggedIn() {
    await expect(this.page).toHaveURL(/\/(dashboard|inventory)/);
  }
}
```

## Using Page Objects in Tests

```typescript
// tests/apps/stoqr/auth.spec.ts
import { test, expect } from '../../fixtures/auth';
import { LoginPage } from '../../pages/LoginPage';

test('should login successfully', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password');
  await loginPage.expectToBeLoggedIn();
});
```

## Available Page Objects

### LoginPage (`tests/pages/LoginPage.ts`)
- `goto()` - Navigate to login page
- `login(email, password)` - Perform login
- `loginWithDemo()` - Login with demo credentials
- `expectToBeLoggedIn()` - Assert successful login
- `expectError(message)` - Assert error message

### AppPages (`tests/pages/AppPages.ts`)
- `DashboardPage` - Dashboard navigation and interactions
- `InventoryPage` - Inventory list and management
- `CreateProductPage` - Product creation form
- `ScanPage` - QR scanning functionality
- `TeamSettingsPage` - Team settings management
- `ProcurementPage` - Procurement features

## Best Practices

1. **One class per page** - Each Page Object represents one page or significant component
2. **Expose actions, not internals** - Tests should use methods like `login()`, not directly interact with elements
3. **Use locators wisely** - Prefer `getByRole`, `getByLabel` over CSS selectors
4. **Keep locators private** - Expose methods, not raw locators
5. **Return `this` for chaining** - Enable fluent APIs where appropriate
