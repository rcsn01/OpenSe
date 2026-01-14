-- Hardening for organization tables and policies, now with super admin support

-- Ensure role values are constrained and membership pairs are unique
alter table organization_members
  add constraint organization_members_role_check check (role in ('admin', 'member')),
  add constraint organization_members_org_user_unique unique (org_id, user_id);

create index if not exists organization_members_org_idx on organization_members(org_id);
create index if not exists organization_members_user_idx on organization_members(user_id);

-- Profiles: allow authenticated users to read basic identity rows (needed for invites)
create policy "Profiles are viewable by authenticated users" on profiles
for select using (auth.role() = 'authenticated');

-- Super admin flag and helper
alter table public.profiles
  add column if not exists is_super_admin boolean default false;

create or replace function public.is_app_super_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_super_admin = true
  );
$$;

-- Helper functions to avoid policy recursion
-- These are SECURITY DEFINER to bypass RLS checks on the tables they query
create or replace function public.is_org_owner(p_org_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.organizations
    where id = p_org_id and owner_id = p_user_id
  );
$$;

create or replace function public.is_org_member(p_org_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = p_user_id
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where org_id = p_org_id and user_id = p_user_id and role = 'admin'
  );
$$;

-- Organizations: owner OR member can read
create policy "Organizations are viewable by owners or members" on organizations
for select using (
  owner_id = auth.uid() or is_org_member(id, auth.uid()) or is_app_super_admin()
);

-- Organizations: super admin only create
drop policy if exists "Organizations can be inserted by owner" on organizations;

create policy "Organizations can be inserted by super admin" on organizations
for insert with check (
  is_app_super_admin()
);

-- Organizations: owner or super admin can update/delete
create policy "Organizations can be updated by owner or super admin" on organizations
for update using (owner_id = auth.uid() or is_app_super_admin());

create policy "Organizations can be deleted by owner or super admin" on organizations
for delete using (owner_id = auth.uid() or is_app_super_admin());

-- Organization members: readable by members or org owner
create policy "Organization members are viewable by members" on organization_members
for select using (
  user_id = auth.uid() or is_org_owner(org_id, auth.uid()) or is_org_member(org_id, auth.uid()) or is_app_super_admin()
);

-- Organization members: insert/update/delete allowed for org owner, admins, or super admin
drop policy if exists "Organization members can be inserted by owner or admin" on organization_members;

create policy "Organization members can be inserted by owner, admin, or super admin" on organization_members
for insert with check (
  is_org_owner(org_id, auth.uid()) or is_org_admin(org_id, auth.uid()) or is_app_super_admin()
);

create policy "Organization members can be updated by owner or admin" on organization_members
for update using (
  is_org_owner(org_id, auth.uid()) or is_org_admin(org_id, auth.uid()) or is_app_super_admin()
);

-- Prevent deleting the owner membership row; allow owner/admin to remove others
create policy "Organization members can be deleted by owner or admin" on organization_members
for delete using (
  (is_org_owner(org_id, auth.uid()) or is_org_admin(org_id, auth.uid()) or is_app_super_admin())
  and not exists (
    select 1 from organizations o
    where o.id = organization_members.org_id
      and o.owner_id = organization_members.user_id
  )
);
