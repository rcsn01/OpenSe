-- CATEGORY: Performance indexes (kept separate to avoid policy duplication)

create index if not exists workflows_created_at_idx on public.workflows(created_at);
create index if not exists workflow_executions_status_idx on public.workflow_executions(status);
