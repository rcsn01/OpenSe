-- CATEGORY: No-op placeholder
-- Consolidation is now defined in earlier migrations (120-150); this file intentionally left blank.

------------------------------
-- super_admin_members
------------------------------
-- Remove prior overlapping policies
DROP POLICY IF EXISTS "Super admins are viewable by everyone" ON public.super_admin_members;
DROP POLICY IF EXISTS "Super admins can manage admins" ON public.super_admin_members;

-- Single permissive SELECT
CREATE POLICY "super_admin_members_select" ON public.super_admin_members
FOR SELECT USING (true);

-- Manage admins: super admins only
CREATE POLICY "super_admin_members_manage" ON public.super_admin_members
FOR INSERT WITH CHECK (public.is_app_super_admin());

CREATE POLICY "super_admin_members_update" ON public.super_admin_members
FOR UPDATE USING (public.is_app_super_admin());

CREATE POLICY "super_admin_members_delete" ON public.super_admin_members
FOR DELETE USING (public.is_app_super_admin());

------------------------------
-- profiles
------------------------------
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = id);

------------------------------
-- organizations
------------------------------
DROP POLICY IF EXISTS "Organizations are viewable by owners or members" ON public.organizations;
DROP POLICY IF EXISTS "Organizations can be inserted by owner" ON public.organizations;
DROP POLICY IF EXISTS "Organizations can be inserted by super admin" ON public.organizations;
DROP POLICY IF EXISTS "Organizations can be updated by owner or super admin" ON public.organizations;
DROP POLICY IF EXISTS "Organizations can be updated by owner, admin, or super admin" ON public.organizations;
DROP POLICY IF EXISTS "Organizations can be deleted by owner or super admin" ON public.organizations;

CREATE POLICY "organizations_select_unified" ON public.organizations
FOR SELECT USING (
  owner_id = (select auth.uid())
  OR public.is_org_member(id, (select auth.uid()))
  OR public.is_app_super_admin()
);

CREATE POLICY "organizations_insert_super_admin" ON public.organizations
FOR INSERT WITH CHECK (public.is_app_super_admin());

CREATE POLICY "organizations_update_unified" ON public.organizations
FOR UPDATE USING (
  owner_id = (select auth.uid())
  OR public.is_org_admin(id, (select auth.uid()))
  OR public.is_app_super_admin()
);

CREATE POLICY "organizations_delete_owner_or_super" ON public.organizations
FOR DELETE USING (
  owner_id = (select auth.uid())
  OR public.is_app_super_admin()
);

------------------------------
-- organization_members
------------------------------
DROP POLICY IF EXISTS "Organization members are viewable by members" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can be inserted by owner or admin" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can be inserted by owner, admin, or super admin" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can be updated by owner or admin" ON public.organization_members;
DROP POLICY IF EXISTS "Organization members can be deleted by owner or admin" ON public.organization_members;

CREATE POLICY "org_members_select_unified" ON public.organization_members
FOR SELECT USING (
  user_id = (select auth.uid())
  OR public.is_org_owner(org_id, (select auth.uid()))
  OR public.is_org_member(org_id, (select auth.uid()))
  OR public.is_app_super_admin()
);

CREATE POLICY "org_members_insert_unified" ON public.organization_members
FOR INSERT WITH CHECK (
  public.is_org_owner(org_id, (select auth.uid()))
  OR public.is_org_admin(org_id, (select auth.uid()))
  OR public.is_app_super_admin()
);

CREATE POLICY "org_members_update_unified" ON public.organization_members
FOR UPDATE USING (
  public.is_org_owner(org_id, (select auth.uid()))
  OR public.is_org_admin(org_id, (select auth.uid()))
  OR public.is_app_super_admin()
);

CREATE POLICY "org_members_delete_unified" ON public.organization_members
FOR DELETE USING (
  (
    public.is_org_owner(org_id, (select auth.uid()))
    OR public.is_org_admin(org_id, (select auth.uid()))
    OR public.is_app_super_admin()
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_members.org_id
      AND o.owner_id = organization_members.user_id
  )
);

------------------------------
-- workflows
------------------------------
DROP POLICY IF EXISTS "View own private workflows" ON public.workflows;
DROP POLICY IF EXISTS "View org workflows" ON public.workflows;
DROP POLICY IF EXISTS "Enable read access for templates" ON public.workflows;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.workflows;
DROP POLICY IF EXISTS "Enable update for owners and org members" ON public.workflows;
DROP POLICY IF EXISTS "Enable delete for owners and org members" ON public.workflows;

CREATE POLICY "workflows_select_unified" ON public.workflows
FOR SELECT USING (
  -- private workflows owned by user
  (org_id IS NULL AND owner_id = (select auth.uid()))
  -- org workflows visible to members
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = workflows.org_id
      AND om.user_id = (select auth.uid())
  )
  -- templates visible to authenticated users
  OR (is_template = true AND auth.role() = 'authenticated')
);

CREATE POLICY "workflows_insert_owner_only" ON public.workflows
FOR INSERT WITH CHECK ((select auth.uid()) = owner_id);

CREATE POLICY "workflows_update_owner_or_member" ON public.workflows
FOR UPDATE USING (
  (select auth.uid()) = owner_id
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = workflows.org_id
      AND om.user_id = (select auth.uid())
  )
);

CREATE POLICY "workflows_delete_owner_or_member" ON public.workflows
FOR DELETE USING (
  (select auth.uid()) = owner_id
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = workflows.org_id
      AND om.user_id = (select auth.uid())
  )
);

------------------------------
-- workflow_executions
------------------------------
DROP POLICY IF EXISTS "Users can insert own executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can view own executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Org members can view org executions" ON public.workflow_executions;

CREATE POLICY "workflow_executions_select_unified" ON public.workflow_executions
FOR SELECT USING (
  (select auth.uid()) = user_id
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.org_id = workflow_executions.org_id
      AND om.user_id = (select auth.uid())
  )
);

CREATE POLICY "workflow_executions_insert_self" ON public.workflow_executions
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
