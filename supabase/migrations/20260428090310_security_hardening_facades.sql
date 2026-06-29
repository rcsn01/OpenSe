
-- The remaining authenticated SECURITY DEFINER warnings are app-facing RPCs.
-- Preserve their public RPC names, but move privileged implementations out of
-- exposed schemas and replace them with SECURITY INVOKER facades.

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

DO $$
DECLARE
  target_fn RECORD;
  call_args TEXT;
  body_sql TEXT;
  volatility_sql TEXT;
BEGIN
  FOR target_fn IN
    SELECT
      p.oid,
      p.proname,
      p.pronargs,
      p.proretset,
      p.provolatile,
      pg_get_function_arguments(p.oid) AS function_args,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_function_result(p.oid) AS result_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'pg_catalog.trigger'::regtype
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  LOOP
    SELECT COALESCE(string_agg('$' || arg_index::text, ', ' ORDER BY arg_index), '')
    INTO call_args
    FROM generate_series(1, target_fn.pronargs) AS arg_index;

    volatility_sql := CASE target_fn.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END;

    IF target_fn.proretset OR target_fn.result_type LIKE 'TABLE(%' THEN
      body_sql := format(
        'SELECT * FROM app_private.%I(%s)',
        target_fn.proname,
        call_args
      );
    ELSE
      body_sql := format(
        'SELECT app_private.%I(%s)',
        target_fn.proname,
        call_args
      );
    END IF;

    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET SCHEMA app_private',
      target_fn.proname,
      target_fn.identity_args
    );

    EXECUTE format(
      $wrapper$
      CREATE FUNCTION public.%I(%s)
      RETURNS %s
      LANGUAGE sql
      SECURITY INVOKER
      %s
      SET search_path = ''
      AS $function$
        %s;
      $function$;
      $wrapper$,
      target_fn.proname,
      target_fn.function_args,
      target_fn.result_type,
      volatility_sql,
      body_sql
    );

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      target_fn.proname,
      target_fn.identity_args
    );
    IF target_fn.proname = 'has_users' AND target_fn.identity_args = '' THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated',
        target_fn.proname,
        target_fn.identity_args
      );

      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION app_private.%I(%s) TO anon, authenticated',
        target_fn.proname,
        target_fn.identity_args
      );
    ELSE
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        target_fn.proname,
        target_fn.identity_args
      );

      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION app_private.%I(%s) TO authenticated',
        target_fn.proname,
        target_fn.identity_args
      );
    END IF;
  END LOOP;
END;
$$;

-- Supabase projects may carry default EXECUTE grants for service_role on new
-- functions. Keep direct service-role RPC access limited to alert workers.
DO $$
DECLARE
  target_fn RECORD;
BEGIN
  FOR target_fn IN
    SELECT
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'app_private', 'etl', 'stoqr')
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass
          AND d.objid = p.oid
          AND d.deptype = 'e'
      )
      AND NOT (
        n.nspname = 'public'
        AND (
          (p.proname = 'claim_stoqr_pending_email_alerts' AND pg_get_function_identity_arguments(p.oid) = 'target_company_id uuid, batch_size integer')
          OR (p.proname = 'mark_stoqr_alert_email_delivery' AND pg_get_function_identity_arguments(p.oid) = 'target_delivery_id uuid, next_status text, provider_message_id text, error_message text')
          OR (p.proname = 'claim_stoqr_pending_alert_notifications' AND pg_get_function_identity_arguments(p.oid) = 'target_company_id uuid, batch_size integer')
          OR (p.proname = 'mark_stoqr_alert_notification_delivery' AND pg_get_function_identity_arguments(p.oid) = 'target_delivery_id uuid, next_status text, provider_message_id text, error_message text')
        )
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM service_role',
      target_fn.nspname,
      target_fn.proname,
      target_fn.identity_args
    );
  END LOOP;
END;
$$;

ALTER DEFAULT PRIVILEGES IN SCHEMA app_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;



-- Move relocatable extensions out of the exposed public schema.
-- The API extra_search_path already includes extensions, and existing columns,
-- indexes, and triggers keep OID references to extension objects.
ALTER EXTENSION citext SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION moddatetime SET SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- pg_net is not relocatable on the linked Supabase project. Its extension
-- record remains in public, but its SQL API is in the net schema; block direct
-- client execution and keep database-owned/service workflows available.
REVOKE ALL ON SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA net TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO service_role;

-- These tables are service-role/internal only. Explicit deny-all policies keep
-- RLS intent visible to Supabase's linter while preserving client lockout.

CREATE POLICY platform_app_health_snapshots_deny_client_access
ON public.platform_app_health_snapshots
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_audit_events_deny_client_access
ON public.platform_audit_events
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_coupons_deny_client_access
ON public.platform_coupons
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_default_configurations_deny_client_access
ON public.platform_default_configurations
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_feature_flags_deny_client_access
ON public.platform_feature_flags
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_instance_settings_deny_client_access
ON public.platform_instance_settings
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_pricing_plans_deny_client_access
ON public.platform_pricing_plans
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_release_notes_deny_client_access
ON public.platform_release_notes
FOR ALL
USING (false)
WITH CHECK (false);



-- Disable unused GraphQL. pg_graphql reflects every API-exposed schema through
-- graphql.resolve, which surfaces all tables/views/functions to the anon and
-- authenticated roles even when REST/RLS is otherwise locked down. No app in
-- this repo uses GraphQL (graphql_public is also removed from the API schemas
-- in supabase/config.toml), so drop the extension. Dropping it (CASCADE) also
-- removes the resolver, event triggers, and graphql_public.graphql wrapper.
DROP EXTENSION IF EXISTS pg_graphql CASCADE;

-- The graphql/graphql_public schemas are owned by supabase_admin, so the
-- migration role may not be able to drop the now-empty shells. Best-effort.
DO $$
BEGIN
  BEGIN
    EXECUTE 'DROP SCHEMA IF EXISTS graphql_public CASCADE';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    EXECUTE 'DROP SCHEMA IF EXISTS graphql CASCADE';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

-- Remove broad anonymous access to the public account/platform surface. Supabase
-- pre-grants anon/authenticated table privileges across the public schema, so
-- every account table and view shows up as anon-reachable in security advisors
-- even though RLS denies the rows. RLS stays the boundary for signed-in users,
-- so only the anon (and PUBLIC) grants are withdrawn here; authenticated and
-- service_role keep the direct REST access the apps rely on.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
