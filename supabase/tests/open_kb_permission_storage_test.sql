BEGIN;

SELECT plan(1);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101001',
    'authenticated',
    'authenticated',
    'open-kb-owner@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB Owner"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101002',
    'authenticated',
    'authenticated',
    'open-kb-member@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB Member"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101003',
    'authenticated',
    'authenticated',
    'open-kb-no-seat@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB No Seat"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101004',
    'authenticated',
    'authenticated',
    'open-kb-cross-org@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB Cross Org"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101005',
    'authenticated',
    'authenticated',
    'open-kb-admin@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB Admin"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101006',
    'authenticated',
    'authenticated',
    'open-kb-editor@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB Editor"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10101010-1010-4010-8010-101010101007',
    'authenticated',
    'authenticated',
    'open-kb-viewer@test.local',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Open KB Viewer"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
VALUES
  ('10101010-1010-4010-8010-101010101001', 'open-kb-owner@test.local', 'Open KB Owner'),
  ('10101010-1010-4010-8010-101010101002', 'open-kb-member@test.local', 'Open KB Member'),
  ('10101010-1010-4010-8010-101010101003', 'open-kb-no-seat@test.local', 'Open KB No Seat'),
  ('10101010-1010-4010-8010-101010101004', 'open-kb-cross-org@test.local', 'Open KB Cross Org'),
  ('10101010-1010-4010-8010-101010101005', 'open-kb-admin@test.local', 'Open KB Admin'),
  ('10101010-1010-4010-8010-101010101006', 'open-kb-editor@test.local', 'Open KB Editor'),
  ('10101010-1010-4010-8010-101010101007', 'open-kb-viewer@test.local', 'Open KB Viewer')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

UPDATE public.platform_instance_settings
SET max_organisations = GREATEST(max_organisations, 100)
WHERE id = true;

