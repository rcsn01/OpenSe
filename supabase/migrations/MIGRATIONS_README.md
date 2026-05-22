# Migration Baseline

This directory contains the pre-launch production baseline for the unified OpenSe Supabase project.

## Baseline Files

- `20260428090000_core_public.sql`
  Creates shared extensions, the physical `etl` and `stoqr` schemas, the canonical `public` tables, and the core public helper functions.
  `accounts` and `admin` are logical domains implemented in `public`; they are not separate schemas.
- `20260428090100_accounts_domain.sql`
  Applies the public-schema RLS policies, invite flow, seat-management helpers, and organisation audit surfaces used by the Accounts domain.
- `20260428090200_etl_app.sql`
  Creates ETL tables, ETL-specific permission helpers, ETL RLS policies, and ETL usage analytics RPCs.
- `20260428090300_stoqr_app.sql`
  Creates StoQR tables, StoQR permission helpers and triggers, StoQR RLS policies, reporting RPCs, and the required `product-images` storage bucket bootstrap.
- `20260428090400_admin_domain.sql`
  Creates admin-facing tables, admin select-only policies, and admin RPCs for oversight and controlled mutations.
- `20260522000000_remove_super_admin_db_auth.sql`
  Renames platform-owned tables, removes database-level admin membership/RPCs, and leaves platform administration to the local service-role API.

## Future Migration Naming

Create new post-baseline migrations as additive files in timestamp order using Supabase timestamps:

- `YYYYMMDDHHMMSS_short_description.sql`

Examples:

- `20260501103000_add_stoqr_supplier_contacts.sql`
- `20260502141500_extend_accounts_audit_metadata.sql`

Use the smallest domain-focused migration that preserves ordering clarity.

## Baseline Rule

After launch, do not edit the five baseline files in place.

- Post-launch schema and policy changes must be new timestamped migrations.
- If you need to change historical intent, add a corrective migration and document it in the PR.

## Seed Data Rule

Schema migrations must not contain application, demo, synthetic, or test seed data.

- Seed and reference data belong in the configured seed entrypoints under `supabase/seeds/`.
- Minimal runtime catalog rows required by schema triggers, such as `public.apps` and app permission codes, belong in migrations so `supabase db reset --linked` works with auto-seeding disabled.
- Demo organisations, users, system label templates, synthetic volume, and admin demo data belong to seeds.
- The only operational bootstrap DML that remains in migrations is the StoQR `product-images` storage bucket, because every environment needs that bucket before runtime uploads can succeed.

## Local Validation

Validate migration changes from the repository root before merging:

1. `supabase db reset`
2. `supabase db reset --linked`
3. Confirm seed entrypoints still load without conflicts.
4. Spot-check RLS and grants for any touched tables or RPCs.

If a migration changes security-sensitive behavior, also verify the affected app flow against the local stack after reset.
