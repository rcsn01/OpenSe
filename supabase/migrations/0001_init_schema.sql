-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "citext";      -- Case-insensitive text
create extension if not exists "pg_trgm";     -- For fuzzy search (essential for products)
create extension if not exists "moddatetime"; -- For auto-updating updated_at

-- 2. PROFILES
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  username citext unique,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger for profiles updated_at
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure moddatetime (updated_at);

-- 3. COMPANIES (The Tenant)
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  stripe_customer_id text,
  subscription_tier text default 'free',
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone
);

create trigger handle_updated_at before update on public.companies
  for each row execute procedure moddatetime (updated_at);

-- 4. PERMISSIONS (System)
create table public.app_permissions (
  code text primary key,
  description text
);

insert into public.app_permissions (code, description) values
  ('company.manage', 'Manage company details and settings'),
  ('billing.manage', 'Manage subscription and billing'),
  ('members.view', 'View company members'),
  ('members.manage', 'Invite and manage members'),
  ('roles.manage', 'Create and edit custom roles'),
  ('products.view', 'View inventory and products'),
  ('products.manage', 'Create, edit, and delete products'),
  ('transactions.view', 'View stock history'),
  ('transactions.create', 'Create stock in/out transactions');

-- 5. ROLES
create table public.roles (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, name)
);

-- 6. ROLE PERMISSIONS
create table public.role_permissions (
  role_id uuid references public.roles(id) on delete cascade not null,
  permission_code text references public.app_permissions(code) on delete cascade not null,
  primary key (role_id, permission_code)
);

-- 7. COMPANY MEMBERS
create table public.company_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  role_id uuid references public.roles(id) on delete set null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, company_id)
);

-- 8. COMPANY INVITATIONS
create table public.company_invitations (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  email citext not null,
  role_id uuid references public.roles(id) on delete cascade not null,
  token text default gen_random_uuid()::text not null unique,
  invited_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  accepted_at timestamp with time zone,
  unique(company_id, email)
);

-- 9. SUBSCRIPTIONS
create table public.subscriptions (
  id text primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  status text check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')) not null,
  price_id text,
  quantity integer default 1,
  cancel_at_period_end boolean default false,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  ended_at timestamp with time zone
);

-- 10. FOLDERS
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. TAGS
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  color text default '#64748b',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, name)
);

-- 12. PRODUCTS
create table public.products (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  sku text not null,
  name text not null,
  description text,
  category text,
  
  -- Inventory Tracking
  quantity_on_hand integer default 0,
  reorder_point integer default 10,
  
  -- Financials
  cost_price decimal(10,2),
  selling_price decimal(10,2),
  
  -- Metadata
  image_urls text[] default '{}'::text[],
  expiry_date date,
  custom_fields jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  
  constraint products_max_images check (coalesce(array_length(image_urls, 1), 0) <= 4),
  unique(company_id, sku)
);

create trigger handle_updated_at before update on public.products
  for each row execute procedure moddatetime (updated_at);

-- 13. PRODUCT TAGS
create table public.product_tags (
  product_id uuid references public.products(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  company_id uuid references public.companies(id) on delete cascade not null,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (product_id, tag_id)
);

-- 14. INVENTORY TRANSACTIONS
create table public.inventory_transactions (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete restrict not null, 
  performed_by uuid references public.profiles(id),
  
  -- Transaction Details
  transaction_type text check (transaction_type in ('purchase', 'sale', 'adjustment', 'return', 'loss')) not null,
  quantity_change integer not null, -- Can be positive or negative
  
  -- Snapshot for audit trail (Populated by Trigger)
  stock_after integer, 
  
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 15. STORAGE
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- --- INDEXES ---
create index idx_products_custom_fields on public.products using gin (custom_fields);
create index idx_folders_company on public.folders(company_id);
create index idx_folders_parent on public.folders(parent_id);
create index idx_product_tags_product on public.product_tags(product_id);
create index idx_product_tags_tag on public.product_tags(tag_id);
create index idx_role_permissions_role on public.role_permissions(role_id);
create index idx_members_role on public.company_members(role_id);
create index idx_products_company_folder on public.products(company_id, folder_id);
create index idx_members_user_company on public.company_members(user_id, company_id);
create index idx_invitations_token on public.company_invitations(token);

-- Search Indexes (GIN for fuzzy search)
create index idx_products_name_search on public.products using gin(name gin_trgm_ops);
create index idx_products_sku_search on public.products using gin(sku gin_trgm_ops);





