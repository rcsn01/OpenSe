-- Open-KB extended feature tables, provider columns, constraints, and indexes.

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
    'issue_sequences',
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
    EXECUTE format(
      'CREATE TABLE kb.%I (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
        project_id UUID REFERENCES kb.projects(id) ON DELETE CASCADE,
        issue_id UUID REFERENCES kb.issues(id) ON DELETE CASCADE,
        profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        owned_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        name TEXT,
        slug TEXT,
        title TEXT,
        description_json JSONB NOT NULL DEFAULT ''{"type":"doc","content":[{"type":"paragraph"}]}''::jsonb,
        description_html TEXT,
        description_text TEXT,
        external_id TEXT,
        status TEXT,
        metadata JSONB NOT NULL DEFAULT ''{}''::jsonb,
        payload JSONB NOT NULL DEFAULT ''{}''::jsonb,
        created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone(''utc''::text, now()),
        updated_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ
      )',
      table_name
    );

    EXECUTE format('CREATE INDEX %I ON kb.%I (organisation_id, deleted_at)', 'kb_' || table_name || '_org_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON kb.%I (project_id)', 'kb_' || table_name || '_project_idx', table_name);
    EXECUTE format('CREATE INDEX %I ON kb.%I (issue_id)', 'kb_' || table_name || '_issue_idx', table_name);
  END LOOP;
END $$;

ALTER TABLE kb.issue_labels
  ADD COLUMN label_id UUID REFERENCES kb.labels(id) ON DELETE CASCADE;

ALTER TABLE kb.cycle_issues
  ADD COLUMN cycle_id UUID REFERENCES kb.cycles(id) ON DELETE CASCADE;

ALTER TABLE kb.module_issues
  ADD COLUMN module_id UUID REFERENCES kb.modules(id) ON DELETE CASCADE;

ALTER TABLE kb.intake_issues
  ADD COLUMN intake_id UUID REFERENCES kb.intakes(id) ON DELETE CASCADE;

ALTER TABLE kb.issue_blockers
  ADD COLUMN blocker_issue_id UUID REFERENCES kb.issues(id) ON DELETE CASCADE;

ALTER TABLE kb.issue_relations
  ADD COLUMN related_issue_id UUID REFERENCES kb.issues(id) ON DELETE CASCADE,
  ADD COLUMN relation_type TEXT NOT NULL DEFAULT 'related'
    CHECK (relation_type IN ('related', 'duplicate', 'blocked_by', 'blocks'));

ALTER TABLE kb.issue_links
  ADD COLUMN url TEXT,
  ADD COLUMN link_type TEXT NOT NULL DEFAULT 'external'
    CHECK (link_type IN ('external', 'repository', 'document', 'support'));

ALTER TABLE kb.webhooks
  ADD COLUMN url TEXT,
  ADD COLUMN secret_hash TEXT,
  ADD COLUMN events TEXT[] NOT NULL DEFAULT ARRAY['issue.created', 'issue.updated']::TEXT[],
  ADD CONSTRAINT kb_webhooks_https_url_check
    CHECK (url IS NULL OR url ~* '^https://'),
  ADD CONSTRAINT kb_webhooks_scope_check
    CHECK (project_id IS NULL AND issue_id IS NULL);

ALTER TABLE kb.project_webhooks
  ADD COLUMN webhook_id UUID REFERENCES kb.webhooks(id) ON DELETE CASCADE,
  ADD COLUMN event_name TEXT;

ALTER TABLE kb.webhook_logs
  ADD COLUMN webhook_id UUID REFERENCES kb.webhooks(id) ON DELETE CASCADE,
  ADD COLUMN http_status INTEGER,
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN delivered_at TIMESTAMPTZ,
  ADD COLUMN next_retry_at TIMESTAMPTZ,
  ADD CONSTRAINT kb_webhook_logs_scope_check
    CHECK (issue_id IS NULL);

ALTER TABLE kb.integrations
  ADD COLUMN provider TEXT,
  ADD CONSTRAINT kb_integrations_provider_check
    CHECK (provider IS NULL OR provider IN ('github', 'slack'));

ALTER TABLE kb.organisation_integrations
  ADD COLUMN integration_id UUID REFERENCES kb.integrations(id) ON DELETE SET NULL,
  ADD COLUMN provider TEXT,
  ADD COLUMN connected_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN external_account_id TEXT,
  ADD COLUMN access_token_hash TEXT,
  ADD COLUMN refresh_token_hash TEXT,
  ADD COLUMN scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD CONSTRAINT kb_organisation_integrations_provider_check
    CHECK (provider IS NULL OR provider IN ('github', 'slack')),
  ADD CONSTRAINT kb_organisation_integrations_scope_check
    CHECK (project_id IS NULL AND issue_id IS NULL);

