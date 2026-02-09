-- ============================================================
-- Migration 0003: Shared Functions & Triggers (public schema)
-- ============================================================
-- Helper functions and the unified user-creation trigger that
-- provisions profiles for both ETL and StoQR on signup.

-- ─── Super Admin Check ───────────────────────────────

CREATE OR REPLACE FUNCTION public.is_app_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admin_members
    WHERE user_id = (SELECT auth.uid())
  );
$$;

-- ─── ETL Org Helpers ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, etl
AS $$
  SELECT EXISTS (
    SELECT 1 FROM etl.organisations
    WHERE id = p_org_id AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, etl
AS $$
  SELECT EXISTS (
    SELECT 1 FROM etl.organisation_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, etl
AS $$
  SELECT EXISTS (
    SELECT 1 FROM etl.organisation_members
    WHERE org_id = p_org_id AND user_id = p_user_id AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner_strictly(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM etl.organisations
    WHERE id = p_org_id AND owner_id = p_user_id
  );
$$;

-- ─── StoQR Permission Helper ────────────────────────

CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
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

-- ─── Super Admin Status RPC ─────────────────────────

CREATE OR REPLACE FUNCTION public.get_super_admin_status()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_app_super_admin();
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_status() TO authenticated;

-- ─── Has Users Check ────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_users()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles);
$$;

GRANT EXECUTE ON FUNCTION public.has_users() TO anon;
GRANT EXECUTE ON FUNCTION public.has_users() TO authenticated;

-- ─── Unified New User Trigger ───────────────────────
-- Creates a profile for every new auth.users row.
-- First user auto-becomes super admin (ETL behavior).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- First user auto-becomes super admin
  IF NOT EXISTS (SELECT 1 FROM public.super_admin_members) THEN
    INSERT INTO public.super_admin_members (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
