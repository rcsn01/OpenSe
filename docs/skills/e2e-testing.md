# E2E Testing Skill

Use this skill/prompt context whenever instructing an agent to write Playwright end-to-end tests for the Open-SE project.

## Golden Rule: Test Behavior, Not Implementation

**E2E tests must verify user-observable outcomes, not mirror internal code logic.** If a test duplicates the conditional logic of the implementation, it is tautological and provides no value.

- **BAD:** Tests that embed the same `if/else` logic as the source code to assert visibility.
- **GOOD:** Tests that simulate a user state (e.g., "logged in as premium user") and assert an observable outcome (e.g., "the premium feature is accessible").

## Core Principles

1. **Black-box perspective:** Treat the application as opaque. Inputs are user actions (clicks, form fills, navigation). Outputs are visible UI changes, URL changes, or final rendered states.
2. **No conditional logic in tests:** Avoid `if`/`else` blocks in test code. If you need to test divergent paths, write separate, explicit test cases.
3. **Test the contract, not the code:** If a feature says "a logged-out user clicking dashboard should see a login prompt", test that exact sequence. Do not test *how* the routing guard is implemented.
4. **Avoid over-mocking:** E2E tests should exercise real integrations (databases, APIs). Mock only external third-party services or irreversible side-effects (payments, emails).

## Playwright Conventions for Open-SE

- **Use Page Object Model (POM):** Abstract selectors and common interactions into `tests/tests/pages/*Page.ts`. Tests should read like user stories, not CSS selector lists.
- **Use Fixtures for Auth:** Leverage `tests/tests/fixtures/auth.ts` and role-based fixtures (e.g., `etlAuth`, `accountsAuth`) to avoid repeating login flows in every test.
- **Assert on what the user sees:** Prefer `expect(page).toHaveURL()`, `toBeVisible()`, `toHaveText()`, and user-centric locators (`getByRole`, `getByLabel`) over implementation-specific selectors (`data-testid` is acceptable but avoid DOM structure coupling).
- **Environment-driven:** Respect `.env.test` and `.env.test.local`. Do not hardcode URLs or secrets in test files.
- **Idempotency:** Tests must not depend on each other. Each test should set up its own state via UI interactions, API seeding, or fixtures, and clean up after itself where necessary.

## When Writing a New Test

Before writing, answer these checks mentally:

1. Could a non-developer read this test and understand the user story? If not, refactor.
2. If I changed the internal framework (e.g., swapped React for Vue) but kept the UI identical, would this test still pass? If not, it's too coupled to implementation.
3. Am I asserting the final outcome, or am I asserting intermediate implementation details?

## Example: Good vs Bad

**Bad (Implementation-Mirrored):**
```typescript
test('shows discount', async ({ page }) => {
  const product = await fetchProduct('123');
  if (product.price > 100 && product.category === 'electronics') {
    await expect(page.locator('[data-testid="discount"]')).toBeVisible();
  }
});
```

**Good (Behavior-Driven):**
```typescript
test('applies discount for expensive electronics', async ({ page }) => {
  await page.goto('/products/expensive-laptop');
  await expect(page.getByRole('heading', { name: '10% Discount Applied' })).toBeVisible();
});
```

## Running Tests

- Run all: `pnpm test:e2e`
- Run specific app: `npx playwright test --config=tests/tests/playwright.config.ts apps/stoqr`
- UI mode: `pnpm test:e2e:ui`
- View report: `open tests/playwright-report/index.html`

---

**Agent Instruction:** When asked to create or modify E2E tests, always load this context first and ensure every test follows the behavior-over-implementation rule.