CREATE TABLE kb.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  organisation_integration_id UUID NOT NULL REFERENCES kb.organisation_integrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'slack')),
  credential_hash TEXT NOT NULL,
  credential_ciphertext TEXT NOT NULL,
  refresh_credential_hash TEXT,
  refresh_credential_ciphertext TEXT,
  credential_key_version TEXT NOT NULL DEFAULT 'v1',
  expires_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (organisation_integration_id),
  CONSTRAINT kb_integration_credentials_org_provider_check
    CHECK (organisation_id IS NOT NULL AND organisation_integration_id IS NOT NULL)
);

ALTER TABLE kb.github_repositories
  ADD COLUMN organisation_integration_id UUID REFERENCES kb.organisation_integrations(id) ON DELETE SET NULL,
  ADD COLUMN repository_owner TEXT,
  ADD COLUMN repository_name TEXT,
  ADD COLUMN installation_id TEXT,
  ADD COLUMN default_branch TEXT,
  ADD CONSTRAINT kb_github_repositories_scope_check
    CHECK (issue_id IS NULL);

ALTER TABLE kb.github_repository_syncs
  ADD COLUMN github_repository_id UUID REFERENCES kb.github_repositories(id) ON DELETE CASCADE,
  ADD COLUMN sync_type TEXT,
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN next_retry_at TIMESTAMPTZ,
  ADD COLUMN processed_at TIMESTAMPTZ,
  ADD COLUMN last_error_text TEXT,
  ADD CONSTRAINT kb_github_repository_syncs_scope_check
    CHECK (issue_id IS NULL);

ALTER TABLE kb.github_issue_syncs
  ADD COLUMN github_repository_id UUID REFERENCES kb.github_repositories(id) ON DELETE CASCADE,
  ADD COLUMN external_issue_number INTEGER,
  ADD COLUMN external_issue_url TEXT,
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN next_retry_at TIMESTAMPTZ,
  ADD COLUMN processed_at TIMESTAMPTZ,
  ADD COLUMN last_error_text TEXT;

ALTER TABLE kb.github_comment_syncs
  ADD COLUMN github_repository_id UUID REFERENCES kb.github_repositories(id) ON DELETE CASCADE,
  ADD COLUMN comment_id UUID REFERENCES kb.issue_comments(id) ON DELETE SET NULL,
  ADD COLUMN external_comment_id TEXT,
  ADD COLUMN external_comment_url TEXT,
  ADD COLUMN sync_direction TEXT NOT NULL DEFAULT 'inbound'
    CHECK (sync_direction IN ('inbound', 'outbound')),
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN next_retry_at TIMESTAMPTZ,
  ADD COLUMN processed_at TIMESTAMPTZ,
  ADD COLUMN last_error_text TEXT;

ALTER TABLE kb.slack_project_syncs
  ADD COLUMN organisation_integration_id UUID REFERENCES kb.organisation_integrations(id) ON DELETE SET NULL,
  ADD COLUMN channel_id TEXT,
  ADD COLUMN channel_name TEXT,
  ADD COLUMN comment_id UUID REFERENCES kb.issue_comments(id) ON DELETE SET NULL,
  ADD COLUMN sync_direction TEXT NOT NULL DEFAULT 'inbound'
    CHECK (sync_direction IN ('inbound', 'outbound')),
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN next_retry_at TIMESTAMPTZ,
  ADD COLUMN processed_at TIMESTAMPTZ,
  ADD COLUMN last_error_text TEXT,
  ADD CONSTRAINT kb_slack_project_syncs_scope_check
  CHECK (
    project_id IS NOT NULL
    AND (sync_direction = 'outbound' OR issue_id IS NULL)
  );

ALTER TABLE kb.comment_reactions
  ADD COLUMN comment_id UUID REFERENCES kb.issue_comments(id) ON DELETE CASCADE;

ALTER TABLE kb.user_favorites
  ADD CONSTRAINT kb_user_favorites_name_check
  CHECK (name IN ('project', 'issue'));

ALTER TABLE kb.user_recent_visits
  ADD CONSTRAINT kb_user_recent_visits_name_check
  CHECK (name IN ('project', 'issue'));

