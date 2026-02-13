-- ============================================================
-- Migration 0010: StoQR super-admin overrides
-- ============================================================

-- Let platform super admins pass all StoQR permission checks.
CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  IF public.is_app_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM stoqr.company_members cm
    JOIN stoqr.role_permissions rp ON cm.role_id = rp.role_id
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = _company_id
      AND rp.permission_code = _permission_code
  );
END;
$$;

-- Enable global company visibility for super admins.
CREATE POLICY "Super admins can view all companies" ON stoqr.companies
  FOR SELECT USING (public.is_app_super_admin());

-- Allow super admins to delete companies when needed.
CREATE POLICY "Super admins can delete companies" ON stoqr.companies
  FOR DELETE USING (public.is_app_super_admin());

-- Allow role lookup across companies in global admin screens.
CREATE POLICY "Super admins can view all roles" ON stoqr.roles
  FOR SELECT USING (public.is_app_super_admin());
