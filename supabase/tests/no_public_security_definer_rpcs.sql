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

  IF (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'accounts_get_profile'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    RAISE EXCEPTION 'public.accounts_get_profile should be a SECURITY INVOKER facade';
  END IF;

  IF NOT (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'accounts_get_profile'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    RAISE EXCEPTION 'app_private.accounts_get_profile should remain SECURITY DEFINER';
  END IF;
END;
$$;

ROLLBACK;
