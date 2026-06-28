-- Remove the Open-KB Pages, Note, and Stickies feature surface.
-- This intentionally deletes page records, page history, page-scoped personal
-- rows, and sticky notes.

DELETE FROM open_kb.project_tabs
WHERE tab_key IN ('pages', 'note', 'drafts', 'modules', 'cycles');

ALTER TABLE open_kb.project_tabs
  DROP CONSTRAINT IF EXISTS project_tabs_tab_key_check;

ALTER TABLE open_kb.project_tabs
  ADD CONSTRAINT project_tabs_tab_key_check
  CHECK (tab_key IN (
    'overview',
    'list',
    'board',
    'timeline',
    'dashboard',
    'calendar',
    'workflow',
    'messages',
    'gantt',
    'workload',
    'files',
    'estimates',
    'settings'
  ));

CREATE OR REPLACE FUNCTION open_kb.validate_project_tab()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_project_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.metadata->>'required' = 'true' THEN
      RAISE EXCEPTION 'The required project tab cannot be removed';
    END IF;
    RETURN OLD;
  END IF;

  SELECT p.organisation_id
  INTO v_project_org_id
  FROM open_kb.projects p
  WHERE p.id = NEW.project_id
    AND p.deleted_at IS NULL;

  IF v_project_org_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB project % does not exist', NEW.project_id;
  END IF;

  IF v_project_org_id <> NEW.organisation_id THEN
    RAISE EXCEPTION 'Project tab organisation must match project organisation';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.tab_key <> OLD.tab_key THEN
    RAISE EXCEPTION 'Project tab keys cannot be changed';
  END IF;

  IF NEW.tab_key IN ('drafts', 'modules', 'cycles', 'pages', 'note') AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'This project tab is no longer supported';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.metadata->>'required' = 'true'
    AND COALESCE(NEW.metadata->>'required', 'false') <> 'true'
  THEN
    RAISE EXCEPTION 'Required project tabs cannot be made optional';
  END IF;

  IF NEW.metadata->>'required' = 'true' AND NEW.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'The required project tab cannot be removed';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION open_kb.create_default_project_tabs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
BEGIN
  INSERT INTO open_kb.project_tabs (organisation_id, project_id, tab_key, label, sort_order, metadata, created_by)
  VALUES
    (NEW.organisation_id, NEW.id, 'overview', 'Overview', 10, '{}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'list', 'List', 20, '{"required": true}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'settings', 'Settings', 80, '{}'::jsonb, NEW.created_by);

  RETURN NEW;
END;
$$;

DELETE FROM open_kb.role_permissions
WHERE permission_code IN ('pages.view', 'pages.manage');

DELETE FROM open_kb.app_permissions
WHERE code IN ('pages.view', 'pages.manage');

