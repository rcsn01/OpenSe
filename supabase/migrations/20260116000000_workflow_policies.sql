-- CATEGORY: Performance indexes (kept separate to avoid policy duplication)

create index if not exists workflows_created_at_idx on public.workflows(created_at);
create index if not exists workflow_executions_status_idx on public.workflow_executions(status);

-- CATEGORY: Tighten access to workflows and admin membership

-- Workflows: only owner (personal) or org members (org workflows)
drop policy if exists "workflows_select_unified" on public.workflows;

create policy "workflows_select_unified" on public.workflows
for select using (
	(org_id is null and owner_id = (select auth.uid()))
	or exists (
		select 1 from public.organisation_members om
		where om.org_id = public.workflows.org_id
			and om.user_id = (select auth.uid())
	)
);

-- Super admin members: only the user themself or other super admins can read
drop policy if exists "super_admin_members_select" on public.super_admin_members;

create policy "super_admin_members_select" on public.super_admin_members
for select using (
	user_id = (select auth.uid())
	or public.is_app_super_admin()
);
