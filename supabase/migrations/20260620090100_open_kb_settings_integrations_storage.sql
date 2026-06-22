-- Open-KB settings, automation, integration, provider sync, and storage RLS.

CREATE POLICY roles_manage ON open_kb.roles
  FOR ALL TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.roles.manage'))
  WITH CHECK (open_kb.has_permission(organisation_id, 'settings.roles.manage'));

CREATE POLICY feature_flags_update ON open_kb.feature_flags
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY api_tokens_select ON open_kb.api_tokens
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND open_kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY api_tokens_insert ON open_kb.api_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND open_kb.has_permission(organisation_id, 'automation.manage')
    AND EXISTS (
      SELECT 1
      FROM open_kb.feature_flags ff
      WHERE ff.organisation_id = api_tokens.organisation_id
        AND ff.api_tokens_enabled
    )
  );

CREATE POLICY api_tokens_update ON open_kb.api_tokens
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() AND open_kb.has_permission(organisation_id, 'automation.manage'))
  WITH CHECK (profile_id = auth.uid() AND open_kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY api_tokens_delete ON open_kb.api_tokens
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid() AND open_kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY webhooks_select ON open_kb.webhooks
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY webhooks_insert ON open_kb.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND page_id IS NULL
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
    AND page_id IS NULL
    AND status IN ('active', 'paused', 'disabled')
    AND url ~* '^https://'
  );

CREATE POLICY webhooks_delete ON open_kb.webhooks
  FOR DELETE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY project_webhooks_select ON open_kb.project_webhooks
  FOR SELECT TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_webhooks_insert ON open_kb.project_webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
    AND page_id IS NULL
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
    AND page_id IS NULL
  );

CREATE POLICY project_webhooks_delete ON open_kb.project_webhooks
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'automation.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY webhook_logs_select ON open_kb.webhook_logs
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'automation.manage'));


CREATE POLICY integrations_select ON open_kb.integrations
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY integrations_insert ON open_kb.integrations
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND provider IN ('github', 'slack')
  );

CREATE POLICY integrations_update ON open_kb.integrations
  FOR UPDATE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND provider IN ('github', 'slack')
  );

CREATE POLICY integrations_delete ON open_kb.integrations
  FOR DELETE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY organisation_integrations_select ON open_kb.organisation_integrations
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY organisation_integrations_insert ON open_kb.organisation_integrations
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND page_id IS NULL
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
    AND page_id IS NULL
  );

CREATE POLICY organisation_integrations_delete ON open_kb.organisation_integrations
  FOR DELETE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_repositories_select ON open_kb.github_repositories
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_repositories_insert ON open_kb.github_repositories
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND issue_id IS NULL
    AND page_id IS NULL
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
    AND page_id IS NULL
  );

CREATE POLICY github_repositories_delete ON open_kb.github_repositories
  FOR DELETE TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY slack_project_syncs_select ON open_kb.slack_project_syncs
  FOR SELECT TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY slack_project_syncs_insert ON open_kb.slack_project_syncs
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND open_kb.has_project_access(project_id)
    AND issue_id IS NULL
    AND page_id IS NULL
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
    AND page_id IS NULL
  );

CREATE POLICY slack_project_syncs_delete ON open_kb.slack_project_syncs
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY github_repository_syncs_select ON open_kb.github_repository_syncs
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_issue_syncs_select ON open_kb.github_issue_syncs
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_comment_syncs_select ON open_kb.github_comment_syncs
  FOR SELECT TO authenticated
  USING (open_kb.has_permission(organisation_id, 'settings.integrations.manage'));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  open_kb.api_tokens,
  open_kb.webhooks,
  open_kb.project_webhooks,
  open_kb.webhook_logs,
  open_kb.integrations,
  open_kb.organisation_integrations,
  open_kb.github_repositories,
  open_kb.github_repository_syncs,
  open_kb.github_issue_syncs,
  open_kb.github_comment_syncs,
  open_kb.slack_project_syncs
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  open_kb.api_tokens,
  open_kb.webhooks,
  open_kb.project_webhooks,
  open_kb.webhook_logs,
  open_kb.integrations,
  open_kb.organisation_integrations,
  open_kb.github_repositories,
  open_kb.github_repository_syncs,
  open_kb.github_issue_syncs,
  open_kb.github_comment_syncs,
  open_kb.slack_project_syncs
TO service_role;

GRANT SELECT ON TABLE open_kb.app_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE open_kb.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE open_kb.organisation_member_roles TO authenticated;
GRANT SELECT ON TABLE open_kb.my_permissions TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE open_kb.app_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE open_kb.role_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE open_kb.organisation_member_roles TO service_role;

REVOKE ALL ON FUNCTION open_kb.is_org_member(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.has_app_seat(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.has_project_access(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.has_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.enqueue_github_comment_sync(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.enqueue_slack_comment_sync(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.retry_provider_sync(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.disconnect_provider_integration(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.assign_issue_sequence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.create_default_project_states() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.validate_project_team_org() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.ensure_role(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.assign_default_role_for_seat() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.ensure_owner_seat() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION open_kb.is_org_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION open_kb.has_app_seat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION open_kb.has_project_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION open_kb.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION open_kb.enqueue_github_comment_sync(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION open_kb.enqueue_slack_comment_sync(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION open_kb.retry_provider_sync(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION open_kb.disconnect_provider_integration(UUID, TEXT) TO authenticated, service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('open-kb-assets', 'open-kb-assets', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE POLICY "Open-KB members can view assets" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'open-kb-assets'
    AND open_kb.has_app_seat((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Open-KB editors can manage assets" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'open-kb-assets'
    AND (
      open_kb.has_permission((storage.foldername(name))[1]::uuid, 'issues.edit')
      OR open_kb.has_permission((storage.foldername(name))[1]::uuid, 'pages.manage')
    )
  )
  WITH CHECK (
    bucket_id = 'open-kb-assets'
    AND (
      open_kb.has_permission((storage.foldername(name))[1]::uuid, 'issues.edit')
      OR open_kb.has_permission((storage.foldername(name))[1]::uuid, 'pages.manage')
    )
  );
