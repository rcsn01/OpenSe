BEGIN;

DO $$
DECLARE
  v_exposed_functions TEXT;
BEGIN
  SELECT string_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' ORDER BY n.nspname, p.proname)
  INTO v_exposed_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'etl', 'stoqr')
    AND p.prosecdef
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  IF v_exposed_functions IS NOT NULL THEN
    RAISE EXCEPTION 'Exposed SECURITY DEFINER functions are executable by client roles: %', v_exposed_functions;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'app_private')
      AND p.proname = 'accounts_get_profile'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    RAISE EXCEPTION 'accounts_get_profile should be removed after migrating to direct RLS-backed profile reads';
  END IF;
END;
$$;

ROLLBACK;
