-- OPTIMIZATION: Workflows Table
-- Previous: auth.uid() = owner_id
-- Fixed: (select auth.uid()) = owner_id

DROP POLICY IF EXISTS "View own private workflows" ON public.workflows;
CREATE POLICY "View own private workflows" ON public.workflows
FOR SELECT USING (
  (select auth.uid()) = owner_id 
  AND org_id IS NULL
);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.workflows;
CREATE POLICY "Enable insert for authenticated users" ON public.workflows
FOR INSERT WITH CHECK (
  (select auth.uid()) = owner_id
);

-- Note: For complex policies involving EXISTS subqueries (like "View org workflows"), 
-- the performance hit is often in the subquery join, but caching the uid helps there too.
DROP POLICY IF EXISTS "View org workflows" ON public.workflows;
CREATE POLICY "View org workflows" ON public.workflows
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = workflows.org_id
    AND organization_members.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Enable update for owners and org members" ON public.workflows;
CREATE POLICY "Enable update for owners and org members" ON public.workflows
FOR UPDATE USING (
  (select auth.uid()) = owner_id 
  OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = workflows.org_id
    AND organization_members.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Enable delete for owners and org members" ON public.workflows;
CREATE POLICY "Enable delete for owners and org members" ON public.workflows
FOR DELETE USING (
  (select auth.uid()) = owner_id 
  OR EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = workflows.org_id
    AND organization_members.user_id = (select auth.uid())
  )
);

-- OPTIMIZATION: Profiles Table
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (
  (select auth.uid()) = id
);

-- OPTIMIZATION: Organizations Table
-- (Updating the policy from 20260118000000_allow_org_admin_update.sql)
DROP POLICY IF EXISTS "Organizations can be updated by owner, admin, or super admin" ON public.organizations;
CREATE POLICY "Organizations can be updated by owner, admin, or super admin" ON public.organizations
FOR UPDATE USING (
  owner_id = (select auth.uid()) 
  OR public.is_org_admin(id, (select auth.uid())) 
  OR public.is_app_super_admin()
);

DROP POLICY IF EXISTS "Organizations are viewable by owners or members" ON public.organizations;
CREATE POLICY "Organizations are viewable by owners or members" ON public.organizations
FOR SELECT USING (
  owner_id = (select auth.uid()) 
  OR public.is_org_member(id, (select auth.uid())) 
  OR public.is_app_super_admin()
);

-- OPTIMIZATION: Organization Members Table
DROP POLICY IF EXISTS "Organization members are viewable by members" ON public.organization_members;
CREATE POLICY "Organization members are viewable by members" ON public.organization_members
FOR SELECT USING (
  user_id = (select auth.uid()) 
  OR public.is_org_owner(org_id, (select auth.uid())) 
  OR public.is_org_member(org_id, (select auth.uid())) 
  OR public.is_app_super_admin()
);

-- OPTIMIZATION: Workflow Executions Table (from 20260118000002)
DROP POLICY IF EXISTS "Users can insert own executions" ON public.workflow_executions;
CREATE POLICY "Users can insert own executions" ON public.workflow_executions
FOR INSERT WITH CHECK (
  (select auth.uid()) = user_id
);

DROP POLICY IF EXISTS "Users can view own executions" ON public.workflow_executions;
CREATE POLICY "Users can view own executions" ON public.workflow_executions
FOR SELECT USING (
  (select auth.uid()) = user_id
);

DROP POLICY IF EXISTS "Org members can view org executions" ON public.workflow_executions;
CREATE POLICY "Org members can view org executions" ON public.workflow_executions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_members.org_id = workflow_executions.org_id
    AND organization_members.user_id = (select auth.uid())
  )
);