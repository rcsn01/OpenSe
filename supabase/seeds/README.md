# Seed file layout

Seed execution order is recorded in `supabase/config.toml` (`[db.seed].sql_paths`), but CLI auto-seeding is disabled (`[db.seed].enabled = false`) so `supabase db reset --linked` stays schema-only. Use `./setup.sh` option 2 to insert seed data manually.

Runtime catalog rows required by schema triggers, including `public.apps` and app permission codes, are migration-owned. Manual seeds should only load demo, reference, and test data.

When run manually, seeds execute in this order:

1. `00_cleanup.sql` — destructive table cleanup (`TRUNCATE ... CASCADE`)
2. `10_auth_users.sql` — canonical auth users + identities
3. `20_public_core.sql` — public organisation/subscription core
4. `30_etl_core.sql` — ETL roles/workflows/executions core
5. `40_stoqr_reference_membership.sql` — StoQR roles + membership + shared linkage
6. `50_stoqr_catalog_inventory.sql` — StoQR catalog/inventory/purchasing/reporting
7. `55_stoqr_reports_demo.sql` — StoQR reporting demo data
8. `56_stoqr_procurement_workflows.sql` — StoQR procurement workflow demo data
9. `57_open_kb_demo.sql` — Open-KB projects, issues, integrations, and personal workflow demo data
10. `60_admin_audit.sql` — audit/platform reference tables
11. `90_synthetic_volume.sql` — high-volume synthetic dataset

Notes:
- `supabase/seed.sql` is now an index note only.
- To keep seed deterministic and overwrite existing seeded data, cleanup always runs first.
