-- ─── Personal Usage Stats RPC ─────────────────
-- Returns daily success/failure counts for the authenticated user's
-- personal workflows (where org_id IS NULL), last 30 days.

create or replace function public.get_personal_usage_stats()
returns table(
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
  return query
    select
      we.started_at::date as daily_date,
      count(*)::bigint as daily_total,
      count(*) filter (where we.status = 'success')::bigint as daily_success,
      count(*) filter (where we.status = 'failed')::bigint as daily_failed
    from workflow_executions we
    inner join workflows w on w.id = we.workflow_id
    where w.user_id = auth.uid()
      and w.org_id is null
      and we.started_at >= now() - interval '30 days'
    group by we.started_at::date
    order by daily_date;
end;
$$;

revoke all on function public.get_personal_usage_stats() from public;
grant execute on function public.get_personal_usage_stats() to authenticated;
