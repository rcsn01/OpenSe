ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'suspended'));

DROP FUNCTION IF EXISTS public.admin_list_organisations();

CREATE OR REPLACE FUNCTION public.admin_list_organisations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  owner_email TEXT,
  owner_full_name TEXT,
  member_count BIGINT,
  status TEXT
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
    COUNT(om.id) AS member_count,
    o.status
  FROM public.organisations o
  LEFT JOIN public.profiles p ON p.id = o.owner_id
  LEFT JOIN public.organisation_members om ON om.org_id = o.id
  GROUP BY o.id, o.name, o.created_at, p.email, p.full_name, o.status
  ORDER BY o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_org_member_seat_assignments(p_org_id UUID)
RETURNS TABLE (
  org_member_id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  app_codes TEXT[]
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
    p.email,
    p.full_name,
    om.role,
    COALESCE(array_agg(omas.app_code ORDER BY omas.app_code) FILTER (WHERE omas.app_code IS NOT NULL), ARRAY[]::TEXT[])
  FROM public.organisation_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.organisation_member_app_seats omas ON omas.org_member_id = om.id
  WHERE om.org_id = p_org_id
  GROUP BY om.id, om.user_id, p.email, p.full_name, om.role
  ORDER BY COALESCE(p.full_name, p.email, om.user_id::TEXT);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_organisations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_org_member_seat_assignments(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_organisations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_org_member_seat_assignments(UUID) TO authenticated;
