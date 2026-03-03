# Seed file layout

Seed execution is configured in `supabase/config.toml` (`[db.seed].sql_paths`) and runs in this order:

1. `00_cleanup.sql` — destructive table cleanup (`TRUNCATE ... CASCADE`)
2. `10_auth_users.sql` — canonical auth users + identities
3. `20_public_core.sql` — public org/app/subscription core
4. `30_etl_core.sql` — ETL roles/workflows/executions core
5. `40_stoqr_reference_membership.sql` — StoQR roles + membership + shared linkage
6. `50_stoqr_catalog_inventory.sql` — StoQR catalog/inventory/purchasing/reporting
7. `60_admin_audit.sql` — audit/admin reference tables
8. `90_synthetic_volume.sql` — high-volume synthetic dataset

Notes:
- `supabase/seed.sql` is now an index note only.
- To keep seed deterministic and overwrite existing seeded data, cleanup always runs first.