ALTER TABLE kb.draft_issues
  ADD CONSTRAINT kb_draft_issues_scope_check
  CHECK (issue_id IS NULL AND project_id IS NOT NULL);

ALTER TABLE kb.teams
  ADD CONSTRAINT kb_teams_scope_check
  CHECK (project_id IS NULL AND issue_id IS NULL);

ALTER TABLE kb.project_deploy_boards
  ADD CONSTRAINT kb_project_deploy_boards_scope_check
  CHECK (project_id IS NOT NULL AND issue_id IS NULL);

ALTER TABLE kb.projects
  ADD COLUMN team_id UUID REFERENCES kb.teams(id) ON DELETE SET NULL;

ALTER TABLE kb.estimate_points
  ADD COLUMN estimate_id UUID REFERENCES kb.estimates(id) ON DELETE CASCADE,
  ADD COLUMN value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE kb.issues
  ADD CONSTRAINT kb_issues_estimate_point_id_fkey
  FOREIGN KEY (estimate_point_id) REFERENCES kb.estimate_points(id) ON DELETE SET NULL;

ALTER TABLE kb.issues
  ADD COLUMN external_id TEXT;

CREATE UNIQUE INDEX kb_issues_external_uidx
  ON kb.issues (organisation_id, external_id)
  WHERE deleted_at IS NULL AND external_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_labels_issue_label_uidx
  ON kb.issue_labels (issue_id, label_id)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND label_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_assignees_issue_profile_uidx
  ON kb.issue_assignees (issue_id, profile_id)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_mentions_issue_profile_uidx
  ON kb.issue_mentions (issue_id, profile_id)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_subscribers_issue_profile_uidx
  ON kb.issue_subscribers (issue_id, profile_id)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_votes_issue_profile_uidx
  ON kb.issue_votes (issue_id, profile_id)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_comments_external_uidx
  ON kb.issue_comments (organisation_id, external_id)
  WHERE deleted_at IS NULL AND external_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_reactions_issue_profile_name_uidx
  ON kb.issue_reactions (issue_id, profile_id, name)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND profile_id IS NOT NULL AND name IS NOT NULL;

CREATE UNIQUE INDEX kb_comment_reactions_comment_profile_name_uidx
  ON kb.comment_reactions (comment_id, profile_id, name)
  WHERE deleted_at IS NULL AND comment_id IS NOT NULL AND profile_id IS NOT NULL AND name IS NOT NULL;

CREATE UNIQUE INDEX kb_user_favorites_profile_project_uidx
  ON kb.user_favorites (profile_id, project_id)
  WHERE deleted_at IS NULL AND name = 'project' AND profile_id IS NOT NULL AND project_id IS NOT NULL;

CREATE UNIQUE INDEX kb_user_favorites_profile_issue_uidx
  ON kb.user_favorites (profile_id, issue_id)
  WHERE deleted_at IS NULL AND name = 'issue' AND profile_id IS NOT NULL AND issue_id IS NOT NULL;

CREATE INDEX kb_user_favorites_profile_created_idx
  ON kb.user_favorites (profile_id, created_at DESC)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_user_recent_visits_profile_project_uidx
  ON kb.user_recent_visits (profile_id, project_id)
  WHERE deleted_at IS NULL AND name = 'project' AND profile_id IS NOT NULL AND project_id IS NOT NULL;

CREATE UNIQUE INDEX kb_user_recent_visits_profile_issue_uidx
  ON kb.user_recent_visits (profile_id, issue_id)
  WHERE deleted_at IS NULL AND name = 'issue' AND profile_id IS NOT NULL AND issue_id IS NOT NULL;

CREATE INDEX kb_user_recent_visits_profile_updated_idx
  ON kb.user_recent_visits (profile_id, updated_at DESC, created_at DESC)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;

CREATE INDEX kb_draft_issues_profile_updated_idx
  ON kb.draft_issues (profile_id, updated_at DESC, created_at DESC)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;

CREATE INDEX kb_draft_issues_project_updated_idx
  ON kb.draft_issues (project_id, updated_at DESC, created_at DESC)
  WHERE deleted_at IS NULL AND project_id IS NOT NULL;

CREATE UNIQUE INDEX kb_teams_org_slug_uidx
  ON kb.teams (organisation_id, lower(slug))
  WHERE deleted_at IS NULL AND slug IS NOT NULL;

CREATE INDEX kb_projects_team_idx
  ON kb.projects (team_id, deleted_at)
  WHERE team_id IS NOT NULL;

