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
