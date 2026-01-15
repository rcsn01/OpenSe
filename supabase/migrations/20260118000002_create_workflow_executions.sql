create table if not exists public.workflow_executions (
  id uuid default gen_random_uuid() primary key,
  workflow_id uuid references public.workflows(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  org_id uuid references public.organizations(id) on delete cascade,
  status text check (status in ('success', 'failed', 'running')) not null,
  started_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  error_message text
);

alter table public.workflow_executions enable row level security;

-- Policy: Users can log their own runs
create policy "Users can insert own executions" on public.workflow_executions
  for insert with check (auth.uid() = user_id);

-- Policy: Users can view runs they performed
create policy "Users can view own executions" on public.workflow_executions
  for select using (auth.uid() = user_id);

-- Policy: Organization members can view runs associated with their org
create policy "Org members can view org executions" on public.workflow_executions
  for select using (
    exists (
      select 1 from public.organization_members
      where organization_members.org_id = workflow_executions.org_id
      and organization_members.user_id = auth.uid()
    )
  );
