-- --- TRIGGERS & FUNCTIONS ---

-- 1. PERMISSION CHECK HELPER (Optimized)
-- Marked STABLE for caching within transaction, and SECURITY DEFINER to read permissions tables
create or replace function public.has_permission(_company_id uuid, _permission_code text)
returns boolean 
language plpgsql 
security definer 
stable
set search_path = public -- Security Best Practice
as $$
begin
  return exists (
    select 1
    from company_members cm
    join role_permissions rp on cm.role_id = rp.role_id
    where cm.user_id = auth.uid()
    and cm.company_id = _company_id
    and rp.permission_code = _permission_code
  );
end;
$$;

-- 2. PROFILE CREATION TRIGGER
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. COMPANY CREATION TRIGGER (Auto-Assign Owner)
create or replace function public.add_creator_as_admin()
returns trigger as $$
declare
  owner_role_id uuid;
begin
  insert into public.roles (company_id, name, description)
  values (new.id, 'Owner', 'Company Administrator')
  returning id into owner_role_id;

  insert into public.role_permissions (role_id, permission_code)
  select owner_role_id, code from public.app_permissions;

  insert into public.company_members (user_id, company_id, role_id)
  values (auth.uid(), new.id, owner_role_id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_company_created
  after insert on public.companies
  for each row execute procedure public.add_creator_as_admin();

-- 4. INVENTORY SYNC TRIGGER (Concurrency Safe)
create or replace function public.update_inventory_count()
returns trigger as $$
declare
  current_qty integer;
  qty_delta integer;
begin
  -- 1. Determine Delta based on Type
  -- We rely on the frontend sending positive/negative correctly, 
  -- but we enforce logic here for safety.
  if new.transaction_type in ('purchase', 'return', 'adjustment') then
     qty_delta := new.quantity_change; 
  elsif new.transaction_type in ('sale', 'loss') then
     -- Ensure we subtract absolute value
     qty_delta := -abs(new.quantity_change);
  end if;

  -- 2. Lock the Product Row (Prevent Race Conditions)
  -- This ensures no other transaction can modify this product until this one finishes
  select quantity_on_hand into current_qty
  from public.products
  where id = new.product_id
  for update; -- LOCKING HAPPENS HERE

  -- 3. Update the Product
  update public.products 
  set quantity_on_hand = current_qty + qty_delta
  where id = new.product_id;

  -- 4. Save the Snapshot to the Transaction Record
  new.stock_after := current_qty + qty_delta;
  new.quantity_change := qty_delta; -- Normalize the sign in the record

  return new;
end;
$$ language plpgsql security definer;

create trigger on_inventory_transaction
  before insert on public.inventory_transactions -- Changed to BEFORE to set stock_after
  for each row execute procedure public.update_inventory_count();


-- --- RLS ENABLING ---
alter table profiles enable row level security;
alter table companies enable row level security;
alter table app_permissions enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table company_members enable row level security;
alter table company_invitations enable row level security;
alter table subscriptions enable row level security;
alter table folders enable row level security;
alter table tags enable row level security;
alter table products enable row level security;
alter table product_tags enable row level security;
alter table inventory_transactions enable row level security;