-- Open-KB settings, automation, integration, provider sync, and storage RLS.

ALTER TABLE kb.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.project_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.organisation_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.github_repository_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.github_issue_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.github_comment_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.slack_project_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_manage ON kb.roles
  FOR ALL TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.roles.manage'))
  WITH CHECK (kb.has_permission(organisation_id, 'settings.roles.manage'));

CREATE POLICY feature_flags_update ON kb.feature_flags
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY api_tokens_select ON kb.api_tokens
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY api_tokens_insert ON kb.api_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    profile_id = auth.uid()
    AND kb.has_permission(organisation_id, 'automation.manage')
    AND EXISTS (
      SELECT 1
      FROM kb.feature_flags ff
      WHERE ff.organisation_id = api_tokens.organisation_id
        AND ff.api_tokens_enabled
    )
  );

CREATE POLICY api_tokens_update ON kb.api_tokens
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid() AND kb.has_permission(organisation_id, 'automation.manage'))
  WITH CHECK (profile_id = auth.uid() AND kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY api_tokens_delete ON kb.api_tokens
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid() AND kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY webhooks_select ON kb.webhooks
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY webhooks_insert ON kb.webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'automation.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND status IN ('active', 'paused', 'disabled')
    AND url ~* '^https://'
  );

CREATE POLICY webhooks_update ON kb.webhooks
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'automation.manage'))
  WITH CHECK (
    kb.has_permission(organisation_id, 'automation.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND status IN ('active', 'paused', 'disabled')
    AND url ~* '^https://'
  );

CREATE POLICY webhooks_delete ON kb.webhooks
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'automation.manage'));

CREATE POLICY project_webhooks_select ON kb.project_webhooks
  FOR SELECT TO authenticated
  USING (
    kb.has_permission(organisation_id, 'automation.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_webhooks_insert ON kb.project_webhooks
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'automation.manage')
    AND kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY project_webhooks_update ON kb.project_webhooks
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'automation.manage')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'automation.manage')
    AND kb.has_project_access(project_id)
    AND issue_id IS NULL
  );

CREATE POLICY project_webhooks_delete ON kb.project_webhooks
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'automation.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY webhook_logs_select ON kb.webhook_logs
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'automation.manage'));


CREATE POLICY integrations_select ON kb.integrations
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY integrations_insert ON kb.integrations
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND provider IN ('github', 'slack')
  );

CREATE POLICY integrations_update ON kb.integrations
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND provider IN ('github', 'slack')
  );

CREATE POLICY integrations_delete ON kb.integrations
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY organisation_integrations_select ON kb.organisation_integrations
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY organisation_integrations_insert ON kb.organisation_integrations
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
    AND (
      (provider = 'github' AND EXISTS (SELECT 1 FROM kb.feature_flags ff WHERE ff.organisation_id = organisation_integrations.organisation_id AND ff.github_sync_enabled))
      OR
      (provider = 'slack' AND EXISTS (SELECT 1 FROM kb.feature_flags ff WHERE ff.organisation_id = organisation_integrations.organisation_id AND ff.slack_sync_enabled))
    )
  );

CREATE POLICY organisation_integrations_update ON kb.organisation_integrations
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND project_id IS NULL
    AND issue_id IS NULL
  );

CREATE POLICY organisation_integrations_delete ON kb.organisation_integrations
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_repositories_select ON kb.github_repositories
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_repositories_insert ON kb.github_repositories
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND issue_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM kb.feature_flags ff
      WHERE ff.organisation_id = github_repositories.organisation_id
        AND ff.github_sync_enabled
    )
  );

CREATE POLICY github_repositories_update ON kb.github_repositories
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'))
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND issue_id IS NULL
  );

CREATE POLICY github_repositories_delete ON kb.github_repositories
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY slack_project_syncs_select ON kb.slack_project_syncs
  FOR SELECT TO authenticated
  USING (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY slack_project_syncs_insert ON kb.slack_project_syncs
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND kb.has_project_access(project_id)
    AND issue_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM kb.feature_flags ff
      WHERE ff.organisation_id = slack_project_syncs.organisation_id
        AND ff.slack_sync_enabled
    )
  );

CREATE POLICY slack_project_syncs_update ON kb.slack_project_syncs
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND kb.has_project_access(project_id)
    AND (
      (sync_direction = 'inbound' AND issue_id IS NULL)
      OR
      (sync_direction = 'outbound' AND status IN ('outbound_pending', 'retrying', 'waiting'))
    )
  );

CREATE POLICY slack_project_syncs_delete ON kb.slack_project_syncs
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY github_repository_syncs_select ON kb.github_repository_syncs
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_issue_syncs_select ON kb.github_issue_syncs
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_comment_syncs_select ON kb.github_comment_syncs
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'settings.integrations.manage'));

CREATE POLICY github_comment_syncs_retry_update ON kb.github_comment_syncs
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND sync_direction = 'outbound'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'settings.integrations.manage')
    AND sync_direction = 'outbound'
    AND deleted_at IS NULL
    AND status IN ('outbound_pending', 'retrying', 'waiting')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  kb.api_tokens,
  kb.webhooks,
  kb.project_webhooks,
  kb.webhook_logs,
  kb.integrations,
  kb.organisation_integrations,
  kb.github_repositories,
  kb.slack_project_syncs
TO authenticated;

GRANT SELECT ON TABLE
  kb.github_repository_syncs,
  kb.github_issue_syncs,
  kb.github_comment_syncs
TO authenticated;

GRANT UPDATE (
  status,
  attempt_count,
  next_retry_at,
  processed_at,
  last_error_text,
  payload,
  updated_at
) ON TABLE kb.github_comment_syncs TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  kb.api_tokens,
  kb.webhooks,
  kb.project_webhooks,
  kb.webhook_logs,
  kb.integrations,
  kb.organisation_integrations,
  kb.github_repositories,
  kb.github_repository_syncs,
  kb.github_issue_syncs,
  kb.github_comment_syncs,
  kb.slack_project_syncs
TO service_role;

GRANT SELECT ON TABLE kb.app_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE kb.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE kb.organisation_member_roles TO authenticated;
GRANT SELECT ON TABLE kb.my_permissions TO authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE kb.app_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE kb.role_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE kb.organisation_member_roles TO service_role;

REVOKE ALL ON FUNCTION kb.has_app_seat(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.has_project_access(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.has_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.enqueue_github_comment_sync(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.enqueue_slack_comment_sync(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.enqueue_issue_comment_provider_syncs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.handle_provider_integration_disconnect() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.assign_issue_sequence() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.create_default_project_states() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.validate_project_team_org() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.ensure_role(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.assign_default_role_for_seat() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.ensure_owner_seat() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION kb.has_app_seat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION kb.has_project_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION kb.has_permission(UUID, TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('open-kb-assets', 'open-kb-assets', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE POLICY "Open-KB members can view assets" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'open-kb-assets'
    AND kb.has_app_seat((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "Open-KB editors can manage assets" ON storage.objects
  FOR ALL TO authenticated USING (
    bucket_id = 'open-kb-assets'
    AND (
      kb.has_permission((storage.foldername(name))[1]::uuid, 'issues.edit')
    )
  )
  WITH CHECK (
    bucket_id = 'open-kb-assets'
    AND (
      kb.has_permission((storage.foldername(name))[1]::uuid, 'issues.edit')
    )
  );
