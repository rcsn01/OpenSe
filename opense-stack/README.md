# OpenSe Monorepo

## Security guardrails

- Keep real credentials in untracked local files (for example `.env` and `tests/tests/.env.test.local`).
- Keep placeholders only in tracked env templates such as `.env.example`.
- Run the secret scanner before pushing changes:

```sh
pnpm security:check-secrets
```

The scanner checks tracked files for common leaked credential patterns (Supabase service-role keys, private keys, live Stripe keys, etc).

## E2E environment loading

Playwright now auto-loads env vars from:

1. `tests/tests/.env.test`
2. `tests/tests/.env.test.local` (overrides values when present)

Use `.env.test.local` for machine-specific credentials that must not be committed.