INSERT INTO public.organisations (id, name, owner_id, status)
VALUES
  (
    '10101010-0000-4010-8010-000000000010',
    'Open-KB Policy Test Org',
    '10101010-1010-4010-8010-101010101001',
    'active'
  ),
  (
    '10101010-0000-4010-8010-000000000011',
    'Open-KB Cross Policy Test Org',
    '10101010-1010-4010-8010-101010101004',
    'active'
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    owner_id = EXCLUDED.owner_id,
    status = EXCLUDED.status;

INSERT INTO public.organisation_members (org_id, user_id, role)
VALUES
  ('10101010-0000-4010-8010-000000000010', '10101010-1010-4010-8010-101010101002', 'member'),
  ('10101010-0000-4010-8010-000000000010', '10101010-1010-4010-8010-101010101003', 'member'),
  ('10101010-0000-4010-8010-000000000010', '10101010-1010-4010-8010-101010101005', 'member'),
  ('10101010-0000-4010-8010-000000000010', '10101010-1010-4010-8010-101010101006', 'member'),
  ('10101010-0000-4010-8010-000000000010', '10101010-1010-4010-8010-101010101007', 'member')
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT om.id, 'open-kb'
FROM public.organisation_members om
WHERE (om.org_id, om.user_id) IN (
  ('10101010-0000-4010-8010-000000000010'::uuid, '10101010-1010-4010-8010-101010101001'::uuid),
  ('10101010-0000-4010-8010-000000000010'::uuid, '10101010-1010-4010-8010-101010101002'::uuid),
  ('10101010-0000-4010-8010-000000000010'::uuid, '10101010-1010-4010-8010-101010101005'::uuid),
  ('10101010-0000-4010-8010-000000000010'::uuid, '10101010-1010-4010-8010-101010101006'::uuid),
  ('10101010-0000-4010-8010-000000000010'::uuid, '10101010-1010-4010-8010-101010101007'::uuid),
  ('10101010-0000-4010-8010-000000000011'::uuid, '10101010-1010-4010-8010-101010101004'::uuid)
)
ON CONFLICT (org_member_id, app_code) DO NOTHING;

INSERT INTO open_kb.projects (
  id,
  organisation_id,
  name,
  identifier,
  description_text,
  status,
  visibility,
  created_by
)
VALUES (
  '10101010-0000-4010-8010-000000000001',
  '10101010-0000-4010-8010-000000000010',
  'Open-KB Policy Test Project',
  'OKBT',
  'Project used by Open-KB policy tests.',
  'active',
  'private',
  '10101010-1010-4010-8010-101010101001'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    identifier = EXCLUDED.identifier,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    visibility = EXCLUDED.visibility;

INSERT INTO open_kb.issues (
  id,
  organisation_id,
  project_id,
  title,
  description_text,
  priority,
  created_by
)
VALUES (
  '10101010-0000-4010-8010-000000000002',
  '10101010-0000-4010-8010-000000000010',
  '10101010-0000-4010-8010-000000000001',
  'Open-KB Policy Test Issue',
  'Issue used by Open-KB role matrix tests.',
  'medium',
  '10101010-1010-4010-8010-101010101001'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    priority = EXCLUDED.priority;

INSERT INTO open_kb.feature_flags (organisation_id, github_sync_enabled, slack_sync_enabled)
VALUES ('10101010-0000-4010-8010-000000000010', true, true)
ON CONFLICT (organisation_id) DO UPDATE
SET github_sync_enabled = EXCLUDED.github_sync_enabled,
    slack_sync_enabled = EXCLUDED.slack_sync_enabled;

INSERT INTO open_kb.organisation_integrations (
  id,
  organisation_id,
  provider,
  name,
  title,
  status,
  connected_by_profile_id,
  access_token_hash
)
VALUES (
  '10101010-0000-4010-8010-000000000020',
  '10101010-0000-4010-8010-000000000010',
  'github',
  'GitHub',
  'GitHub',
  'connected',
  '10101010-1010-4010-8010-101010101001',
  repeat('a', 64)
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    access_token_hash = EXCLUDED.access_token_hash;

INSERT INTO open_kb.github_repositories (
  id,
  organisation_id,
  organisation_integration_id,
  repository_owner,
  repository_name,
  status,
  created_by
)
VALUES (
  '10101010-0000-4010-8010-000000000021',
  '10101010-0000-4010-8010-000000000010',
  '10101010-0000-4010-8010-000000000020',
  'opense',
  'open-kb-test',
  'active',
  '10101010-1010-4010-8010-101010101001'
)
ON CONFLICT (id) DO UPDATE
SET organisation_integration_id = EXCLUDED.organisation_integration_id,
    repository_owner = EXCLUDED.repository_owner,
    repository_name = EXCLUDED.repository_name,
    status = EXCLUDED.status;

INSERT INTO open_kb.github_issue_syncs (
  id,
  organisation_id,
  project_id,
  issue_id,
  github_repository_id,
  external_issue_number,
  external_issue_url,
  status,
  created_by
)
VALUES (
  '10101010-0000-4010-8010-000000000022',
  '10101010-0000-4010-8010-000000000010',
  '10101010-0000-4010-8010-000000000001',
  '10101010-0000-4010-8010-000000000002',
  '10101010-0000-4010-8010-000000000021',
  42,
  'https://github.com/opense/open-kb-test/issues/42',
  'processed',
  '10101010-1010-4010-8010-101010101001'
)
ON CONFLICT (id) DO UPDATE
SET external_issue_number = EXCLUDED.external_issue_number,
    status = EXCLUDED.status;

INSERT INTO open_kb.integration_credentials (
  id,
  organisation_id,
  organisation_integration_id,
  provider,
  credential_hash,
  credential_ciphertext,
  credential_key_version
)
VALUES (
  '10101010-0000-4010-8010-000000000025',
  '10101010-0000-4010-8010-000000000010',
  '10101010-0000-4010-8010-000000000020',
  'github',
  repeat('c', 64),
  'v1.fake.fake',
  'test'
)
ON CONFLICT (organisation_integration_id) DO UPDATE
SET credential_hash = EXCLUDED.credential_hash,
    credential_ciphertext = EXCLUDED.credential_ciphertext,
    revoked_at = NULL;

INSERT INTO open_kb.organisation_integrations (
  id,
  organisation_id,
  provider,
  name,
  title,
  status,
  connected_by_profile_id,
  external_account_id,
  access_token_hash
)
VALUES (
  '10101010-0000-4010-8010-000000000023',
  '10101010-0000-4010-8010-000000000010',
  'slack',
  'Slack',
  'Slack',
  'connected',
  '10101010-1010-4010-8010-101010101001',
  'T1234567890',
  repeat('b', 64)
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    external_account_id = EXCLUDED.external_account_id,
    access_token_hash = EXCLUDED.access_token_hash;

INSERT INTO open_kb.integration_credentials (
  id,
  organisation_id,
  organisation_integration_id,
  provider,
  credential_hash,
  credential_ciphertext,
  credential_key_version
)
VALUES (
  '10101010-0000-4010-8010-000000000026',
  '10101010-0000-4010-8010-000000000010',
  '10101010-0000-4010-8010-000000000023',
  'slack',
  repeat('d', 64),
  'v1.fake.fake',
  'test'
)
ON CONFLICT (organisation_integration_id) DO UPDATE
SET credential_hash = EXCLUDED.credential_hash,
    credential_ciphertext = EXCLUDED.credential_ciphertext,
    revoked_at = NULL;

INSERT INTO open_kb.slack_project_syncs (
  id,
  organisation_id,
  project_id,
  organisation_integration_id,
  channel_id,
  channel_name,
  sync_direction,
  status,
  created_by
)
VALUES (
  '10101010-0000-4010-8010-000000000024',
  '10101010-0000-4010-8010-000000000010',
  '10101010-0000-4010-8010-000000000001',
  '10101010-0000-4010-8010-000000000023',
  'C1234567890',
  '#open-kb-test',
  'inbound',
  'active',
  '10101010-1010-4010-8010-101010101001'
)
ON CONFLICT (id) DO UPDATE
SET organisation_integration_id = EXCLUDED.organisation_integration_id,
    channel_id = EXCLUDED.channel_id,
    channel_name = EXCLUDED.channel_name,
    sync_direction = EXCLUDED.sync_direction,
    status = EXCLUDED.status;

DO $$
DECLARE
  v_org_id UUID := '10101010-0000-4010-8010-000000000010';
  v_admin_role_id UUID;
  v_editor_role_id UUID;
  v_viewer_role_id UUID;
BEGIN
  SELECT open_kb.ensure_role(v_org_id, 'Admin', 800) INTO v_admin_role_id;
  SELECT open_kb.ensure_role(v_org_id, 'Editor', 500) INTO v_editor_role_id;
  SELECT open_kb.ensure_role(v_org_id, 'Viewer', 200) INTO v_viewer_role_id;

  INSERT INTO open_kb.role_permissions (role_id, permission_code)
  SELECT v_admin_role_id, code
  FROM open_kb.app_permissions
  WHERE code IN (
    'dashboard.view',
    'projects.view',
    'projects.create',
    'projects.edit',
    'projects.members.manage',
    'issues.view',
    'issues.create',
    'issues.edit',
    'issues.delete',
    'planning.view',
    'planning.manage',
    'pages.view',
    'pages.manage',
    'intake.view',
    'intake.manage',
    'analytics.view',
    'settings.view',
    'settings.integrations.manage'
  )
  ON CONFLICT (role_id, permission_code) DO NOTHING;

  INSERT INTO open_kb.role_permissions (role_id, permission_code)
  SELECT v_editor_role_id, code
  FROM open_kb.app_permissions
  WHERE code IN (
    'dashboard.view',
    'projects.view',
    'issues.view',
    'issues.create',
    'issues.edit',
    'planning.view',
    'pages.view',
    'pages.manage',
    'intake.view',
    'analytics.view',
    'settings.view'
  )
  ON CONFLICT (role_id, permission_code) DO NOTHING;

  INSERT INTO open_kb.role_permissions (role_id, permission_code)
  SELECT v_viewer_role_id, code
  FROM open_kb.app_permissions
  WHERE code IN (
    'dashboard.view',
    'projects.view',
    'issues.view',
    'planning.view',
    'pages.view',
    'intake.view',
    'analytics.view',
    'settings.view'
  )
  ON CONFLICT (role_id, permission_code) DO NOTHING;

  INSERT INTO open_kb.organisation_member_roles (org_member_id, role_id)
  SELECT om.id,
    CASE om.user_id
      WHEN '10101010-1010-4010-8010-101010101005'::uuid THEN v_admin_role_id
      WHEN '10101010-1010-4010-8010-101010101006'::uuid THEN v_editor_role_id
      WHEN '10101010-1010-4010-8010-101010101007'::uuid THEN v_viewer_role_id
    END
  FROM public.organisation_members om
  WHERE om.org_id = v_org_id
    AND om.user_id IN (
      '10101010-1010-4010-8010-101010101005'::uuid,
      '10101010-1010-4010-8010-101010101006'::uuid,
      '10101010-1010-4010-8010-101010101007'::uuid
    )
  ON CONFLICT (org_member_id) DO UPDATE
  SET role_id = EXCLUDED.role_id;
END;
$$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_org_id UUID := '10101010-0000-4010-8010-000000000010';
  v_project_id UUID := '10101010-0000-4010-8010-000000000001';
  v_issue_id UUID := '10101010-0000-4010-8010-000000000002';
  v_owner_id UUID := '10101010-1010-4010-8010-101010101001';
  v_member_id UUID := '10101010-1010-4010-8010-101010101002';
  v_no_seat_id UUID := '10101010-1010-4010-8010-101010101003';
  v_cross_org_id UUID := '10101010-1010-4010-8010-101010101004';
  v_admin_id UUID := '10101010-1010-4010-8010-101010101005';
  v_editor_id UUID := '10101010-1010-4010-8010-101010101006';
  v_viewer_id UUID := '10101010-1010-4010-8010-101010101007';
  v_project_count INTEGER;
  v_issue_count INTEGER;
  v_asset_count INTEGER;
  v_row_count INTEGER;
  v_comment_id UUID;
  v_sync_id UUID;
  v_second_sync_id UUID;
  v_slack_inserted_count INTEGER;
  v_second_slack_inserted_count INTEGER;
  v_slack_sync_id UUID;
  v_insert_blocked BOOLEAN := false;
  v_enqueue_blocked BOOLEAN := false;
  v_slack_enqueue_blocked BOOLEAN := false;
  v_retry_blocked BOOLEAN := false;
  v_disconnect_blocked BOOLEAN := false;
  v_asset_name TEXT := v_org_id::text || '/' || v_project_id::text || '/issues/test-open-kb-policy-' || gen_random_uuid()::text || '.txt';
  v_denied_asset_name TEXT := v_org_id::text || '/' || v_project_id::text || '/issues/test-open-kb-policy-denied-' || gen_random_uuid()::text || '.txt';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  IF NOT open_kb.has_app_seat(v_org_id) THEN
    RAISE EXCEPTION 'Open-KB owner should have an app seat';
  END IF;

  IF NOT open_kb.has_permission(v_org_id, 'settings.integrations.manage') THEN
    RAISE EXCEPTION 'Open-KB owner should have integration management permission';
  END IF;

  IF NOT open_kb.has_permission(v_org_id, 'projects.delete') THEN
    RAISE EXCEPTION 'Open-KB owner should have destructive project permission';
  END IF;

  SELECT count(*)
  INTO v_project_count
  FROM open_kb.projects
  WHERE organisation_id = v_org_id;

  IF v_project_count = 0 THEN
    RAISE EXCEPTION 'Open-KB owner should be able to read seeded projects';
  END IF;

  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'open-kb-assets',
    v_asset_name,
    v_owner_id,
    '{"size":1,"mimetype":"text/plain"}'::jsonb
  );

  PERFORM set_config('request.jwt.claim.sub', v_admin_id::text, true);

  IF NOT open_kb.has_permission(v_org_id, 'settings.integrations.manage') THEN
    RAISE EXCEPTION 'Open-KB admin role should manage integrations';
  END IF;

  IF open_kb.has_permission(v_org_id, 'settings.roles.manage') THEN
    RAISE EXCEPTION 'Open-KB admin role should not manage roles';
  END IF;

  IF open_kb.has_permission(v_org_id, 'projects.delete') THEN
    RAISE EXCEPTION 'Open-KB admin test role should not delete projects';
  END IF;

  INSERT INTO open_kb.projects (
    id,
    organisation_id,
    name,
    identifier,
    description_text,
    status,
    visibility,
    created_by
  )
  VALUES (
    '10101010-0000-4010-8010-000000000003',
    v_org_id,
    'Open-KB Admin Created Project',
    'OKBA',
    'Admin-created project used by role matrix tests.',
    'active',
    'private',
    v_admin_id
  );

  UPDATE open_kb.projects
  SET description_text = 'Admin edited project metadata.'
  WHERE id = v_project_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB admin role should update project metadata';
  END IF;

  DELETE FROM open_kb.projects
  WHERE id = v_project_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 0 THEN
    RAISE EXCEPTION 'Open-KB admin role without projects.delete should not delete projects';
  END IF;

  INSERT INTO open_kb.issues (
    id,
    organisation_id,
    project_id,
    title,
    priority,
    created_by
  )
  VALUES (
    '10101010-0000-4010-8010-000000000004',
    v_org_id,
    v_project_id,
    'Open-KB Admin Created Issue',
    'low',
    v_admin_id
  );

  UPDATE open_kb.issues
  SET priority = 'high'
  WHERE id = v_issue_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB admin role should edit issues';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_editor_id::text, true);

  IF NOT open_kb.has_permission(v_org_id, 'issues.edit') THEN
    RAISE EXCEPTION 'Open-KB editor role should edit issues';
  END IF;

  IF open_kb.has_permission(v_org_id, 'projects.edit') THEN
    RAISE EXCEPTION 'Open-KB editor role should not edit project metadata';
  END IF;

  UPDATE open_kb.issues
  SET priority = 'urgent'
  WHERE id = v_issue_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB editor role should update issues';
  END IF;

  UPDATE open_kb.projects
  SET description_text = 'Editor should not update this.'
  WHERE id = v_project_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 0 THEN
    RAISE EXCEPTION 'Open-KB editor role should not update projects';
  END IF;

  DELETE FROM open_kb.issues
  WHERE id = v_issue_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 0 THEN
    RAISE EXCEPTION 'Open-KB editor role without issues.delete should not delete issues';
  END IF;

  INSERT INTO open_kb.issue_comments (
    organisation_id,
    project_id,
    issue_id,
    description_text,
    created_by
  )
  VALUES (
    v_org_id,
    v_project_id,
    v_issue_id,
    'Editor comment should enqueue outbound GitHub sync.',
    v_editor_id
  )
  RETURNING id INTO v_comment_id;

  SELECT open_kb.enqueue_github_comment_sync(v_comment_id) INTO v_sync_id;

  IF v_sync_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB editor comment should enqueue outbound GitHub sync when mapped';
  END IF;

  SELECT open_kb.enqueue_github_comment_sync(v_comment_id) INTO v_second_sync_id;

  IF v_second_sync_id <> v_sync_id THEN
    RAISE EXCEPTION 'Open-KB GitHub comment enqueue should be idempotent for the same comment';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.github_comment_syncs
  WHERE id = v_sync_id
    AND organisation_id = v_org_id
    AND github_repository_id = '10101010-0000-4010-8010-000000000021'
    AND comment_id = v_comment_id
    AND issue_id = v_issue_id
    AND sync_direction = 'outbound'
    AND status = 'outbound_pending';

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB outbound GitHub comment sync row was not queued correctly';
  END IF;

  PERFORM open_kb.retry_provider_sync('github', v_sync_id);

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.github_comment_syncs
  WHERE id = v_sync_id
    AND status = 'retrying'
    AND attempt_count = 0
    AND next_retry_at IS NULL
    AND last_error_text IS NULL;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB integration manager should manually retry outbound GitHub sync rows';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_editor_id::text, true);

  SELECT open_kb.enqueue_slack_comment_sync(v_comment_id) INTO v_slack_inserted_count;

  IF v_slack_inserted_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB editor comment should enqueue one outbound Slack message for the mapped project channel';
  END IF;

  SELECT open_kb.enqueue_slack_comment_sync(v_comment_id) INTO v_second_slack_inserted_count;

  IF v_second_slack_inserted_count <> 0 THEN
    RAISE EXCEPTION 'Open-KB Slack comment enqueue should be idempotent for the same comment/channel';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_owner_id::text, true);

  SELECT id
  INTO v_slack_sync_id
  FROM open_kb.slack_project_syncs
  WHERE organisation_id = v_org_id
    AND project_id = v_project_id
    AND issue_id = v_issue_id
    AND comment_id = v_comment_id
    AND organisation_integration_id = '10101010-0000-4010-8010-000000000023'
    AND channel_id = 'C1234567890'
    AND sync_direction = 'outbound'
    AND status = 'outbound_pending'
  LIMIT 1;

  IF v_slack_sync_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB outbound Slack message sync row was not queued correctly';
  END IF;

  PERFORM open_kb.retry_provider_sync('slack', v_slack_sync_id);

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.slack_project_syncs
  WHERE id = v_slack_sync_id
    AND status = 'retrying'
    AND attempt_count = 0
    AND next_retry_at IS NULL
    AND last_error_text IS NULL;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB integration manager should manually retry outbound Slack sync rows';
  END IF;

  PERFORM open_kb.disconnect_provider_integration(v_org_id, 'github');

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.organisation_integrations
  WHERE id = '10101010-0000-4010-8010-000000000020'
    AND organisation_id = v_org_id
    AND provider = 'github'
    AND status = 'disconnected'
    AND access_token_hash IS NULL;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB integration manager should disconnect GitHub integration metadata';
  END IF;

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.github_repositories
  WHERE id = '10101010-0000-4010-8010-000000000021'
    AND organisation_id = v_org_id
    AND status = 'disabled';

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB GitHub repository mappings should disable on integration disconnect';
  END IF;

  PERFORM open_kb.disconnect_provider_integration(v_org_id, 'slack');

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.organisation_integrations
  WHERE id = '10101010-0000-4010-8010-000000000023'
    AND organisation_id = v_org_id
    AND provider = 'slack'
    AND status = 'disconnected'
    AND access_token_hash IS NULL;

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB integration manager should disconnect Slack integration metadata';
  END IF;

  SELECT count(*)
  INTO v_row_count
  FROM open_kb.slack_project_syncs
  WHERE id = '10101010-0000-4010-8010-000000000024'
    AND organisation_id = v_org_id
    AND sync_direction = 'inbound'
    AND status = 'disabled';

  IF v_row_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB Slack channel mappings should disable on integration disconnect';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_viewer_id::text, true);

  IF NOT open_kb.has_permission(v_org_id, 'issues.view') THEN
    RAISE EXCEPTION 'Open-KB viewer role should view issues';
  END IF;

  IF open_kb.has_permission(v_org_id, 'issues.create') THEN
    RAISE EXCEPTION 'Open-KB viewer role should not create issues';
  END IF;

  BEGIN
    PERFORM open_kb.enqueue_github_comment_sync(v_comment_id);
  EXCEPTION WHEN insufficient_privilege THEN
    v_enqueue_blocked := true;
  END;

  IF NOT v_enqueue_blocked THEN
    RAISE EXCEPTION 'Open-KB viewer role should not enqueue outbound GitHub comment sync';
  END IF;

  BEGIN
    PERFORM open_kb.enqueue_slack_comment_sync(v_comment_id);
  EXCEPTION WHEN insufficient_privilege THEN
    v_slack_enqueue_blocked := true;
  END;

  IF NOT v_slack_enqueue_blocked THEN
    RAISE EXCEPTION 'Open-KB viewer role should not enqueue outbound Slack comment sync';
  END IF;

  BEGIN
    PERFORM open_kb.retry_provider_sync('github', v_sync_id);
  EXCEPTION WHEN insufficient_privilege THEN
    v_retry_blocked := true;
  END;

  IF NOT v_retry_blocked THEN
    RAISE EXCEPTION 'Open-KB viewer role should not retry outbound provider sync rows';
  END IF;

  BEGIN
    PERFORM open_kb.disconnect_provider_integration(v_org_id, 'github');
  EXCEPTION WHEN insufficient_privilege THEN
    v_disconnect_blocked := true;
  END;

  IF NOT v_disconnect_blocked THEN
    RAISE EXCEPTION 'Open-KB viewer role should not disconnect provider integrations';
  END IF;

  SELECT count(*)
  INTO v_issue_count
  FROM open_kb.issues
  WHERE id = v_issue_id
    AND organisation_id = v_org_id;

  IF v_issue_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB viewer role should read issues';
  END IF;

  v_insert_blocked := false;
  BEGIN
    INSERT INTO open_kb.issues (
      id,
      organisation_id,
      project_id,
      title,
      priority,
      created_by
    )
    VALUES (
      '10101010-0000-4010-8010-000000000005',
      v_org_id,
      v_project_id,
      'Viewer should not create issue',
      'none',
      v_viewer_id
    );
  EXCEPTION WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    v_insert_blocked := true;
  END;

  IF NOT v_insert_blocked THEN
    RAISE EXCEPTION 'Open-KB viewer role should not insert issues';
  END IF;

  UPDATE open_kb.issues
  SET priority = 'low'
  WHERE id = v_issue_id
    AND organisation_id = v_org_id;
  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  IF v_row_count <> 0 THEN
    RAISE EXCEPTION 'Open-KB viewer role should not update issues';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_member_id::text, true);

  IF NOT open_kb.has_app_seat(v_org_id) THEN
    RAISE EXCEPTION 'Seeded Open-KB default user should have an app seat';
  END IF;

  IF NOT open_kb.has_permission(v_org_id, 'issues.view') THEN
    RAISE EXCEPTION 'Seeded Open-KB default user should have issue read permission';
  END IF;

  IF open_kb.has_permission(v_org_id, 'issues.edit') THEN
    RAISE EXCEPTION 'Seeded Open-KB default user should not have issue edit permission';
  END IF;

  SELECT count(*)
  INTO v_asset_count
  FROM storage.objects
  WHERE bucket_id = 'open-kb-assets'
    AND name = v_asset_name;

  IF v_asset_count <> 1 THEN
    RAISE EXCEPTION 'Open-KB member with a seat should be able to view organisation assets';
  END IF;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES (
      'open-kb-assets',
      v_denied_asset_name,
      v_member_id,
      '{"size":1,"mimetype":"text/plain"}'::jsonb
    );
  EXCEPTION WHEN insufficient_privilege OR check_violation OR with_check_option_violation THEN
    v_insert_blocked := true;
  END;

  IF NOT v_insert_blocked THEN
    RAISE EXCEPTION 'Open-KB member without edit permission should not be able to write assets';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_no_seat_id::text, true);

  IF open_kb.has_app_seat(v_org_id) THEN
    RAISE EXCEPTION 'Seeded user without an Open-KB seat should not have app access';
  END IF;

  SELECT count(*)
  INTO v_project_count
  FROM open_kb.projects
  WHERE organisation_id = v_org_id;

  IF v_project_count <> 0 THEN
    RAISE EXCEPTION 'User without Open-KB seat should not read Open-KB projects';
  END IF;

  SELECT count(*)
  INTO v_asset_count
  FROM storage.objects
  WHERE bucket_id = 'open-kb-assets'
    AND name = v_asset_name;

  IF v_asset_count <> 0 THEN
    RAISE EXCEPTION 'User without Open-KB seat should not read Open-KB assets';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_cross_org_id::text, true);

  SELECT count(*)
  INTO v_project_count
  FROM open_kb.projects
  WHERE organisation_id = v_org_id;

  IF v_project_count <> 0 THEN
    RAISE EXCEPTION 'Cross-organisation Open-KB user should not read another organisation projects';
  END IF;
END;
$$;

RESET ROLE;

DO $$
DECLARE
  v_active_credentials INTEGER;
BEGIN
  SELECT count(*)
  INTO v_active_credentials
  FROM open_kb.integration_credentials
  WHERE organisation_integration_id IN (
    '10101010-0000-4010-8010-000000000020'::uuid,
    '10101010-0000-4010-8010-000000000023'::uuid
  )
    AND revoked_at IS NULL;

  IF v_active_credentials <> 0 THEN
    RAISE EXCEPTION 'Open-KB provider disconnect should revoke stored integration credentials';
  END IF;
END;
$$;

SELECT pass('Open-KB seeded permissions and storage policies enforce seat and edit boundaries');

SELECT * FROM finish();

ROLLBACK;
