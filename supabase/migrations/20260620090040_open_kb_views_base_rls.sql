-- Open-KB permission view, generic grants, and base role RLS.

CREATE VIEW open_kb.my_permissions
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
    ('pages.manage', 'pages.view'),
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

DO $$
DECLARE
  table_name TEXT;
  org_tables TEXT[];
BEGIN
  SELECT array_agg(tablename::TEXT ORDER BY tablename::TEXT)
  INTO org_tables
  FROM pg_tables
  WHERE schemaname = 'open_kb'
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
      'stickies',
      'draft_issues'
    );

  FOREACH table_name IN ARRAY org_tables LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON open_kb.%I FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at)', 'handle_' || table_name || '_updated_at', table_name);
    EXECUTE format('ALTER TABLE open_kb.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE open_kb.%I TO authenticated', table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE open_kb.%I TO service_role', table_name);
    EXECUTE format('CREATE POLICY %I ON open_kb.%I FOR SELECT TO authenticated USING (open_kb.has_app_seat(organisation_id))', table_name || '_select', table_name);
  END LOOP;
END $$;

ALTER TABLE open_kb.integration_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE open_kb.integration_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE open_kb.integration_credentials TO service_role;

ALTER TABLE open_kb.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_kb.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_kb.organisation_member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_permissions_select ON open_kb.app_permissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY role_permissions_select ON open_kb.role_permissions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM open_kb.roles r
      WHERE r.id = role_permissions.role_id
        AND open_kb.has_app_seat(r.organisation_id)
    )
  );

CREATE POLICY role_permissions_manage ON open_kb.role_permissions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM open_kb.roles r
      WHERE r.id = role_permissions.role_id
        AND open_kb.has_permission(r.organisation_id, 'settings.roles.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM open_kb.roles r
      WHERE r.id = role_permissions.role_id
        AND open_kb.has_permission(r.organisation_id, 'settings.roles.manage')
    )
  );

CREATE POLICY organisation_member_roles_select ON open_kb.organisation_member_roles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND open_kb.has_app_seat(om.org_id)
    )
  );

CREATE POLICY organisation_member_roles_manage ON open_kb.organisation_member_roles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND open_kb.has_permission(om.org_id, 'settings.roles.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND open_kb.has_permission(om.org_id, 'settings.roles.manage')
    )
  );
