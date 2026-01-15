-- Allow owners and organization members to delete workflows
create policy "Enable delete for owners and org members" on workflows
for delete using (
  auth.uid() = owner_id 
  or exists (
    select 1 from organization_members
    where organization_members.org_id = workflows.org_id
    and organization_members.user_id = auth.uid()
  )
);
