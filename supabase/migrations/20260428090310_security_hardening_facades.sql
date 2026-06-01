
-- Keep privileged predicate implementations out of exposed API schemas.
-- Public facades are SECURITY INVOKER and only remain executable where the app
-- or Edge Functions intentionally use the existing RPC name.
CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_users() SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.has_users();
$$;

ALTER FUNCTION public.is_org_owner(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_owner(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.is_org_member(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_member(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.is_org_admin(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_admin(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.is_org_owner_strictly(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_owner_strictly(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_owner_strictly(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.can_manage_org_app_seat_limits(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.can_manage_org_member_app_seats(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.can_manage_org_member_app_seats(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.get_primary_org_for_user(UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.get_primary_org_for_user(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.get_primary_org_for_user(p_user_id);
$$;

ALTER FUNCTION public.has_etl_permission(UUID, TEXT) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.has_etl_permission(_org_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.has_etl_permission(_org_id, _permission_code);
$$;

ALTER FUNCTION public.has_permission(UUID, TEXT) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.has_permission(_company_id, _permission_code);
$$;

REVOKE ALL ON FUNCTION public.has_users() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_owner(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_owner_strictly(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_primary_org_for_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_etl_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_users() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner_strictly(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_primary_org_for_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_etl_permission(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION app_private.has_users() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner_strictly(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_manage_org_app_seat_limits(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_manage_org_member_app_seats(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_primary_org_for_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_etl_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_permission(UUID, TEXT) TO authenticated, service_role;



-- The remaining authenticated SECURITY DEFINER warnings are app-facing RPCs.
-- Preserve their public RPC names, but move privileged implementations out of
-- exposed schemas and replace them with SECURITY INVOKER facades.
CREATE SCHEMA IF NOT EXISTS app_private;

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
      CREATE OR REPLACE FUNCTION public.%I(%s)
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
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
      target_fn.proname,
      target_fn.identity_args
    );

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION app_private.%I(%s) TO authenticated, service_role',
      target_fn.proname,
      target_fn.identity_args
    );
  END LOOP;
END;
$$;



-- Move relocatable extensions out of the exposed public schema.
-- The API extra_search_path already includes extensions, and existing columns,
-- indexes, and triggers keep OID references to extension objects.
CREATE SCHEMA IF NOT EXISTS extensions;

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
