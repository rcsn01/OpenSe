Supabase Migration Baseline Cleanup for V1 Launch

Context

We are preparing the OpenSe monorepo for its V1 production launch. During development, `supabase/migrations/` accumulated many sequential migrations, cross-domain schema changes, and temporary Supabase CLI artifacts.

We want to replace the current development-era migration history with a clean, maintainable production baseline.

Important Assumption

Assume we are still pre-launch and may reset local, development, and staging databases as needed. This task is authorized to replace the existing migration history with a new baseline.

If that assumption is false for any environment, stop and escalate before deleting, renaming, or squashing migrations.

Current Repo Facts

- Migrations live in `supabase/migrations/`.
- Seed data is configured via `supabase/config.toml` and the SQL files under `supabase/seeds/`.
- The currently configured API schemas include `public`, `etl`, `stoqr`, and `graphql_public`.
- Treat `accounts` and `admin` as logical product domains unless the existing SQL already defines them as physical schemas. Do not introduce new schemas only to match file names.

Objective

Analyze, clean up, squash, and reorganize the Supabase migrations into a production-safe baseline that is easy to understand, replays cleanly from an empty database, and supports future post-launch migrations.

Required Work

1. Audit and Inventory

- Review every `.sql` file in `supabase/migrations/`.
- Produce a concise inventory of the current migration set and identify:
	- dependency or ordering problems
	- duplicate or superseded objects
	- any function, view, trigger, or policy that depends on objects created later
	- any operational configuration DML currently mixed into migrations
	- any `.temp` files or other non-migration artifacts that should be removed
- Confirm whether `accounts` and `admin` are real schemas or logical domains implemented through `public` tables, views, and RPCs, and reflect that accurately in the new baseline.

2. Migration Consolidation (Squash Into a Baseline)

- Replace the current development migration history with five new baseline files.
- Use five distinct, increasing Supabase timestamps in `YYYYMMDDHHMMSS` format. Do not reuse the same timestamp across multiple files.
- Group the new baseline by product/domain, not by SQL statement type.
- Use this logical structure:
	- `YYYYMMDDHHMMSS_core_public.sql`
	- `YYYYMMDDHHMMSS_accounts_domain.sql`
	- `YYYYMMDDHHMMSS_etl_app.sql`
	- `YYYYMMDDHHMMSS_stoqr_app.sql`
	- `YYYYMMDDHHMMSS_admin_domain.sql`
- The files must run in order without manual intervention.
- Do not create new physical schemas only to match the file grouping. If Accounts or Admin objects remain in `public`, keep them in the appropriate domain file and document that choice.

3. Safety Rules and Supabase Standards

- No application, demo, synthetic, or test seed data may remain in migrations.
- Seed data belongs only in the configured seed files under `supabase/seeds/` and any explicit seed entrypoints defined in `supabase/config.toml`.
- Operational configuration DML that is required for platform bootstrapping, such as storage bucket creation, is allowed only if it is truly required, environment-appropriate, and clearly documented in comments and in the migration README.
- Ensure every table in `public`, `etl`, `stoqr`, and any other application schema that exists after consolidation explicitly enables row-level security.
- Ensure every such table also has explicit policies or a clearly documented service-only/internal exception. Do not leave tables with RLS enabled but no deliberate policy decision.
- Apply grants intentionally. Do not broadly grant `anon`, `authenticated`, or `service_role` unless the object is intended to be exposed to that role.
- Every user-defined Postgres function must explicitly declare either `SECURITY INVOKER` or `SECURITY DEFINER` and set a secure `search_path`.
- Use `IF NOT EXISTS`, `CREATE OR REPLACE`, and similar guards only where safe and appropriate. Prioritize correctness of a clean replay from an empty database over trying to make every statement rerunnable in-place.

4. Repository Hygiene

- Remove tracked `.temp` artifacts and any other non-migration files from `supabase/migrations/`.
- Add or update ignore rules so Supabase CLI temp artifacts under `supabase/migrations/.temp/` do not get committed again.
- Delete or archive the superseded development migrations after the new baseline is in place. Preserve anything that must remain for audit/reference, but do not leave ambiguous duplicate migrations active.

5. Documentation

- Create `supabase/migrations/MIGRATIONS_README.md`.
- Document:
	- the purpose of each baseline file
	- the naming convention for future migrations
	- the rule that post-launch changes must be additive, timestamped migrations rather than edits to the baseline
	- where seed data belongs
	- how to validate migration changes locally before merging

6. Validation

- Run a full local replay using the Supabase CLI.
- At minimum, the final state must pass `supabase db reset --linked` from the repository root or the appropriate Supabase project root.
- Confirm that the new baseline applies cleanly from an empty database in the intended order.
- Confirm that the configured seed files still load successfully after the cleanup.
- Confirm there are no broken dependencies, no missing grants required for intended API behavior, and no missing RLS policy decisions.
- Include the exact validation commands you ran and the result of each command in your summary.

Deliverables

- A short summary of the current migration state and the anomalies found.
- The five new baseline migration files.
- A delete/archive list for the old development migrations and temp artifacts.
- The new `supabase/migrations/MIGRATIONS_README.md`.
- A validation summary with the exact commands run and the outcome of each.
- A short list of any remaining follow-up risks or manual review items.

Acceptance Criteria

- `supabase/migrations/` contains a clean five-file baseline with unique increasing timestamps.
- Old development migrations are removed or clearly archived.
- No application, demo, synthetic, or test seed data remains in migrations.
- Required operational configuration DML, if any, is minimal and documented.
- Every relevant table has explicit RLS enablement plus an explicit policy or exception decision.
- Function security mode and `search_path` are explicit.
- Tracked temp artifacts are removed and ignored.
- A clean local `supabase db reset --linked` succeeds against the rewritten baseline.