CREATE UNIQUE INDEX kb_project_deploy_boards_slug_uidx
  ON kb.project_deploy_boards (lower(slug))
  WHERE deleted_at IS NULL AND slug IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_blockers_issue_blocker_uidx
  ON kb.issue_blockers (issue_id, blocker_issue_id)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND blocker_issue_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_relations_issue_related_type_uidx
  ON kb.issue_relations (issue_id, related_issue_id, relation_type)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND related_issue_id IS NOT NULL;

CREATE UNIQUE INDEX kb_issue_links_issue_url_uidx
  ON kb.issue_links (issue_id, lower(url))
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL AND url IS NOT NULL;

CREATE INDEX kb_issue_activities_issue_created_idx
  ON kb.issue_activities (issue_id, created_at DESC)
  WHERE deleted_at IS NULL AND issue_id IS NOT NULL;

CREATE INDEX kb_notifications_profile_status_idx
  ON kb.notifications (profile_id, status, created_at DESC)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_user_notification_preferences_profile_org_uidx
  ON kb.user_notification_preferences (organisation_id, profile_id)
  WHERE deleted_at IS NULL AND profile_id IS NOT NULL;

CREATE UNIQUE INDEX kb_cycle_issues_cycle_issue_uidx
  ON kb.cycle_issues (cycle_id, issue_id)
  WHERE deleted_at IS NULL AND cycle_id IS NOT NULL AND issue_id IS NOT NULL;

CREATE UNIQUE INDEX kb_module_issues_module_issue_uidx
  ON kb.module_issues (module_id, issue_id)
  WHERE deleted_at IS NULL AND module_id IS NOT NULL AND issue_id IS NOT NULL;

CREATE INDEX kb_intake_issues_intake_idx
  ON kb.intake_issues (intake_id, status)
  WHERE deleted_at IS NULL AND intake_id IS NOT NULL;

CREATE UNIQUE INDEX kb_estimate_points_estimate_value_uidx
  ON kb.estimate_points (estimate_id, value)
  WHERE deleted_at IS NULL AND estimate_id IS NOT NULL;

