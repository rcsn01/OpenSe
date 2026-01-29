-- 16. REPORT SCHEDULES
create table if not exists public.report_schedules (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  report_type text not null,
  cadence text check (cadence in ('daily', 'weekly', 'monthly')) not null,
  day_of_week integer, -- 0 (Sunday) - 6 (Saturday) for weekly schedules
  day_of_month integer, -- 1-31 for monthly schedules
  time_of_day time,
  recipients text[] default '{}'::text[],
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_report_schedules_company on public.report_schedules(company_id);

alter table public.report_schedules enable row level security;

create policy "Members can view report schedules" on public.report_schedules
  for select using (has_permission(company_id, 'transactions.view'));

create policy "Admins can manage report schedules" on public.report_schedules
  for all using (has_permission(company_id, 'company.manage'))
  with check (has_permission(company_id, 'company.manage'));