CREATE OR REPLACE FUNCTION open_kb.has_permission(p_org_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, open_kb
AS $$
BEGIN
  IF NOT open_kb.has_app_seat(p_org_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    WITH current_membership AS (
      SELECT om.id AS org_member_id, om.org_id, om.role AS org_role, omr.role_id
      FROM public.organisation_members om
      LEFT JOIN open_kb.organisation_member_roles omr
        ON omr.org_member_id = om.id
      WHERE om.org_id = p_org_id
        AND om.user_id = auth.uid()
    ),
    assigned_permissions AS (
      SELECT ap.code AS permission_code
      FROM current_membership cm
      JOIN open_kb.app_permissions ap ON TRUE
      WHERE cm.org_role = 'owner'
      UNION
      SELECT rp.permission_code
      FROM current_membership cm
      JOIN open_kb.role_permissions rp ON rp.role_id = cm.role_id
      WHERE cm.org_role <> 'owner'
    ),
    permission_edges(source_code, implied_code) AS (
      VALUES
        ('projects.create', 'projects.view'),
        ('projects.edit', 'projects.view'),
        ('projects.delete', 'projects.view'),
        ('projects.members.manage', 'projects.view'),
        ('issues.create', 'issues.view'),
        ('issues.edit', 'issues.view'),
        ('issues.delete', 'issues.view'),
        ('planning.manage', 'planning.view'),
        ('intake.manage', 'intake.view'),
        ('automation.manage', 'settings.view'),
        ('settings.roles.manage', 'settings.view'),
        ('settings.integrations.manage', 'settings.view'),
        ('analytics.view', 'dashboard.view'),
        ('projects.view', 'dashboard.view'),
        ('issues.view', 'dashboard.view')
    ),
    expanded_permissions AS (
      SELECT permission_code AS code
      FROM assigned_permissions
      UNION
      SELECT pe.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe ON pe.source_code = ap.permission_code
      UNION
      SELECT pe2.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
      JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
    )
    SELECT 1
    FROM expanded_permissions ep
    WHERE ep.code = p_permission_code
  );
END;
$$;

CREATE OR REPLACE VIEW open_kb.my_permissions
WITH (security_invoker = true)
AS
WITH current_membership AS (
  SELECT om.id AS org_member_id, om.org_id AS organisation_id, om.role AS org_role, omr.role_id
  FROM public.organisation_members om
  JOIN public.organisation_member_app_seats mas
    ON mas.org_member_id = om.id
   AND mas.app_code = 'open-kb'
  LEFT JOIN open_kb.organisation_member_roles omr
    ON omr.org_member_id = om.id
  WHERE om.user_id = auth.uid()
),
assigned_permissions AS (
  SELECT cm.organisation_id, ap.code AS permission_code
  FROM current_membership cm
  JOIN open_kb.app_permissions ap ON TRUE
  WHERE cm.org_role = 'owner'
  UNION
  SELECT cm.organisation_id, rp.permission_code
  FROM current_membership cm
  JOIN open_kb.role_permissions rp ON rp.role_id = cm.role_id
  WHERE cm.org_role <> 'owner'
),
permission_edges(source_code, implied_code) AS (
  VALUES
    ('projects.create', 'projects.view'),
    ('projects.edit', 'projects.view'),
    ('projects.delete', 'projects.view'),
    ('projects.members.manage', 'projects.view'),
    ('issues.create', 'issues.view'),
    ('issues.edit', 'issues.view'),
    ('issues.delete', 'issues.view'),
    ('planning.manage', 'planning.view'),
    ('intake.manage', 'intake.view'),
    ('automation.manage', 'settings.view'),
    ('settings.roles.manage', 'settings.view'),
    ('settings.integrations.manage', 'settings.view'),
    ('analytics.view', 'dashboard.view'),
    ('projects.view', 'dashboard.view'),
    ('issues.view', 'dashboard.view')
),
expanded_permissions AS (
  SELECT organisation_id, permission_code AS code
  FROM assigned_permissions
  UNION
  SELECT ap.organisation_id, pe.implied_code
  FROM assigned_permissions ap
  JOIN permission_edges pe ON pe.source_code = ap.permission_code
  UNION
  SELECT ap.organisation_id, pe2.implied_code
  FROM assigned_permissions ap
  JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
  JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
)
SELECT DISTINCT organisation_id, code
FROM expanded_permissions;

GRANT SELECT ON TABLE open_kb.my_permissions TO authenticated, service_role;

CREATE OR REPLACE FUNCTION open_kb.ensure_role(p_org_id UUID, p_name TEXT, p_rank INTEGER)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  INSERT INTO open_kb.roles (organisation_id, name, description, role_rank)
  VALUES (p_org_id, p_name, p_name || ' Open-KB role', p_rank)
  ON CONFLICT (organisation_id, name) DO UPDATE
    SET role_rank = EXCLUDED.role_rank
  RETURNING id INTO v_role_id;

  IF lower(p_name) = 'owner' THEN
    INSERT INTO open_kb.role_permissions (role_id, permission_code)
    SELECT v_role_id, code
    FROM open_kb.app_permissions
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  ELSIF lower(p_name) = 'default' THEN
    INSERT INTO open_kb.role_permissions (role_id, permission_code)
    VALUES
      (v_role_id, 'dashboard.view'),
      (v_role_id, 'projects.view'),
      (v_role_id, 'issues.view'),
      (v_role_id, 'planning.view'),
      (v_role_id, 'intake.view'),
      (v_role_id, 'analytics.view'),
      (v_role_id, 'settings.view')
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  RETURN v_role_id;
END;
$$;

DELETE FROM open_kb.user_favorites
WHERE name = 'page'
   OR page_id IS NOT NULL;

DELETE FROM open_kb.user_recent_visits
WHERE name = 'page'
   OR page_id IS NOT NULL;

DO $$
DECLARE
  table_name TEXT;
  table_names TEXT[] := ARRAY[
    'project_member_invites',
    'project_identifiers',
    'project_deploy_boards',
    'project_public_members',
    'project_user_properties',
    'organisation_themes',
    'organisation_user_properties',
    'organisation_user_links',
    'organisation_home_preferences',
    'organisation_user_preferences',
    'teams',
    'issue_blockers',
    'issue_relations',
    'issue_mentions',
    'issue_assignees',
    'issue_links',
    'issue_attachments',
    'issue_activities',
    'issue_comments',
    'issue_labels',
    'issue_subscribers',
    'issue_reactions',
    'comment_reactions',
    'issue_votes',
    'issue_versions',
    'issue_description_versions',
    'project_issue_types',
    'cycle_issues',
    'cycle_user_properties',
    'module_members',
    'module_issues',
    'module_links',
    'module_user_properties',
    'estimate_points',
    'draft_issues',
    'draft_issue_assignees',
    'draft_issue_labels',
    'draft_issue_modules',
    'draft_issue_cycles',
    'descriptions',
    'description_versions',
    'issue_views',
    'analytic_views',
    'user_favorites',
    'user_recent_visits',
    'intakes',
    'intake_issues',
    'deploy_boards',
    'importers',
    'exporters',
    'file_assets',
    'notifications',
    'user_notification_preferences',
    'email_notification_logs',
    'webhooks',
    'webhook_logs',
    'project_webhooks',
    'integrations',
    'organisation_integrations',
    'github_repositories',
    'github_repository_syncs',
    'github_issue_syncs',
    'github_comment_syncs',
    'slack_project_syncs',
    'api_activity_logs'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names LOOP
    IF to_regclass(format('open_kb.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('DELETE FROM open_kb.%I WHERE page_id IS NOT NULL', table_name);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS teams_insert ON open_kb.teams;
DROP POLICY IF EXISTS teams_update ON open_kb.teams;
DROP POLICY IF EXISTS project_deploy_boards_insert ON open_kb.project_deploy_boards;
DROP POLICY IF EXISTS project_deploy_boards_update ON open_kb.project_deploy_boards;
DROP POLICY IF EXISTS user_favorites_insert ON open_kb.user_favorites;
DROP POLICY IF EXISTS user_recent_visits_insert ON open_kb.user_recent_visits;
DROP POLICY IF EXISTS stickies_select ON open_kb.stickies;
DROP POLICY IF EXISTS stickies_insert ON open_kb.stickies;
DROP POLICY IF EXISTS stickies_update ON open_kb.stickies;
DROP POLICY IF EXISTS stickies_delete ON open_kb.stickies;
DROP POLICY IF EXISTS draft_issues_insert ON open_kb.draft_issues;
DROP POLICY IF EXISTS draft_issues_update ON open_kb.draft_issues;
DROP POLICY IF EXISTS webhooks_insert ON open_kb.webhooks;
DROP POLICY IF EXISTS webhooks_update ON open_kb.webhooks;
DROP POLICY IF EXISTS project_webhooks_insert ON open_kb.project_webhooks;
DROP POLICY IF EXISTS project_webhooks_update ON open_kb.project_webhooks;
DROP POLICY IF EXISTS organisation_integrations_insert ON open_kb.organisation_integrations;
DROP POLICY IF EXISTS organisation_integrations_update ON open_kb.organisation_integrations;
DROP POLICY IF EXISTS github_repositories_insert ON open_kb.github_repositories;
DROP POLICY IF EXISTS github_repositories_update ON open_kb.github_repositories;
DROP POLICY IF EXISTS slack_project_syncs_insert ON open_kb.slack_project_syncs;
DROP POLICY IF EXISTS slack_project_syncs_update ON open_kb.slack_project_syncs;

DROP POLICY IF EXISTS "Open-KB editors can manage assets" ON storage.objects;

DROP TABLE IF EXISTS open_kb.page_versions CASCADE;
DROP TABLE IF EXISTS open_kb.project_pages CASCADE;
DROP TABLE IF EXISTS open_kb.page_logs CASCADE;
DROP TABLE IF EXISTS open_kb.page_labels CASCADE;
DROP TABLE IF EXISTS open_kb.stickies CASCADE;

DO $$
DECLARE
  target_table RECORD;
BEGIN
  FOR target_table IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'open_kb'
      AND column_name = 'page_id'
  LOOP
    EXECUTE format('ALTER TABLE open_kb.%I DROP COLUMN page_id CASCADE', target_table.table_name);
  END LOOP;
END $$;

DROP TABLE IF EXISTS open_kb.pages CASCADE;

ALTER TABLE open_kb.user_favorites
  DROP CONSTRAINT IF EXISTS open_kb_user_favorites_name_check,
  ADD CONSTRAINT open_kb_user_favorites_name_check
  CHECK (name IN ('project', 'issue'));

ALTER TABLE open_kb.user_recent_visits
  DROP CONSTRAINT IF EXISTS open_kb_user_recent_visits_name_check,
  ADD CONSTRAINT open_kb_user_recent_visits_name_check
  CHECK (name IN ('project', 'issue'));

ALTER TABLE open_kb.webhooks
  ADD CONSTRAINT open_kb_webhooks_scope_check
  CHECK (project_id IS NULL AND issue_id IS NULL);

ALTER TABLE open_kb.webhook_logs
  ADD CONSTRAINT open_kb_webhook_logs_scope_check
  CHECK (issue_id IS NULL);

ALTER TABLE open_kb.organisation_integrations
  ADD CONSTRAINT open_kb_organisation_integrations_scope_check
  CHECK (project_id IS NULL AND issue_id IS NULL);

ALTER TABLE open_kb.github_repositories
  ADD CONSTRAINT open_kb_github_repositories_scope_check
  CHECK (issue_id IS NULL);

ALTER TABLE open_kb.github_repository_syncs
  ADD CONSTRAINT open_kb_github_repository_syncs_scope_check
  CHECK (issue_id IS NULL);

ALTER TABLE open_kb.slack_project_syncs
  ADD CONSTRAINT open_kb_slack_project_syncs_scope_check
  CHECK (
    project_id IS NOT NULL
    AND (sync_direction = 'outbound' OR issue_id IS NULL)
  );

ALTER TABLE open_kb.draft_issues
  ADD CONSTRAINT open_kb_draft_issues_scope_check
  CHECK (issue_id IS NULL AND project_id IS NOT NULL);

ALTER TABLE open_kb.teams
  ADD CONSTRAINT open_kb_teams_scope_check
  CHECK (project_id IS NULL AND issue_id IS NULL);

ALTER TABLE open_kb.project_deploy_boards
  ADD CONSTRAINT open_kb_project_deploy_boards_scope_check
  CHECK (project_id IS NOT NULL AND issue_id IS NULL);

CREATE POLICY teams_insert ON open_kb.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND project_id IS NULL
    AND issue_id IS NULL
  );

CREATE POLICY teams_update ON open_kb.teams
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'projects.edit'))
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND project_id IS NULL
    AND issue_id IS NULL
  );

