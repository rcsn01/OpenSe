-- 1. OPTIMIZATION: Workflows (Templates)
-- Previous: auth.role() = 'authenticated' ...
-- Fixed: (select auth.role()) = 'authenticated' ...

DROP POLICY IF EXISTS "Enable read access for templates" ON public.workflows;
CREATE POLICY "Enable read access for templates" ON public.workflows
FOR SELECT USING (
  (select auth.role()) = 'authenticated' 
  AND is_template = true
);

-- 2. OPTIMIZATION: Profiles
-- Previous: auth.role() = 'authenticated'
-- Fixed: (select auth.role()) = 'authenticated'

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
FOR SELECT USING (
  (select auth.role()) = 'authenticated'
);

-- 3. OPTIMIZATION: Super Admin Members
-- Previous: public.is_app_super_admin()
-- Fixed: (select public.is_app_super_admin())
-- We wrap the function call in a select so it runs once per query, not once per row.

DROP POLICY IF EXISTS "Super admins can manage admins" ON public.super_admin_members;
CREATE POLICY "Super admins can manage admins" ON public.super_admin_members
FOR ALL USING (
  (select public.is_app_super_admin())
);

-- 4. OPTIMIZATION: Organization Members (Insert Policy)
-- This policy often uses multiple checks. We optimize the role check and the admin check.

DROP POLICY IF EXISTS "Organization members can be inserted by owner, admin, or super admin" ON public.organization_members;
CREATE POLICY "Organization members can be inserted by owner, admin, or super admin" ON public.organization_members
FOR INSERT WITH CHECK (
  public.is_org_owner(org_id, (select auth.uid())) 
  OR public.is_org_admin(org_id, (select auth.uid())) 
  OR (select public.is_app_super_admin())
);