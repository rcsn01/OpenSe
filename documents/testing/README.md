# Testing Documentation

This directory contains documentation for the OpenSe testing infrastructure.

## Overview

OpenSe uses a multi-layered testing approach:

- **Unit Tests**: Vitest (`pnpm test`) - for individual components and functions
- **E2E Tests**: Playwright (`pnpm test:e2e`) - for browser-based integration tests

## Quick Start

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Table of Contents

- [Playwright Setup](PLAYWRITH.md) - Configuration and browser setup
- [Test Structure](TEST_STRUCTURE.md) - Directory organization
- [Page Objects](PAGE_OBJECTS.md) - Page Object Model pattern
- [Test Fixtures](TEST_FIXTURES.md) - Reusable test utilities
- [Environment Variables](ENVIRONMENT.md) - Configuration

## Key Concepts

### E2E Tests
E2E tests simulate real user interactions in a browser. They're located in `tests/apps/` and organized by application.

### Authentication Flow
Most E2E tests require authentication. See [Test Fixtures](TEST_FIXTURES.md) for details on how to handle this.

### Protected Routes
Tests that access protected routes need to handle authentication. See the test files in `tests/apps/stoqr/` for examples.
