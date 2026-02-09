-- --- POLICIES ---

-- App Permissions
create policy "Public read app permissions" on app_permissions for select using (true);

-- Companies
create policy "Authenticated users can create companies" on companies 
  for insert to authenticated with check (true);

create policy "Members can view their company" on companies 
  for select using (
    deleted_at is null and -- FILTER SOFT DELETES
    exists (select 1 from company_members where company_id = companies.id and user_id = auth.uid())
  );

create policy "Admins can update company" on companies 
  for update using ( 
    deleted_at is null and
    has_permission(id, 'company.manage') 
  );

-- Roles
create policy "Members can view company roles" on roles for select
  using ( exists (select 1 from company_members where user_id = auth.uid() and company_id = roles.company_id) );

create policy "Admins can manage roles" on roles for all
  using ( has_permission(company_id, 'roles.manage') );

-- Role Permissions
create policy "Members can view role permissions" on role_permissions for select
  using ( exists (select 1 from roles r join company_members cm on r.company_id = cm.company_id where r.id = role_permissions.role_id and cm.user_id = auth.uid()) );

create policy "Admins can manage role permissions" on role_permissions for all
  using ( 
    exists (
      select 1 from roles r 
      where r.id = role_permissions.role_id 
      and has_permission(r.company_id, 'roles.manage')
    )
  );

-- Products
create policy "Members can view products" on products for select
  using ( 
    deleted_at is null and -- FILTER SOFT DELETES
    has_permission(company_id, 'products.view') 
  );

create policy "Staff can manage products" on products for all
  using ( has_permission(company_id, 'products.manage') );

-- Inventory Transactions
create policy "Members can view transactions" on inventory_transactions 
  for select using ( has_permission(company_id, 'transactions.view') );

create policy "Staff can create transactions" on inventory_transactions 
  for insert with check ( has_permission(company_id, 'transactions.create') );

-- Folders
create policy "Members can view folders" on folders for select
  using ( has_permission(company_id, 'products.view') );

create policy "Staff can manage folders" on folders for all
  using ( has_permission(company_id, 'products.manage') );

-- Tags
create policy "Members can view tags" on tags for select
  using ( has_permission(company_id, 'products.view') );

create policy "Staff can manage tags" on tags for all
  using ( has_permission(company_id, 'products.manage') );

-- Company Members
create policy "Users can view their own memberships" on company_members for select
  using ( user_id = auth.uid() );

create policy "Managers can view all members" on company_members for select
  using ( has_permission(company_id, 'members.view') );

-- Invitations
create policy "Managers can view and create invitations" on company_invitations for all
  using ( has_permission(company_id, 'members.manage') );

-- Storage Policies
-- 1. UPLOAD: Limit to company folder "company_id/filename"
create policy "Give users access to their company folder"
on storage.objects for insert
with check (
  bucket_id = 'product-images' 
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] in (
    select company_id::text from company_members 
    where user_id = auth.uid()
    and has_permission(company_id, 'products.manage')
  )
);

-- 2. READ: Public or Company Restricted? 
-- Usually Product images are public, but if restricted:
create policy "Users can view images from their company"
on storage.objects for select
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] in (
    select company_id::text from company_members where user_id = auth.uid()
  )
);