-- CATEGORY: Super Admin Usage Statistics RPCs
-- Provides aggregate workflow execution stats for super admin dashboard

-- 1. RPC: Get organization usage stats
-- Returns success/failed/total workflow execution counts for an organization
create or replace function public.get_org_usage_stats(target_org_id uuid)
returns table(success_count bigint, failed_count bigint, total_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  return query
  select
    count(*) filter (where status = 'success') as success_count,
    count(*) filter (where status = 'failed') as failed_count,
    count(*) as total_count
  from public.workflow_executions
  where org_id = target_org_id;
end;
$$;

revoke all on function public.get_org_usage_stats(uuid) from public;
grant execute on function public.get_org_usage_stats(uuid) to authenticated;

-- 2. RPC: Get user usage stats
-- Returns personal vs org workflow execution counts for a user
create or replace function public.get_user_usage_stats(target_user_id uuid)
returns table(
  personal_success bigint,
  personal_failed bigint, 
  org_success bigint,
  org_failed bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  return query
  select
    count(*) filter (where org_id is null and status = 'success') as personal_success,
    count(*) filter (where org_id is null and status = 'failed') as personal_failed,
    count(*) filter (where org_id is not null and status = 'success') as org_success,
    count(*) filter (where org_id is not null and status = 'failed') as org_failed
  from public.workflow_executions
  where user_id = target_user_id;
end;
$$;

revoke all on function public.get_user_usage_stats(uuid) from public;
grant execute on function public.get_user_usage_stats(uuid) to authenticated;

-- 3. RPC: Get all org usage stats in bulk (more efficient for dashboard)
-- Returns usage stats for all organizations in one query
create or replace function public.get_all_orgs_usage_stats()
returns table(
  org_id uuid,
  success_count bigint,
  failed_count bigint,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  return query
  select
    we.org_id,
    count(*) filter (where we.status = 'success') as success_count,
    count(*) filter (where we.status = 'failed') as failed_count,
    count(*) as total_count
  from public.workflow_executions we
  where we.org_id is not null
  group by we.org_id;
end;
$$;

revoke all on function public.get_all_orgs_usage_stats() from public;
grant execute on function public.get_all_orgs_usage_stats() to authenticated;

-- 4. RPC: Get all user usage stats in bulk
-- Returns usage stats for all users in one query
create or replace function public.get_all_users_usage_stats()
returns table(
  user_id uuid,
  personal_success bigint,
  personal_failed bigint,
  org_success bigint,
  org_failed bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_super_admin() then
    raise exception 'Access denied: Super Admin only';
  end if;

  return query
  select
    we.user_id,
    count(*) filter (where we.org_id is null and we.status = 'success') as personal_success,
    count(*) filter (where we.org_id is null and we.status = 'failed') as personal_failed,
    count(*) filter (where we.org_id is not null and we.status = 'success') as org_success,
    count(*) filter (where we.org_id is not null and we.status = 'failed') as org_failed
  from public.workflow_executions we
  group by we.user_id;
end;
$$;

revoke all on function public.get_all_users_usage_stats() from public;
grant execute on function public.get_all_users_usage_stats() to authenticated;

-- 5. Add super admin select policy on workflow_executions if not exists
-- This allows super admins to query execution data directly if needed
drop policy if exists "workflow_executions_super_admin_select" on public.workflow_executions;

create policy "workflow_executions_super_admin_select" on public.workflow_executions
for select using (public.is_app_super_admin());
