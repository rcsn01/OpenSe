-- ============================================================
-- Migration 0002: Shared Profile Table (public schema)
-- ============================================================
-- Unified profiles table combining fields from both ETL and StoQR.
-- Both apps reference auth.users via this single profiles table.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username CITEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ
);

-- Auto-update updated_at on profile changes
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Super admin membership table (shared across the platform)
CREATE TABLE IF NOT EXISTS public.super_admin_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_members ENABLE ROW LEVEL SECURITY;

-- Super admin check (needed for policies below)
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

-- Profile policies
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Super admin policies
CREATE POLICY "super_admin_members_select" ON public.super_admin_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "super_admin_members_insert" ON public.super_admin_members
  FOR INSERT WITH CHECK (public.is_app_super_admin());

CREATE POLICY "super_admin_members_update" ON public.super_admin_members
  FOR UPDATE USING (public.is_app_super_admin());

CREATE POLICY "super_admin_members_delete" ON public.super_admin_members
  FOR DELETE USING (public.is_app_super_admin());

-- Grants
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.super_admin_members TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
