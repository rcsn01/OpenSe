# Supabase Cloud Operations

This runbook covers the linked Supabase Cloud project for OpenSe.

Use `npx supabase` from the repository root because the Supabase CLI may be installed as a project dependency instead of a global command.

## Prerequisites

1. Install project dependencies.

```bash
pnpm install
```

2. Log in to the Supabase CLI.

```bash
npx supabase login
```

3. Link the local `supabase/` project to the cloud project if it is not already linked.

```bash
npx supabase projects list
npx supabase link --project-ref <project-ref>
```

The linked project ref is stored under `supabase/.temp/` and should not be committed.

## Reset Supabase Cloud

Cloud reset is destructive. It drops user-created remote database objects, reapplies the local migrations in `supabase/migrations`, and does not insert seed data in this repo because `[db.seed].enabled = false` in `supabase/config.toml`.

Preferred project flow:

```bash
./setup.sh
```

Choose:

```text
Action: 1) Full reset
Target: 1) Linked remote Supabase project
Confirmation: RESET
```

The setup script also deploys the alert Edge Functions and updates the alert dispatch configuration after the reset.

Manual reset command:

```bash
npx supabase db reset --linked
```

Use the manual command only when you do not need the extra alert function setup performed by `./setup.sh`.

## Seed Supabase Cloud

This project keeps Supabase CLI auto-seeding disabled so reset and migration deploy flows stay schema-only by default. Seed data is inserted explicitly from `supabase/seeds/` when demo, reference, or test data is required.

Preferred project flow:

```bash
./setup.sh
```

Choose:

```text
Action: 2) Insert DB seed data only
Target: 1) Linked remote Supabase project
Confirmation: SEED
```

The script runs the seed files in the order defined in `setup.sh`. The first seed file performs cleanup, so treat this as a destructive data operation for seeded tables.

Manual seed flow:

```bash
npx supabase db query --linked --file supabase/seeds/00_cleanup.sql
npx supabase db query --linked --file supabase/seeds/10_auth_users.sql
npx supabase db query --linked --file supabase/seeds/20_public_core.sql
npx supabase db query --linked --file supabase/seeds/30_etl_core.sql
npx supabase db query --linked --file supabase/seeds/40_stoqr_reference_membership.sql
npx supabase db query --linked --file supabase/seeds/50_stoqr_catalog_inventory.sql
npx supabase db query --linked --file supabase/seeds/55_stoqr_reports_demo.sql
npx supabase db query --linked --file supabase/seeds/56_stoqr_procurement_workflows.sql
npx supabase db query --linked --file supabase/seeds/60_admin_audit.sql
npx supabase db query --linked --file supabase/seeds/90_synthetic_volume.sql
```

## Deploy Supabase Edge Functions

Deploy all functions:

```bash
npx supabase functions deploy --use-api
```

Deploy one function:

```bash
npx supabase functions deploy <function-name> --use-api
```

Examples:

```bash
npx supabase functions deploy create-checkout --use-api
npx supabase functions deploy stripe-webhook --no-verify-jwt --use-api
npx supabase functions deploy send-stoqr-alert-notifications --use-api
```

Current local functions:

```text
account-self-service
create-billing-portal
create-checkout
manage-stoqr-alert-connectors
send-stoqr-alert-emails
send-stoqr-alert-notifications
stripe-webhook
update-subscription
```

Set required secrets before deploying functions that read environment variables with `Deno.env.get()`.

```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
```

For alert dispatch functions, `./setup.sh` sets `STOQR_ALERT_DISPATCH_TOKEN` and `ALERT_EMAIL_DISPATCH_TOKEN` during a full remote reset.

Verify a deployed function:

```bash
curl --request POST 'https://<project-ref>.supabase.co/functions/v1/<function-name>' \
  --header 'apikey: <publishable-key>' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

## References

- [Supabase CLI reference](https://supabase.com/docs/reference/cli/v0/supabase-db-reset): `db reset` supports `--linked` for resetting the linked project with local migrations.
- [Supabase seeding guide](https://supabase.com/docs/guides/local-development/seeding-your-database): seed files run after migrations when CLI seeding is enabled. OpenSe disables auto-seeding and uses `./setup.sh`.
- [Supabase Edge Function deployment guide](https://supabase.com/docs/guides/functions/deploy): Edge Functions can be deployed with `supabase functions deploy`, either all functions or one function by name.
