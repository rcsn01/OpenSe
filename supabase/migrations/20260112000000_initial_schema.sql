-- CATEGORY: Base schema (tables, constraints, RLS enablement)
-- This file is idempotent and safe to rerun during a full reset.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (linked 1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Organizations
create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  owner_id uuid not null references public.profiles(id)
);

-- Organization members (many-to-many)
create table if not exists public.organization_members (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  unique (org_id, user_id)
);
create index if not exists organization_members_org_idx on public.organization_members(org_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);

-- Workflows (includes template support)
create table if not exists public.workflows (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  graph_data jsonb,
  owner_id uuid not null references public.profiles(id),
  org_id uuid references public.organizations(id) on delete cascade,
  is_template boolean default false
);
create index if not exists workflows_org_idx on public.workflows(org_id);
create index if not exists workflows_owner_idx on public.workflows(owner_id);
create index if not exists workflows_is_template_idx on public.workflows(is_template) where is_template = true;

-- Super admin membership table (separate from profiles)
create table if not exists public.super_admin_members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Workflow executions (per-run audit)
create table if not exists public.workflow_executions (
  id uuid default gen_random_uuid() primary key,
  workflow_id uuid references public.workflows(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  status text not null check (status in ('success', 'failed', 'running')),
  started_at timestamptz default timezone('utc'::text, now()) not null,
  completed_at timestamptz,
  error_message text
);
create index if not exists workflow_executions_org_idx on public.workflow_executions(org_id);
create index if not exists workflow_executions_user_idx on public.workflow_executions(user_id);
create index if not exists workflow_executions_workflow_idx on public.workflow_executions(workflow_id);

-- Covering index for organizations.owner_id FK
create index if not exists organizations_owner_idx on public.organizations(owner_id);

-- Enable RLS (policies are defined in later migration)
alter table if exists public.profiles enable row level security;
alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.workflows enable row level security;
alter table if exists public.workflow_executions enable row level security;
alter table if exists public.super_admin_members enable row level security;