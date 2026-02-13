-- ============================================================
-- Migration 0011: Deprecate unsafe auth admin SQL RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_user_admin(
  email TEXT,
  password TEXT,
  full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RAISE EXCEPTION 'create_user_admin is deprecated. Use Edge Function admin-user-management (action=create).';
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_admin(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_user_admin(TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_admin(TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.reset_password_admin(
  target_user_id UUID,
  new_password TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RAISE EXCEPTION 'reset_password_admin is deprecated. Use Edge Function admin-user-management (action=reset-password).';
END;
$$;

REVOKE ALL ON FUNCTION public.reset_password_admin(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_password_admin(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_password_admin(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_user_admin(
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RAISE EXCEPTION 'delete_user_admin is deprecated. Use Edge Function admin-user-management (action=delete).';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_admin(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO service_role;