CREATE INDEX kb_estimate_points_estimate_idx
  ON kb.estimate_points (estimate_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX kb_states_project_idx ON kb.states (project_id, deleted_at);
CREATE INDEX kb_labels_project_idx ON kb.labels (project_id, deleted_at);
CREATE INDEX kb_issue_types_project_idx ON kb.issue_types (project_id, deleted_at);
CREATE INDEX kb_cycles_project_idx ON kb.cycles (project_id, deleted_at);
CREATE INDEX kb_modules_project_idx ON kb.modules (project_id, deleted_at);
CREATE INDEX kb_api_tokens_profile_idx ON kb.api_tokens (profile_id, revoked_at);
CREATE INDEX kb_webhooks_org_status_idx ON kb.webhooks (organisation_id, status, deleted_at);
CREATE UNIQUE INDEX kb_webhooks_org_url_uidx
  ON kb.webhooks (organisation_id, lower(url))
  WHERE deleted_at IS NULL AND url IS NOT NULL;
CREATE INDEX kb_project_webhooks_project_webhook_idx ON kb.project_webhooks (project_id, webhook_id, deleted_at)
  WHERE project_id IS NOT NULL AND webhook_id IS NOT NULL;
CREATE INDEX kb_webhook_logs_webhook_created_idx ON kb.webhook_logs (webhook_id, created_at DESC)
  WHERE webhook_id IS NOT NULL;
CREATE UNIQUE INDEX kb_integrations_provider_uidx
  ON kb.integrations (provider)
  WHERE deleted_at IS NULL AND provider IS NOT NULL;
CREATE UNIQUE INDEX kb_organisation_integrations_provider_uidx
  ON kb.organisation_integrations (organisation_id, provider)
  WHERE deleted_at IS NULL AND provider IS NOT NULL;
CREATE INDEX kb_integration_credentials_org_provider_idx
  ON kb.integration_credentials (organisation_id, provider)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX kb_integration_credentials_integration_uidx
  ON kb.integration_credentials (organisation_integration_id)
  WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX kb_github_repositories_org_repo_uidx
  ON kb.github_repositories (organisation_id, lower(repository_owner), lower(repository_name))
  WHERE deleted_at IS NULL AND repository_owner IS NOT NULL AND repository_name IS NOT NULL;
CREATE INDEX kb_github_repository_syncs_repo_created_idx
  ON kb.github_repository_syncs (github_repository_id, created_at DESC)
  WHERE github_repository_id IS NOT NULL;
CREATE INDEX kb_github_repository_syncs_worker_due_idx
  ON kb.github_repository_syncs (status, next_retry_at, created_at)
  WHERE deleted_at IS NULL AND status IN ('received', 'waiting', 'retrying');
CREATE UNIQUE INDEX kb_github_repository_syncs_external_uidx
  ON kb.github_repository_syncs (github_repository_id, external_id)
  WHERE deleted_at IS NULL AND github_repository_id IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX kb_github_issue_syncs_repo_created_idx
  ON kb.github_issue_syncs (github_repository_id, created_at DESC)
  WHERE github_repository_id IS NOT NULL;
CREATE INDEX kb_github_issue_syncs_worker_due_idx
  ON kb.github_issue_syncs (status, next_retry_at, created_at)
  WHERE deleted_at IS NULL AND status IN ('received', 'waiting', 'retrying');
CREATE UNIQUE INDEX kb_github_issue_syncs_external_uidx
  ON kb.github_issue_syncs (github_repository_id, external_id)
  WHERE deleted_at IS NULL AND github_repository_id IS NOT NULL AND external_id IS NOT NULL;
CREATE INDEX kb_github_comment_syncs_repo_created_idx
  ON kb.github_comment_syncs (github_repository_id, created_at DESC)
  WHERE github_repository_id IS NOT NULL;
CREATE INDEX kb_github_comment_syncs_worker_due_idx
  ON kb.github_comment_syncs (status, next_retry_at, created_at)
  WHERE deleted_at IS NULL AND status IN ('received', 'waiting', 'retrying', 'outbound_pending');
CREATE UNIQUE INDEX kb_github_comment_syncs_external_uidx
  ON kb.github_comment_syncs (github_repository_id, external_id)
  WHERE deleted_at IS NULL AND github_repository_id IS NOT NULL AND external_id IS NOT NULL;
CREATE UNIQUE INDEX kb_github_comment_syncs_outbound_comment_uidx
  ON kb.github_comment_syncs (comment_id, github_repository_id)
  WHERE deleted_at IS NULL
    AND sync_direction = 'outbound'
    AND comment_id IS NOT NULL
    AND github_repository_id IS NOT NULL;
CREATE UNIQUE INDEX kb_slack_project_syncs_project_channel_uidx
  ON kb.slack_project_syncs (project_id, channel_id)
  WHERE deleted_at IS NULL
    AND sync_direction = 'inbound'
    AND project_id IS NOT NULL
    AND channel_id IS NOT NULL;
CREATE INDEX kb_slack_project_syncs_worker_due_idx
  ON kb.slack_project_syncs (status, next_retry_at, updated_at)
  WHERE deleted_at IS NULL AND status IN ('received', 'waiting', 'retrying', 'outbound_pending');
CREATE UNIQUE INDEX kb_slack_project_syncs_outbound_comment_uidx
  ON kb.slack_project_syncs (comment_id, channel_id)
  WHERE deleted_at IS NULL
    AND sync_direction = 'outbound'
    AND comment_id IS NOT NULL
    AND channel_id IS NOT NULL;

CREATE TABLE kb.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES kb.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('issue_created', 'state_entered')),
  state_id UUID REFERENCES kb.states(id) ON DELETE SET NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT kb_workflow_rules_state_entered_check
    CHECK (
      (trigger_event = 'state_entered' AND state_id IS NOT NULL)
      OR trigger_event = 'issue_created'
    )
);

CREATE INDEX kb_workflow_rules_project_idx
  ON kb.workflow_rules (project_id, sort_order, deleted_at);

CREATE TABLE kb.workflow_rule_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES kb.projects(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES kb.workflow_rules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (
    action_type IN ('assign_users', 'assign_team', 'set_due_date', 'add_comment', 'create_subtasks')
  ),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX kb_workflow_rule_actions_rule_idx
  ON kb.workflow_rule_actions (rule_id, sort_order, deleted_at);

CREATE INDEX kb_workflow_rule_actions_project_idx
  ON kb.workflow_rule_actions (project_id, deleted_at);

CREATE TRIGGER handle_workflow_rules_updated_at
  BEFORE UPDATE ON kb.workflow_rules
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER handle_workflow_rule_actions_updated_at
  BEFORE UPDATE ON kb.workflow_rule_actions
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);
