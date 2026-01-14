-- RLS policies to allow authenticated users to create orgs and manage memberships

-- Organizations
create policy "Organizations: select visible orgs" on organizations
for select using (
  auth.uid() = owner_id
  or exists (
    select 1 from organization_members om
    where om.org_id = organizations.id
      and om.user_id = auth.uid()
  )
);

create policy "Organizations: insert own org" on organizations
for insert with check (auth.uid() = owner_id);

create policy "Organizations: update own org" on organizations
for update using (auth.uid() = owner_id);

create policy "Organizations: delete own org" on organizations
for delete using (auth.uid() = owner_id);

-- Organization members
create policy "Org members: select within orgs" on organization_members
for select using (
  auth.uid() = user_id
  or exists (
    select 1 from organizations o
    where o.id = organization_members.org_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1 from organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.role in ('admin','member')
  )
);

create policy "Org members: insert by owner or admin" on organization_members
for insert with check (
  exists (
    select 1 from organizations o
    where o.id = organization_members.org_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1 from organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

create policy "Org members: update by owner or admin" on organization_members
for update using (
  exists (
    select 1 from organizations o
    where o.id = organization_members.org_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1 from organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

create policy "Org members: delete by owner or admin" on organization_members
for delete using (
  exists (
    select 1 from organizations o
    where o.id = organization_members.org_id
      and o.owner_id = auth.uid()
  )
  or exists (
    select 1 from organization_members om
    where om.org_id = organization_members.org_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);
