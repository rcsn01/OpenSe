BEGIN;

SELECT plan(1);

DO $$
DECLARE
  v_details TEXT;
BEGIN
  -- GraphQL must stay disabled. pg_graphql reflects every API-exposed schema and
  -- broadens the anon/authenticated surface area without being used by any app.
  -- The graphql/graphql_public schemas are owned by supabase_admin and cannot be
  -- dropped by the migration role; dropping the extension leaves only Supabase's
  -- disabled-state placeholder graphql_public.graphql() behind. Assert that the
  -- extension and the real resolver are gone and that no tables/views remain.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_graphql') THEN
    RAISE EXCEPTION 'pg_graphql extension must not be installed';
  END IF;

  IF to_regproc('graphql.resolve') IS NOT NULL THEN
    RAISE EXCEPTION 'graphql.resolve resolver must not exist while GraphQL is disabled';
  END IF;

  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY n.nspname, c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('graphql', 'graphql_public')
    AND c.relkind IN ('r', 'v', 'm', 'p');

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'graphql schemas must not expose any relations: %', v_details;
  END IF;

  -- Public account/platform tables and views must not be directly reachable by
  -- anon. RLS already denies the rows, but standing anon grants make these
  -- entities show up as anon-reachable in security advisors.
  SELECT string_agg(n.nspname || '.' || c.relname, ', ' ORDER BY n.nspname, c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'v', 'p', 'm')
    AND (
      has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'public schema tables/views must not be directly accessible to anon: %', v_details;
  END IF;

  -- SECURITY DEFINER functions in the client-exposed schemas must never be
  -- executable by anon or authenticated, including trigger helpers such as
  -- public.assign_stoqr_guest_role_for_seat(). Privileged implementations live
  -- in app_private and run only as triggers or service-role workflows.
  SELECT string_agg(
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
    ', '
    ORDER BY n.nspname, p.proname
  )
  INTO v_details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'etl', 'stoqr')
    AND p.prosecdef
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY DEFINER functions must not be executable by anon/authenticated: %', v_details;
  END IF;
END;
$$;

SELECT pass('GraphQL is disabled, anon has no direct public table access, and no client role can execute SECURITY DEFINER functions');

SELECT * FROM finish();

ROLLBACK;
