# Prompt: Unified Organisation & Per-App Seat Management

Use this prompt when asking an AI to edit the Supabase migrations in `supabase/migrations/` to implement unified organisation management with per-app seat allocation.

---

## Context

This project has two apps sharing the same Supabase backend:

1. **ETL** (schema `etl`): Uses `etl.organisations`, `etl.organisation_members`, `etl.organisation_invites`. Simple roles: admin, editor, member. References `public.profiles(id)` for users. Has workflows, workflow_executions, etc.

2. **StoQR** (schema `stoqr`): Uses `stoqr.companies`, `stoqr.company_members`, `stoqr.company_invitations`. Role-based permissions via `stoqr.roles` and `stoqr.role_permissions`. References `public.profiles(id)` for users. Has products, inventory, etc.

Both currently have **separate** organisation/company concepts. The user wants them **unified** and extended with **per-app seat management** similar to Microsoft 365 admin.

---

## Requirements

### 1. Unified Organisation & Members (Sync Across ETL and StoQR)

- Create a **single source of truth** for organisations and organisation members that both `etl` and `stoqr` use.
- Decide whether to:
  - **Option A**: Add a new `public.organisations` and `public.organisation_members` table, then have `etl` and `stoqr` reference these (migrate existing data).
  - **Option B**: Keep one schema as canonical (e.g. `etl`) and have `stoqr` reference it via FKs.
- Organisation members must be **synced** so that a member in one app is a member in the other for the same organisation.
- Preserve existing RLS policies and helper functions (`is_org_owner`, `is_org_member`, `is_org_admin`, `has_permission`) or adapt them to the new model.

### 2. Microsoft Admin Page–Like Management

Design tables and relationships to support an admin UI where:

- Organisation owners/admins can manage members.
- Members can have **different subscriptions/access per app** (e.g. User A has ETL + StoQR, User B has only StoQR).
- Organisation can **increase seats per app separately** (e.g. 5 ETL seats, 10 StoQR seats).
- Members are **assigned seats** for each app they use.

### 3. Per-App Seat Allocation

Create tables that allow:

| Concept | Description |
|--------|-------------|
| **App** | ETL or StoQR (or future apps). Use an `apps` or `organisation_apps` table with `app_code` (e.g. `'etl'`, `'stoqr'`). |
| **Seats per app** | Organisation buys/increases seats for each app independently. e.g. `organisation_app_seats(org_id, app_code, seat_limit)`. |
| **Seat assignment** | Which org members have a seat for which app. e.g. `organisation_member_app_seats(org_member_id, app_code)` or similar. |
| **Seat enforcement** | Ensure `COUNT(assigned seats) <= seat_limit` per app. Use CHECK constraints, triggers, or application logic. |

### 4. Migration Strategy

- Write **new migrations** (do not edit existing ones in-place if they may have been applied).
- Number new migrations after the latest: `00012_*.sql`, etc.
- Include **data migration** to move existing `etl.organisations` / `etl.organisation_members` and `stoqr.companies` / `stoqr.company_members` into the unified model.
- Update all FKs in `etl` and `stoqr` to point to the unified tables.
- Update RLS policies and functions to use the new schema.
- Preserve backward compatibility where possible (e.g. views or functions that map old names to new).

---

## Suggested Table Structure (Reference)

Use this as a starting point; adapt to fit the existing migrations:

```sql
-- Unified organisation (can live in public or a new shared schema)
CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Unified organisation members
CREATE TABLE public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (org_id, user_id)
);

-- Apps (etl, stoqr, etc.)
CREATE TABLE public.apps (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Per-app seat limits for each organisation
CREATE TABLE public.organisation_app_seats (
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code),
  seat_limit INTEGER NOT NULL DEFAULT 1 CHECK (seat_limit >= 0),
  PRIMARY KEY (org_id, app_code)
);

-- Which org members have a seat for which app
CREATE TABLE public.organisation_member_app_seats (
  org_member_id UUID NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code),
  assigned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (org_member_id, app_code)
);

-- Enforce: assigned seats <= seat_limit per (org, app)
-- Use a trigger or CHECK with a function
```

---

## Checklist for the AI

- [ ] Create unified `organisations` and `organisation_members` tables (or equivalent).
- [ ] Create `apps`, `organisation_app_seats`, and `organisation_member_app_seats` tables.
- [ ] Add trigger/constraint to enforce `assigned_seats <= seat_limit` per org per app.
- [ ] Migrate existing `etl.organisations` → unified orgs.
- [ ] Migrate existing `etl.organisation_members` → unified members.
- [ ] Migrate existing `stoqr.companies` → unified orgs (or link companies to orgs).
- [ ] Migrate existing `stoqr.company_members` → unified members (or link).
- [ ] Update `etl.workflows`, `etl.workflow_executions` to reference unified org (if using org_id).
- [ ] Update `stoqr.*` tables to reference unified org instead of `companies` where appropriate.
- [ ] Update RLS policies for both schemas to use unified tables.
- [ ] Update `public.is_org_owner`, `public.is_org_member`, `public.is_org_admin` to use unified tables.
- [ ] Update `public.has_permission` for StoQR to work with unified org members (or keep StoQR roles separate but link to org).
- [ ] Add RLS and grants for new tables.
- [ ] Handle `stoqr.roles` and `stoqr.role_permissions`: either keep them per-company (now org) or refactor.
- [ ] Ensure `accept_invite` and invitation flows work with unified org.

---

## Files to Review Before Editing

- `00001_extensions_and_schemas.sql` – schemas
- `00002_shared_profiles.sql` – `public.profiles`
- `00004_etl_schema.sql` – `etl.organisations`, `etl.organisation_members`, `etl.organisation_invites`
- `00005_etl_policies.sql` – ETL RLS and org helper functions
- `00006_stoqr_schema.sql` – `stoqr.companies`, `stoqr.company_members`, `stoqr.roles`, etc.
- `00007_stoqr_functions.sql` – `has_permission`, `add_creator_as_admin`
- `00008_stoqr_policies.sql` – StoQR RLS

---

## Notes

- Use `public` schema for shared organisation tables so both apps can reference them.
- Consider whether StoQR’s granular `app_permissions` and `roles` should remain app-specific or be generalised.
- Stripe/billing: ETL has `stripe_customer_id`, `stripe_subscription_id` on orgs. StoQR has `stoqr.subscriptions`. Decide if billing stays per-app or is unified.
- Invites: ETL has `organisation_invites`, StoQR has `company_invitations`. Unify or keep separate with org_id/company_id pointing to unified org.