CREATE POLICY project_deploy_boards_insert ON open_kb.project_deploy_boards
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY project_deploy_boards_update ON open_kb.project_deploy_boards
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY user_favorites_insert ON open_kb.user_favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
    AND (
      (
        name = 'project'
        AND project_id IS NOT NULL
        AND issue_id IS NULL
        AND open_kb.has_project_access(project_id)
      )
      OR (
        name = 'issue'
        AND project_id IS NOT NULL
        AND issue_id IS NOT NULL
        AND open_kb.has_permission(organisation_id, 'issues.view')
        AND open_kb.has_project_access(project_id)
      )
    )
  );

CREATE POLICY user_recent_visits_insert ON open_kb.user_recent_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_app_seat(organisation_id)
    AND (
      (
        name = 'project'
        AND project_id IS NOT NULL
        AND issue_id IS NULL
        AND open_kb.has_project_access(project_id)
      )
      OR (
        name = 'issue'
        AND project_id IS NOT NULL
        AND issue_id IS NOT NULL
        AND open_kb.has_permission(organisation_id, 'issues.view')
        AND open_kb.has_project_access(project_id)
      )
    )
  );

CREATE POLICY draft_issues_insert ON open_kb.draft_issues
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY draft_issues_update ON open_kb.draft_issues
  FOR UPDATE TO authenticated
  USING (
    profile_id = auth.uid()
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    profile_id = auth.uid()
    AND issue_id IS NULL
    AND project_id IS NOT NULL
    AND open_kb.has_permission(organisation_id, 'issues.create')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY webhooks_insert ON open_kb.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND status IN ('active', 'paused', 'disabled')
    AND url ~* '^https://'
  );

