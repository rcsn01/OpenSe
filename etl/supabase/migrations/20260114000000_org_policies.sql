-- CATEGORY: RLS policies (consolidated, single permissive per action)
-- Uses helper functions defined in 20260113000000_add_user_trigger.sql

-- PROFILES
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "profiles_select_authenticated" on public.profiles
for select using ((select auth.role()) = 'authenticated');

create policy "profiles_update_self" on public.profiles
for update using ((select auth.uid()) = id);

-- ORGANISATIONS
drop policy if exists "Organisations are viewable by owners or members" on public.organisations;
drop policy if exists "Organisations can be inserted by owner" on public.organisations;
drop policy if exists "Organisations can be inserted by super admin" on public.organisations;
drop policy if exists "Organisations can be updated by owner or super admin" on public.organisations;
drop policy if exists "Organisations can be updated by owner, admin, or super admin" on public.organisations;
drop policy if exists "Organisations can be deleted by owner or super admin" on public.organisations;

create policy "organisations_select_unified" on public.organisations
for select using (
  owner_id = (select auth.uid())
  or public.is_org_member(id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "organisations_insert_super_admin" on public.organisations
for insert with check (public.is_app_super_admin());

create policy "organisations_update_unified" on public.organisations
for update using (
  owner_id = (select auth.uid())
  or public.is_org_admin(id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "organisations_delete_owner_or_super" on public.organisations
for delete using (
  owner_id = (select auth.uid())
  or public.is_app_super_admin()
);

-- ORGANISATION MEMBERS
drop policy if exists "Organisation members are viewable by members" on public.organisation_members;
drop policy if exists "Organisation members can be inserted by owner or admin" on public.organisation_members;
drop policy if exists "Organisation members can be inserted by owner, admin, or super admin" on public.organisation_members;
drop policy if exists "Organisation members can be updated by owner or admin" on public.organisation_members;
drop policy if exists "Organisation members can be deleted by owner or admin" on public.organisation_members;

create policy "org_members_select_unified" on public.organisation_members
for select using (
  user_id = (select auth.uid())
  or public.is_org_owner(org_id, (select auth.uid()))
  or public.is_org_member(org_id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "org_members_insert_unified" on public.organisation_members
for insert with check (
  public.is_org_owner(org_id, (select auth.uid()))
  or public.is_org_admin(org_id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "org_members_update_unified" on public.organisation_members
for update using (
  public.is_org_owner(org_id, (select auth.uid()))
  or public.is_org_admin(org_id, (select auth.uid()))
  or public.is_app_super_admin()
);

create policy "org_members_delete_unified" on public.organisation_members
for delete using (
  (
    public.is_org_owner(org_id, (select auth.uid()))
    or public.is_org_admin(org_id, (select auth.uid()))
    or public.is_app_super_admin()
  )
  and not exists (
    select 1 from public.organisations o
    where o.id = organisation_members.org_id
      and o.owner_id = organisation_members.user_id
  )
);

-- WORKFLOWS
drop policy if exists "View own private workflows" on public.workflows;
drop policy if exists "View org workflows" on public.workflows;
drop policy if exists "Enable read access for templates" on public.workflows;
drop policy if exists "Enable insert for authenticated users" on public.workflows;
drop policy if exists "Enable update for owners and org members" on public.workflows;
drop policy if exists "Enable delete for owners and org members" on public.workflows;

create policy "workflows_select_unified" on public.workflows
for select using (
  (org_id is null and owner_id = (select auth.uid()))
  or exists (
    select 1 from public.organisation_members om
    where om.org_id = public.workflows.org_id
      and om.user_id = (select auth.uid())
  )
  or (is_template = true and (select auth.role()) = 'authenticated')
);

create policy "workflows_insert_owner_only" on public.workflows
for insert with check ((select auth.uid()) = owner_id);

create policy "workflows_update_owner_or_member" on public.workflows
for update using (
  (select auth.uid()) = owner_id
  or exists (
    select 1 from public.organisation_members om
    where om.org_id = public.workflows.org_id
      and om.user_id = (select auth.uid())
  )
);

create policy "workflows_delete_owner_or_member" on public.workflows
for delete using (
  (select auth.uid()) = owner_id
  or exists (
    select 1 from public.organisation_members om
    where om.org_id = public.workflows.org_id
      and om.user_id = (select auth.uid())
  )
);

-- WORKFLOW EXECUTIONS
drop policy if exists "Users can insert own executions" on public.workflow_executions;
drop policy if exists "Users can view own executions" on public.workflow_executions;
drop policy if exists "Org members can view org executions" on public.workflow_executions;

create policy "workflow_executions_select_unified" on public.workflow_executions
for select using (
  (select auth.uid()) = user_id
  or exists (
    select 1 from public.organisation_members om
    where om.org_id = public.workflow_executions.org_id
      and om.user_id = (select auth.uid())
  )
);

create policy "workflow_executions_insert_self" on public.workflow_executions
for insert with check ((select auth.uid()) = user_id);

-- SUPER ADMIN MEMBERS
drop policy if exists "Super admins are viewable by everyone" on public.super_admin_members;
drop policy if exists "Super admins can manage admins" on public.super_admin_members;

create policy "super_admin_members_select" on public.super_admin_members
for select using (true);

create policy "super_admin_members_insert" on public.super_admin_members
for insert with check (public.is_app_super_admin());

create policy "super_admin_members_update" on public.super_admin_members
for update using (public.is_app_super_admin());

create policy "super_admin_members_delete" on public.super_admin_members
for delete using (public.is_app_super_admin());
