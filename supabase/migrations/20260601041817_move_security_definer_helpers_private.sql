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
