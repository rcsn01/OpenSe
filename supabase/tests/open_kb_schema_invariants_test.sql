BEGIN;

SELECT plan(1);

DO $$
DECLARE
  v_details TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'open_kb'
      AND table_name IN (
        'users',
        'profiles',
        'accounts',
        'sessions',
        'social_login_connections',
        'devices',
        'device_sessions'
      )
  ) THEN
    RAISE EXCEPTION 'Open-KB must not create Plane auth/session tables';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'open_kb'
      AND column_name = 'workspace_id'
  ) THEN
    RAISE EXCEPTION 'Open-KB must not reintroduce Plane workspace_id columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'open_kb'
      AND table_name = 'projects'
      AND column_name = 'organisation_id'
  ) THEN
    RAISE EXCEPTION 'Open-KB projects must belong directly to public.organisations';
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'open_kb'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Open-KB tables missing RLS: %', v_details;
  END IF;

  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO v_details
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'open_kb'
    AND c.relkind = 'r'
    AND (
      has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Open-KB tables must not be directly accessible to anon: %', v_details;
  END IF;

  SELECT string_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' ORDER BY n.nspname, p.proname)
  INTO v_details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'open_kb'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND p.proname NOT IN ('public_deploy_board', 'public_deploy_board_issues');

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Only public deploy board RPCs may be SECURITY DEFINER callable by anon: %', v_details;
  END IF;

  SELECT string_agg(n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' ORDER BY n.nspname, p.proname)
  INTO v_details
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'open_kb'
    AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND p.proname NOT IN (
      'public_deploy_board',
      'public_deploy_board_issues',
      'is_org_member',
      'has_app_seat',
      'has_project_access',
      'has_permission',
      'enqueue_github_comment_sync',
      'enqueue_slack_comment_sync',
      'retry_provider_sync',
      'disconnect_provider_integration'
    );

  IF v_details IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected Open-KB SECURITY DEFINER functions callable by authenticated: %', v_details;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'open_kb'
      AND tablename IN ('github_repository_syncs', 'github_issue_syncs', 'github_comment_syncs', 'webhook_logs', 'integration_credentials')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND roles && ARRAY['authenticated', 'anon']::name[]
  ) THEN
    RAISE EXCEPTION 'Open-KB provider/webhook sync log and credential writes must stay service-role-only';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'open_kb'
      AND tablename = 'integration_credentials'
      AND roles && ARRAY['authenticated', 'anon']::name[]
  ) THEN
    RAISE EXCEPTION 'Open-KB provider credentials must not have anon/authenticated policies';
  END IF;

  IF has_table_privilege('authenticated', 'open_kb.integration_credentials', 'SELECT')
    OR has_table_privilege('authenticated', 'open_kb.integration_credentials', 'INSERT')
    OR has_table_privilege('authenticated', 'open_kb.integration_credentials', 'UPDATE')
    OR has_table_privilege('authenticated', 'open_kb.integration_credentials', 'DELETE')
  THEN
    RAISE EXCEPTION 'Open-KB provider credentials must not be directly accessible to authenticated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'open_kb'
      AND table_name IN ('api_tokens', 'organisation_integrations', 'integration_credentials')
      AND column_name IN ('token', 'access_token', 'refresh_token', 'secret')
  ) THEN
    RAISE EXCEPTION 'Open-KB token/credential tables must not expose raw token/secret columns';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('github_repository_syncs', 'attempt_count'),
        ('github_repository_syncs', 'next_retry_at'),
        ('github_repository_syncs', 'processed_at'),
        ('github_repository_syncs', 'last_error_text'),
        ('github_issue_syncs', 'attempt_count'),
        ('github_issue_syncs', 'next_retry_at'),
        ('github_issue_syncs', 'processed_at'),
        ('github_issue_syncs', 'last_error_text'),
        ('github_comment_syncs', 'attempt_count'),
        ('github_comment_syncs', 'next_retry_at'),
        ('github_comment_syncs', 'processed_at'),
        ('github_comment_syncs', 'last_error_text'),
        ('github_comment_syncs', 'sync_direction'),
        ('slack_project_syncs', 'attempt_count'),
        ('slack_project_syncs', 'next_retry_at'),
        ('slack_project_syncs', 'processed_at'),
        ('slack_project_syncs', 'last_error_text'),
        ('slack_project_syncs', 'comment_id'),
        ('slack_project_syncs', 'sync_direction')
    ) AS required(table_name, column_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'open_kb'
        AND c.table_name = required.table_name
        AND c.column_name = required.column_name
    )
  ) THEN
    RAISE EXCEPTION 'Open-KB provider sync tables must keep retry/backoff metadata columns';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('open_kb_github_repository_syncs_worker_due_idx'),
        ('open_kb_github_issue_syncs_worker_due_idx'),
        ('open_kb_github_comment_syncs_worker_due_idx'),
        ('open_kb_github_comment_syncs_outbound_comment_uidx'),
        ('open_kb_slack_project_syncs_worker_due_idx'),
        ('open_kb_slack_project_syncs_outbound_comment_uidx')
    ) AS required(index_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_indexes i
      WHERE i.schemaname = 'open_kb'
        AND i.indexname = required.index_name
    )
  ) THEN
    RAISE EXCEPTION 'Open-KB provider sync tables must keep worker due indexes';
  END IF;
END;
$$;

SELECT pass('Open-KB schema, RLS, auth-conflict, and integration write invariants hold');

SELECT * FROM finish();

ROLLBACK;
