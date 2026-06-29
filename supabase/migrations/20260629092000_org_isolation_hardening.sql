-- Organisation isolation hardening.
--
-- 1. Open-KB: align project-scoped reads with writes. The generic per-table
--    SELECT policy created in 20260620090040 only checked
--    kb.has_app_seat(organisation_id), so any seat-holder could read every
--    project's rows -- including projects they are not members of. Reads are
--    tightened to additionally require kb.has_project_access(project_id) for
--    project-scoped rows. Org-level rows (project_id IS NULL) stay org-visible,
--    and users holding 'projects.view' are unaffected (has_project_access still
--    returns true for them).
-- 2. ETL: ensure the shared global-template read branch can never expose an
--    organisation-scoped workflow.

-- 1. Open-KB project-scoped read tightening.
--
-- Only the generic loop-generated "<table>_select" policies are rewritten:
--   * the policy name must be exactly "<table>_select",
--   * the table must carry a project_id column, and
--   * the existing USING clause must be the bare kb.has_app_seat(organisation_id)
--     predicate (no auth.uid()/has_permission()/has_project_access() already).
-- Tables with bespoke select policies (notifications, issue_mentions, teams,
-- project_tabs, project_messages, deploy boards, provider/sync tables, etc.)
-- are excluded by name and by the predicate guards so they keep their own rules.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT pol.tablename
    FROM pg_policies pol
    WHERE pol.schemaname = 'kb'
      AND pol.cmd = 'SELECT'
      AND pol.policyname = pol.tablename || '_select'
      AND pol.tablename NOT IN (
        'app_permissions',
        'role_permissions',
        'organisation_member_roles',
        'integration_credentials',
        'api_tokens',
        'webhooks',
        'project_webhooks',
        'webhook_logs',
        'integrations',
        'organisation_integrations',
        'github_repositories',
        'github_repository_syncs',
        'github_issue_syncs',
        'github_comment_syncs',
        'slack_project_syncs',
        'teams',
        'project_deploy_boards',
        'notifications',
        'user_notification_preferences',
        'issue_mentions',
        'user_favorites',
        'user_recent_visits',
        'draft_issues',
        'project_tabs',
        'project_messages',
        'team_members',
        'roles',
        'feature_flags'
      )
      AND pol.qual IS NOT NULL
      AND pol.qual ILIKE '%has_app_seat(organisation_id)%'
      AND pol.qual NOT ILIKE '%has_project_access%'
      AND pol.qual NOT ILIKE '%has_permission%'
      AND pol.qual NOT ILIKE '%auth.uid%'
      AND pol.qual NOT ILIKE '%profile_id%'
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns col
        WHERE col.table_schema = 'kb'
          AND col.table_name = pol.tablename
          AND col.column_name = 'project_id'
      )
  LOOP
    -- ALTER POLICY edits the existing policy in place, preserving its command
    -- (SELECT) and role (authenticated) and only swapping the USING predicate.
    EXECUTE format(
      'ALTER POLICY %I ON kb.%I USING (kb.has_app_seat(organisation_id) AND (project_id IS NULL OR kb.has_project_access(project_id)))',
      rec.tablename || '_select',
      rec.tablename
    );
  END LOOP;
END $$;

-- kb.projects has no project_id column; gate reads on project access directly.
-- kb.has_project_access already requires an open-kb seat in the project's org.
ALTER POLICY projects_select ON kb.projects
  USING (kb.has_project_access(id));

-- 2. ETL global-template read tightening.
-- Shared templates are global (org_id IS NULL); constrain the template read
-- branch so an organisation-scoped workflow can never be exposed through it.
ALTER POLICY workflows_select_unified ON etl.workflows
  USING (
    (is_template = true AND org_id IS NULL)
    OR (org_id IS NULL AND owner_id = auth.uid())
    OR app_private.has_etl_permission(org_id, 'workflows.view')
  );
