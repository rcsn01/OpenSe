# Test Structure

## Directory Layout

```
opense-stack/
├── tests/                          # Root E2E test suite
│   ├── apps/                       # Test specs organized by app
│   │   └── stoqr/                  # stoqr app tests
│   │       ├── auth.spec.ts        # Authentication tests
│   │       ├── products.spec.ts    # Product/inventory tests
│   │       └── workflows.spec.ts   # Workflow tests
│   ├── fixtures/                   # Reusable test fixtures
│   │   └── auth.ts                 # Auth-related fixtures
│   ├── pages/                      # Page Object Models
│   │   ├── LoginPage.ts            # Login page object
│   │   └── AppPages.ts             # App page objects
│   ├── playwright.config.ts        # Playwright configuration
│   ├── tsconfig.json               # TypeScript config for tests
│   └── .env.test                   # Test environment variables
│
├── apps/                           # Application source code
│   └── stoqr/                      # Main web app
│
└── packages/                      # Shared packages
    └── shared/                     # Shared utilities
```

## Test Organization

### By Application (`tests/apps/`)
Each application gets its own directory with spec files:
- `tests/apps/stoqr/auth.spec.ts` - Authentication flows
- `tests/apps/stoqr/products.spec.ts` - Product management
- `tests/apps/stoqr/workflows.spec.ts` - Workflow features

### By Type (`tests/fixtures/`, `tests/pages/`)
Shared utilities are organized by type:
- `fixtures/` - Test fixtures and helpers
- `pages/` - Page Object Models
- `apps/` - Actual test specifications

## Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Spec files | `*.spec.ts` | `auth.spec.ts` |
| Page objects | `*Page.ts` | `LoginPage.ts` |
| Fixtures | `*.ts` | `auth.ts` |

## Running Specific Tests

```bash
# Run tests for a specific app
npx playwright test tests/apps/stoqr/

# Run specific test file
npx playwright test tests/apps/stoqr/auth.spec.ts

# Run tests matching a pattern
npx playwright test -g "should login"
```
