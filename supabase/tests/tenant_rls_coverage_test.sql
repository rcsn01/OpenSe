-- Structural tenant-isolation coverage for the etl and stoqr schemas.
--
-- These invariants make a future migration that adds an unscoped or unprotected
-- tenant table fail CI:
--   1. every base table has RLS enabled,
--   2. every base table is org-scoped: it has a direct org_id/company_id column
--      or is one of the documented parent-scoped exceptions (junction/catalog/
--      child tables whose rows inherit a parent's organisation),
--   3. every base table reachable by `authenticated` defines at least one RLS
--      policy (a grant without a policy is a sign scoping was forgotten), and
--   4. no table or view is directly reachable by `anon`.

BEGIN;

SELECT plan(1);

DO $$
DECLARE
  v_details TEXT;
BEGIN
  -- 1. RLS must be enabled on every base table.
  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY n.nspname, c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('etl', 'stoqr')
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'etl/stoqr base tables missing RLS: %', v_details;
  END IF;

  -- 2. Every base table must be organisation-scoped, either through a direct
  --    scoping column or as a documented parent-scoped exception.
  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY n.nspname, c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('etl', 'stoqr')
    AND c.relkind = 'r'
    AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns col
      WHERE col.table_schema = n.nspname
        AND col.table_name = c.relname
        AND col.column_name IN ('org_id', 'company_id', 'organisation_id')
    )
    AND (n.nspname || '.' || c.relname) NOT IN (
      -- ETL: catalog, role join tables, and workflow child tables.
      'etl.app_permissions',
      'etl.role_permissions',
      'etl.organisation_member_roles',
      'etl.workflow_versions',
      'etl.notification_settings',
      -- StoQR: catalog, role join table, PO line items, alert connector
      -- targets/junctions, and the singleton dispatch config.
      'stoqr.app_permissions',
      'stoqr.role_permissions',
      'stoqr.purchase_order_items',
      'stoqr.alert_connector_targets',
      'stoqr.alert_rule_connector_targets',
      'stoqr.alert_dispatch_config'
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'etl/stoqr base tables lack an org/company scoping column and are not documented parent-scoped exceptions: %', v_details;
  END IF;

  -- 3. Any base table reachable by authenticated must define an RLS policy.
  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY n.nspname, c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('etl', 'stoqr')
    AND c.relkind = 'r'
    AND (
      has_table_privilege('authenticated', c.oid, 'SELECT')
      OR has_table_privilege('authenticated', c.oid, 'INSERT')
      OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = n.nspname
        AND p.tablename = c.relname
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'etl/stoqr tables granted to authenticated must define at least one RLS policy: %', v_details;
  END IF;

  -- 4. No table or view may be directly reachable by anon.
  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY n.nspname, c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('etl', 'stoqr')
    AND c.relkind IN ('r', 'v', 'm', 'p')
    AND (
      has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'etl/stoqr tables/views must not be directly accessible to anon: %', v_details;
  END IF;
END;
$$;

SELECT pass('etl/stoqr base tables enforce RLS, are organisation-scoped, define policies where granted, and are not anon-reachable');

SELECT * FROM finish();

ROLLBACK;