CREATE POLICY webhooks_update ON open_kb.webhooks
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'automation.manage'))
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND status IN ('active', 'paused', 'disabled')
    AND url ~* '^https://'
  );

CREATE POLICY project_webhooks_insert ON open_kb.project_webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY project_webhooks_update ON open_kb.project_webhooks
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY organisation_integrations_insert ON open_kb.organisation_integrations
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND (
      (provider = 'github' AND EXISTS (SELECT 1 FROM open_kb.feature_flags ff WHERE ff.organisation_id = organisation_integrations.organisation_id AND ff.github_sync_enabled))
      OR
      (provider = 'slack' AND EXISTS (SELECT 1 FROM open_kb.feature_flags ff WHERE ff.organisation_id = organisation_integrations.organisation_id AND ff.slack_sync_enabled))
    )
  );

CREATE POLICY organisation_integrations_update ON open_kb.organisation_integrations
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
  );

CREATE POLICY github_repositories_insert ON open_kb.github_repositories
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND issue_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM open_kb.feature_flags ff
      WHERE ff.organisation_id = github_repositories.organisation_id
        AND ff.github_sync_enabled
    )
  );

CREATE POLICY github_repositories_update ON open_kb.github_repositories
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND issue_id IS NULL
  );

CREATE POLICY slack_project_syncs_insert ON open_kb.slack_project_syncs
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM open_kb.feature_flags ff
      WHERE ff.organisation_id = slack_project_syncs.organisation_id
        AND ff.slack_sync_enabled
    )
  );

CREATE POLICY slack_project_syncs_update ON open_kb.slack_project_syncs
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY "Open-KB editors can manage assets" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'open-kb-assets'
    AND (
      open_kb.has_permission((storage.foldername(name))[1]::uuid, 'issues.edit')
      OR open_kb.has_permission((storage.foldername(name))[1]::uuid, 'projects.edit')
    )
  )
  WITH CHECK (
    bucket_id = 'open-kb-assets'
    AND (
      open_kb.has_permission((storage.foldername(name))[1]::uuid, 'issues.edit')
      OR open_kb.has_permission((storage.foldername(name))[1]::uuid, 'projects.edit')
    )
  );
