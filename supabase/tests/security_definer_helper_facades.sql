BEGIN;

DO $$
BEGIN
  IF NOT has_function_privilege('anon', 'public.has_users()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon should still execute the public has_users facade';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.has_permission(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should still execute the public has_permission facade';
  END IF;

  IF has_function_privilege('authenticated', 'public.is_org_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should not execute public.is_org_member directly';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.is_org_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the private RLS helper';
  END IF;

  IF (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'has_permission'
      AND pg_get_function_identity_arguments(p.oid) = '_company_id uuid, _permission_code text'
  ) THEN
    RAISE EXCEPTION 'public.has_permission should be a SECURITY INVOKER facade';
  END IF;

  IF NOT (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'has_permission'
      AND pg_get_function_identity_arguments(p.oid) = '_company_id uuid, _permission_code text'
  ) THEN
    RAISE EXCEPTION 'app_private.has_permission should remain SECURITY DEFINER';
  END IF;
END;
$$;

ROLLBACK;
