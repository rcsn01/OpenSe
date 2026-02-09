-- CATEGORY: Authenticated user privileges

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.organisations to authenticated;
grant select, insert, update, delete on public.organisation_members to authenticated;
grant select, insert, update, delete on public.workflows to authenticated;
grant select on public.workflow_executions to authenticated;
grant select, update on public.super_admin_members to authenticated;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;