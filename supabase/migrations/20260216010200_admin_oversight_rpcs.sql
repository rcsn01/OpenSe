-- ============================================================
-- Admin Oversight RPCs (Read-Only)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_organisations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  owner_email TEXT,
  owner_full_name TEXT,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    p.email,
    p.full_name,
    COUNT(om.id) AS member_count
  FROM public.organisations o
  LEFT JOIN public.profiles p ON p.id = o.owner_id
  LEFT JOIN public.organisation_members om ON om.org_id = o.id
  GROUP BY o.id, o.name, o.created_at, p.email, p.full_name
  ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  is_super_admin BOOLEAN,
  memberships JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    EXISTS (
      SELECT 1
      FROM public.super_admin_members sam
      WHERE sam.user_id = p.id
    ) AS is_super_admin,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'org_id', om.org_id,
            'org_name', o.name,
            'role', om.role
          )
          ORDER BY o.name
        )
        FROM public.organisation_members om
        JOIN public.organisations o ON o.id = om.org_id
        WHERE om.user_id = p.id
      ),
      '[]'::jsonb
    ) AS memberships
  FROM public.profiles p
  ORDER BY p.email NULLS LAST, p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_organisation_members(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    om.id,
    om.user_id,
    om.role,
    p.email,
    p.full_name
  FROM public.organisation_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.org_id = p_org_id
  ORDER BY om.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_stoqr_organisations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    COUNT(cm.id) AS member_count
  FROM public.organisations o
  LEFT JOIN stoqr.organisation_member_roles cm ON cm.company_id = o.id
  GROUP BY o.id, o.name, o.created_at
  ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_stoqr_company_members(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  joined_at TIMESTAMPTZ,
  role_name TEXT,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    cm.id,
    cm.user_id,
    cm.joined_at,
    r.name AS role_name,
    p.full_name,
    p.email
  FROM stoqr.organisation_member_roles cm
  LEFT JOIN stoqr.roles r ON r.id = cm.role_id
  LEFT JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.company_id = p_company_id
  ORDER BY cm.joined_at;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_organisations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_organisation_members(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_stoqr_organisations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_stoqr_company_members(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_organisations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_organisation_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_stoqr_organisations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_stoqr_company_members(UUID) TO authenticated;
