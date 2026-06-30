-- Open-KB permission view, generic grants, and base role RLS.

CREATE VIEW kb.my_permissions
WITH (security_invoker = true)
AS
WITH current_membership AS (
  SELECT om.id AS org_member_id, om.org_id AS organisation_id, om.role AS org_role, omr.role_id
  FROM public.organisation_members om
  JOIN public.organisation_member_app_seats mas
    ON mas.org_member_id = om.id
   AND mas.app_code = 'open-kb'
  LEFT JOIN kb.organisation_member_roles omr
    ON omr.org_member_id = om.id
  WHERE om.user_id = auth.uid()
),
assigned_permissions AS (
  SELECT cm.organisation_id, ap.code AS permission_code
  FROM current_membership cm
  JOIN kb.app_permissions ap ON TRUE
  WHERE cm.org_role = 'owner'
  UNION
  SELECT cm.organisation_id, rp.permission_code
  FROM current_membership cm
  JOIN kb.role_permissions rp ON rp.role_id = cm.role_id
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

CREATE VIEW kb.public_deploy_boards
WITH (security_invoker = true)
AS
SELECT
  b.id AS board_id,
  b.organisation_id,
  b.project_id,
  b.slug,
  COALESCE(b.title, b.name, p.name) AS title,
  b.description_text,
  b.status,
  b.payload,
  p.name AS project_name,
  p.identifier AS project_identifier,
  p.description_text AS project_description_text
FROM kb.project_deploy_boards b
JOIN kb.projects p
  ON p.id = b.project_id
 AND p.organisation_id = b.organisation_id
WHERE b.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.visibility = 'public'
  AND COALESCE(b.status, 'active') = 'active';

CREATE VIEW kb.public_deploy_board_issues
WITH (security_invoker = true)
AS
SELECT
  b.slug,
  i.id AS issue_id,
  i.project_id,
  i.sequence_id,
  i.title,
  i.description_text,
  i.priority,
  i.state_id,
  s.name AS state_name,
  s.group_key AS state_group_key,
  s.color AS state_color,
  COALESCE(s.sort_order, 9999) AS state_sort_order,
  i.start_date,
  i.target_date,
  i.completed_at,
  i.created_at,
  i.updated_at
FROM kb.project_deploy_boards b
JOIN kb.projects p
  ON p.id = b.project_id
 AND p.organisation_id = b.organisation_id
JOIN kb.issues i
  ON i.project_id = b.project_id
 AND i.organisation_id = b.organisation_id
LEFT JOIN kb.states s ON s.id = i.state_id
WHERE b.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND p.visibility = 'public'
  AND COALESCE(b.status, 'active') = 'active'
  AND i.deleted_at IS NULL
  AND i.archived_at IS NULL;

DO $$
DECLARE
  table_name TEXT;
  org_tables TEXT[];
BEGIN
  SELECT array_agg(tablename::TEXT ORDER BY tablename::TEXT)
  INTO org_tables
  FROM pg_tables
  WHERE schemaname = 'kb'
    AND tablename NOT IN (
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
      'workflow_rules',
      'workflow_rule_actions'
    );

  FOREACH table_name IN ARRAY org_tables LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON kb.%I FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at)', 'handle_' || table_name || '_updated_at', table_name);
    EXECUTE format('ALTER TABLE kb.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE kb.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE kb.%I TO service_role', table_name);
    EXECUTE format('CREATE POLICY %I ON kb.%I FOR SELECT TO authenticated USING (kb.has_app_seat(organisation_id))', table_name || '_select', table_name);
  END LOOP;
END $$;

ALTER TABLE kb.integration_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE kb.integration_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE kb.integration_credentials TO service_role;

ALTER TABLE kb.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.organisation_member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_permissions_select ON kb.app_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY role_permissions_select ON kb.role_permissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM kb.roles r
      WHERE r.id = role_permissions.role_id
        AND kb.has_app_seat(r.organisation_id)
    )
  );

CREATE POLICY role_permissions_manage ON kb.role_permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM kb.roles r
      WHERE r.id = role_permissions.role_id
        AND kb.has_permission(r.organisation_id, 'settings.roles.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM kb.roles r
      WHERE r.id = role_permissions.role_id
        AND kb.has_permission(r.organisation_id, 'settings.roles.manage')
    )
  );

CREATE POLICY organisation_member_roles_select ON kb.organisation_member_roles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND kb.has_app_seat(om.org_id)
    )
  );

CREATE POLICY organisation_member_roles_manage ON kb.organisation_member_roles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND kb.has_permission(om.org_id, 'settings.roles.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND kb.has_permission(om.org_id, 'settings.roles.manage')
    )
  );
