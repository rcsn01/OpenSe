-- =====================================================
-- Migration: Workflow Versioning + Notification Settings
-- =====================================================

-- ─── 1. WORKFLOW VERSIONS TABLE ──────────────────────

create table if not exists public.workflow_versions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  version_number integer not null,
  graph_data jsonb not null,
  name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  change_summary text,

  unique(workflow_id, version_number)
);

alter table public.workflow_versions enable row level security;

-- RLS: Users can view versions of workflows they can view
create policy "versions_select" on public.workflow_versions for select
  using (
    exists (
      select 1 from public.workflows w
      where w.id = workflow_versions.workflow_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.organisation_members om
            where om.org_id = w.org_id and om.user_id = auth.uid()
          )
          or public.is_app_super_admin()
        )
    )
  );

-- RLS: Users can insert versions for workflows they own or are members of
create policy "versions_insert" on public.workflow_versions for insert
  with check (
    exists (
      select 1 from public.workflows w
      where w.id = workflow_versions.workflow_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.organisation_members om
            where om.org_id = w.org_id and om.user_id = auth.uid()
          )
        )
    )
  );

-- Grants
grant select, insert on public.workflow_versions to authenticated;

-- ─── 2. NOTIFICATION SETTINGS TABLE ─────────────────

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  channel text not null check (channel in ('email', 'slack', 'webhook')),
  enabled boolean not null default true,
  config jsonb not null default '{}',
  -- email: { "recipients": ["a@b.com"] }
  -- slack: { "webhook_url": "https://hooks.slack.com/..." }
  -- webhook: { "url": "https://...", "method": "POST", "headers": {} }
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(workflow_id, channel)
);

alter table public.notification_settings enable row level security;

-- RLS: Same access as the parent workflow
create policy "notifications_select" on public.notification_settings for select
  using (
    exists (
      select 1 from public.workflows w
      where w.id = notification_settings.workflow_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.organisation_members om
            where om.org_id = w.org_id and om.user_id = auth.uid()
          )
          or public.is_app_super_admin()
        )
    )
  );

create policy "notifications_insert" on public.notification_settings for insert
  with check (
    exists (
      select 1 from public.workflows w
      where w.id = notification_settings.workflow_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.organisation_members om
            where om.org_id = w.org_id and om.user_id = auth.uid()
          )
        )
    )
  );

create policy "notifications_update" on public.notification_settings for update
  using (
    exists (
      select 1 from public.workflows w
      where w.id = notification_settings.workflow_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.organisation_members om
            where om.org_id = w.org_id and om.user_id = auth.uid()
          )
        )
    )
  );

create policy "notifications_delete" on public.notification_settings for delete
  using (
    exists (
      select 1 from public.workflows w
      where w.id = notification_settings.workflow_id
        and (
          w.owner_id = auth.uid()
          or exists (
            select 1 from public.organisation_members om
            where om.org_id = w.org_id and om.user_id = auth.uid()
          )
        )
    )
  );

grant select, insert, update, delete on public.notification_settings to authenticated;

-- ─── 3. ORG-LEVEL USAGE STATS RPCs ─────────────────

-- RPC: Get usage stats for a specific org (callable by any org member)
create or replace function public.get_org_member_usage_stats(target_org_id uuid)
returns table(
  total_count bigint,
  success_count bigint,
  failed_count bigint,
  daily_date date,
  daily_total bigint,
  daily_success bigint,
  daily_failed bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify caller is a member of this org
  if not exists (
    select 1 from organisation_members om
    where om.org_id = target_org_id and om.user_id = auth.uid()
  ) and not exists (
    select 1 from organisations o
    where o.id = target_org_id and o.owner_id = auth.uid()
  ) and not public.is_app_super_admin() then
    raise exception 'Access denied';
  end if;

  return query
    select
      count(*)::bigint as total_count,
      count(*) filter (where we.status = 'success')::bigint as success_count,
      count(*) filter (where we.status = 'failed')::bigint as failed_count,
      we.started_at::date as daily_date,
      count(*)::bigint as daily_total,
      count(*) filter (where we.status = 'success')::bigint as daily_success,
      count(*) filter (where we.status = 'failed')::bigint as daily_failed
    from workflow_executions we
    inner join workflows w on w.id = we.workflow_id
    where w.org_id = target_org_id
      and we.started_at >= now() - interval '30 days'
    group by we.started_at::date
    order by daily_date;
end;
$$;

revoke all on function public.get_org_member_usage_stats(uuid) from public;
grant execute on function public.get_org_member_usage_stats(uuid) to authenticated;

-- RPC: Get active users for an org
create or replace function public.get_org_active_users(target_org_id uuid)
returns table(
  user_id uuid,
  email text,
  full_name text,
  execution_count bigint,
  last_active timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from organisation_members om
    where om.org_id = target_org_id and om.user_id = auth.uid()
  ) and not exists (
    select 1 from organisations o
    where o.id = target_org_id and o.owner_id = auth.uid()
  ) and not public.is_app_super_admin() then
    raise exception 'Access denied';
  end if;

  return query
    select
      we.user_id,
      p.email,
      p.full_name,
      count(*)::bigint as execution_count,
      max(we.started_at) as last_active
    from workflow_executions we
    inner join workflows w on w.id = we.workflow_id
    inner join profiles p on p.id = we.user_id
    where w.org_id = target_org_id
      and we.started_at >= now() - interval '30 days'
    group by we.user_id, p.email, p.full_name
    order by execution_count desc;
end;
$$;

revoke all on function public.get_org_active_users(uuid) from public;
grant execute on function public.get_org_active_users(uuid) to authenticated;
