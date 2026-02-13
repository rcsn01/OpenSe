# Environment Variables

## Overview

Environment variables configure the E2E test suite. They're loaded from `.env.test` for local development and can be overridden in CI.

## Test Environment File

Create `tests/.env.test` (do not commit to version control):

```bash
# Test user credentials
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=testpassword123

# Demo user credentials
E2E_DEMO_EMAIL=demo@example.com
E2E_DEMO_PASSWORD=demo

# Application URL
BASE_URL=http://localhost:5992
```

## Available Variables

### Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| `E2E_TEST_EMAIL` | Email for test user | No |
| `E2E_TEST_PASSWORD` | Password for test user | No |
| `E2E_DEMO_EMAIL` | Email for demo user | No |
| `E2E_DEMO_PASSWORD` | Password for demo user | No |

### Application

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Base URL for the application | `http://localhost:5992` |

### CI/CD

| Variable | Description | Effect |
|----------|-------------|--------|
| `CI` | Set when running in CI | Enables retries, disables server reuse |

## Configuration Priority

1. Environment variables in shell/CI
2. `.env.test` file (local development)
3. Default values in code

## Example Configurations

### Local Development

```bash
# tests/.env.test
BASE_URL=http://localhost:5992
E2E_DEMO_EMAIL=demo@example.com
E2E_DEMO_PASSWORD=demo
```

### CI Pipeline

```bash
# Set in CI environment
BASE_URL=https://staging.example.com
E2E_TEST_EMAIL=ci@example.com
E2E_TEST_PASSWORD=$CI_PASSWORD
```

## Security Notes

- **Never commit** `.env.test` or `.env.*` files
- Use CI secrets for credentials in CI/CD
- Use separate test accounts (not production credentials)
- Rotate test passwords regularly
