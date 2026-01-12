-- 1. Create Profiles (linked to auth.users)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text
);

-- 2. Create Organizations
create table organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references profiles(id) not null
);

-- 3. Create Memberships (Many-to-Many)
create table organization_members (
  id uuid default uuid_generate_v4() primary key,
  org_id uuid references organizations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text default 'member' -- 'admin' or 'member'
);

-- 4. Create Workflows
create table workflows (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  graph_data jsonb, -- Stores the React Flow nodes/edges JSON
  owner_id uuid references profiles(id) not null,
  org_id uuid references organizations(id) -- Nullable. If null, it's private.
);

-- 5. Enable RLS
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table workflows enable row level security;

-- --- RLS POLICIES ---

-- Workflows: Users can see their own private workflows
create policy "View own private workflows" on workflows
for select using (
  auth.uid() = owner_id and org_id is null
);

-- Workflows: Members can see Organization workflows
create policy "View org workflows" on workflows
for select using (
  exists (
    select 1 from organization_members
    where organization_members.org_id = workflows.org_id
    and organization_members.user_id = auth.uid()
  )
);

-- Workflows: Create/Update (simplified for brevity)
create policy "Enable insert for authenticated users" on workflows
for insert with check (auth.uid() = owner_id);

create policy "Enable update for owners and org members" on workflows
for update using (
  auth.uid() = owner_id 
  or exists (
    select 1 from organization_members
    where organization_members.org_id = workflows.org_id
    and organization_members.user_id = auth.uid()
  )
);
