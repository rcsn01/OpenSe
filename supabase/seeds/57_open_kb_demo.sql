-- Open-KB demo/reference data.
-- This seed intentionally uses public.organisations as the tenant boundary.

INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'open-kb', 20),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'open-kb', 8)
ON CONFLICT (org_id, app_code)
DO UPDATE SET seat_limit = EXCLUDED.seat_limit;

INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT om.id, 'open-kb'
FROM public.organisation_members om
WHERE om.org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND om.user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
  )
ON CONFLICT (org_member_id, app_code) DO NOTHING;

INSERT INTO open_kb.feature_flags (organisation_id)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
ON CONFLICT (organisation_id) DO NOTHING;

INSERT INTO open_kb.teams (
  id,
  organisation_id,
  name,
  slug,
  description_text,
  status,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000050',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Knowledge Core',
  'knowledge-core',
  'Organisation-level team grouping for Open-KB launch work.',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status;

INSERT INTO open_kb.projects (
  id,
  organisation_id,
  team_id,
  name,
  identifier,
  description_text,
  status,
  visibility,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000050',
  'Open-KB Launch',
  'OKB',
  'Plane-style project management rebuilt inside OpenSe organisations.',
  'active',
  'public',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (organisation_id, identifier) DO UPDATE
SET name = EXCLUDED.name,
    team_id = EXCLUDED.team_id,
    description_text = EXCLUDED.description_text,
    visibility = EXCLUDED.visibility;

INSERT INTO open_kb.project_deploy_boards (
  id,
  organisation_id,
  project_id,
  name,
  slug,
  title,
  description_text,
  status,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000060',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Open-KB Launch board',
  'okb-launch',
  'Open-KB Launch board',
  'Public read-only board for the seeded Open-KB launch project.',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status;

INSERT INTO open_kb.projects (
  id,
  organisation_id,
  team_id,
  name,
  identifier,
  description_text,
  status,
  visibility,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000050',
  'Customer Feedback Ops',
  'CFO',
  'Feedback triage, intake review, and customer-facing release notes.',
  'active',
  'private',
  '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (organisation_id, identifier) DO UPDATE
SET name = EXCLUDED.name,
    team_id = EXCLUDED.team_id,
    description_text = EXCLUDED.description_text,
    visibility = EXCLUDED.visibility;

INSERT INTO open_kb.project_members (
  id,
  organisation_id,
  project_id,
  profile_id,
  role,
  created_by
)
VALUES
  ('11110000-0000-4000-8000-000000000091', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11111111-1111-1111-1111-111111111111', 'lead', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000092', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000093', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '33333333-3333-3333-3333-333333333333', 'member', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000094', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '22222222-2222-2222-2222-222222222222', 'lead', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (project_id, profile_id) DO UPDATE
SET role = EXCLUDED.role,
    deleted_at = NULL;

INSERT INTO open_kb.webhooks (
  id,
  organisation_id,
  name,
  title,
  url,
  secret_hash,
  events,
  status,
  description_text,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000070',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Launch automation webhook',
  'Launch automation webhook',
  'https://example.com/open-kb/webhook',
  encode(digest('seed-webhook-secret', 'sha256'), 'hex'),
  ARRAY['issue.created', 'issue.updated']::TEXT[],
  'active',
  'Seeded webhook endpoint for Open-KB delivery-log review.',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    title = EXCLUDED.title,
    url = EXCLUDED.url,
    events = EXCLUDED.events,
    status = EXCLUDED.status,
    description_text = EXCLUDED.description_text;

INSERT INTO open_kb.webhook_logs (
  id,
  organisation_id,
  project_id,
  webhook_id,
  name,
  title,
  status,
  external_id,
  http_status,
  attempt_count,
  delivered_at,
  payload,
  metadata,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000071',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000070',
  'issue.updated',
  'Issue updated delivery',
  'success',
  'evt_seed_issue_updated',
  200,
  1,
  timezone('utc'::text, now()),
  '{"event":"issue.updated","issue_key":"OKB-1"}'::jsonb,
  '{"duration_ms":142}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    http_status = EXCLUDED.http_status,
    attempt_count = EXCLUDED.attempt_count,
    delivered_at = EXCLUDED.delivered_at,
    payload = EXCLUDED.payload,
    metadata = EXCLUDED.metadata;

INSERT INTO open_kb.organisation_integrations (
  id,
  organisation_id,
  provider,
  name,
  title,
  status,
  external_account_id,
  scopes,
  created_by
)
VALUES
  (
    '11110000-0000-4000-8000-000000000080',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'github',
    'GitHub',
    'GitHub',
    'connected',
    'seed-github-installation',
    ARRAY['repo', 'issues']::TEXT[],
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000081',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'slack',
    'Slack',
    'Slack',
    'connected',
    'TSEEDOPENKB',
    ARRAY['channels:read', 'chat:write']::TEXT[],
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    external_account_id = EXCLUDED.external_account_id,
    scopes = EXCLUDED.scopes;

INSERT INTO open_kb.github_repositories (
  id,
  organisation_id,
  project_id,
  organisation_integration_id,
  repository_owner,
  repository_name,
  installation_id,
  default_branch,
  name,
  title,
  status,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000082',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000080',
  'opense',
  'open-kb-demo',
  'seed-installation',
  'main',
  'opense/open-kb-demo',
  'opense/open-kb-demo',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET repository_owner = EXCLUDED.repository_owner,
    repository_name = EXCLUDED.repository_name,
    status = EXCLUDED.status;

INSERT INTO open_kb.github_repository_syncs (
  id,
  organisation_id,
  project_id,
  github_repository_id,
  sync_type,
  name,
  title,
  status,
  external_id,
  payload,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000083',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000082',
  'issues',
  'issues',
  'Seed GitHub issue sync',
  'received',
  'seed-github-delivery',
  '{"event":"issues","repository":"opense/open-kb-demo"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload;

INSERT INTO open_kb.slack_project_syncs (
  id,
  organisation_id,
  project_id,
  organisation_integration_id,
  channel_id,
  channel_name,
  name,
  title,
  status,
  external_id,
  payload,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000000084',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000081',
  'COPENKBSEED',
  '#open-kb-launch',
  '#open-kb-launch',
  '#open-kb-launch',
  'active',
  'seed-slack-channel',
  '{"purpose":"Seed Slack project sync"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET channel_id = EXCLUDED.channel_id,
    channel_name = EXCLUDED.channel_name,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload;

DELETE FROM open_kb.states
WHERE project_id = '11110000-0000-4000-8000-000000000001'
  AND name IN ('Backlog', 'In Progress', 'Done')
  AND id NOT IN (
    '11110000-0000-4000-8000-000000000101',
    '11110000-0000-4000-8000-000000000102',
    '11110000-0000-4000-8000-000000000103'
  );

INSERT INTO open_kb.states (id, organisation_id, project_id, name, group_key, color, sort_order, is_default, created_by)
VALUES
  ('11110000-0000-4000-8000-000000000101', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'Backlog', 'backlog', '#64748b', 10, true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000102', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'In Progress', 'started', '#2563eb', 20, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000103', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'Done', 'completed', '#16a34a', 30, false, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    group_key = EXCLUDED.group_key,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order;

INSERT INTO open_kb.labels (id, organisation_id, project_id, name, color, created_by)
VALUES
  ('11110000-0000-4000-8000-000000000201', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'frontend', '#7c3aed', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000202', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'database', '#0f766e', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color;

INSERT INTO open_kb.cycles (id, organisation_id, project_id, name, description_text, starts_at, ends_at, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000301',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Foundation Slice',
  'App shell, organisation-scoped schema, and project basics.',
  CURRENT_DATE,
  CURRENT_DATE + 14,
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status;

INSERT INTO open_kb.modules (id, organisation_id, project_id, name, description_text, lead_profile_id, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000401',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Project Core',
  'Projects, issues, states, labels, and rich text editing.',
  '11111111-1111-1111-1111-111111111111',
  'in_progress',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status;

INSERT INTO open_kb.estimates (id, organisation_id, project_id, name, description_text, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000451',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Fibonacci',
  'Default Open-KB estimate scale for issue sizing.',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description_text = EXCLUDED.description_text;

INSERT INTO open_kb.estimate_points (id, organisation_id, project_id, estimate_id, name, value, sort_order, created_by)
VALUES
  ('11110000-0000-4000-8000-000000000461', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000451', '1 point', 1, 10, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000462', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000451', '2 points', 2, 20, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000463', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000451', '3 points', 3, 30, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000464', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000451', '5 points', 5, 40, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    value = EXCLUDED.value,
    sort_order = EXCLUDED.sort_order,
    deleted_at = NULL;

INSERT INTO open_kb.issues (id, organisation_id, project_id, sequence_id, title, description_text, priority, state_id, estimate_point_id, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000501',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    1,
    'Implement Open-KB project foundation',
    'Create the Open-KB app shell and organisation-scoped Plane table foundation.',
    'high',
    '11110000-0000-4000-8000-000000000102',
    '11110000-0000-4000-8000-000000000463',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000502',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    2,
    'Wire Open-KB account seat assignment',
    'Expose Open-KB in Accounts billing and seat management so owners can assign access.',
    'urgent',
    '11110000-0000-4000-8000-000000000103',
    '11110000-0000-4000-8000-000000000464',
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '11110000-0000-4000-8000-000000000503',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    3,
    'Rebuild rich text editor surface',
    'Keep the editor implementation app-local while storing stable JSON, HTML, and text snapshots.',
    'medium',
    '11110000-0000-4000-8000-000000000101',
    '11110000-0000-4000-8000-000000000462',
    '33333333-3333-3333-3333-333333333333'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    priority = EXCLUDED.priority,
    state_id = EXCLUDED.state_id,
    estimate_point_id = EXCLUDED.estimate_point_id;

INSERT INTO open_kb.issue_assignees (id, organisation_id, project_id, issue_id, profile_id, created_by)
VALUES
  ('11110000-0000-4000-8000-000000000521', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000501', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000522', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000502', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000523', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000503', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET profile_id = EXCLUDED.profile_id,
    deleted_at = NULL;

INSERT INTO open_kb.issue_labels (id, organisation_id, project_id, issue_id, label_id, created_by)
VALUES
  ('11110000-0000-4000-8000-000000000531', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000501', '11110000-0000-4000-8000-000000000201', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000532', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000502', '11110000-0000-4000-8000-000000000202', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000533', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000503', '11110000-0000-4000-8000-000000000201', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET label_id = EXCLUDED.label_id,
    deleted_at = NULL;

INSERT INTO open_kb.cycle_issues (id, organisation_id, project_id, issue_id, cycle_id, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000541',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000501',
  '11110000-0000-4000-8000-000000000301',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET cycle_id = EXCLUDED.cycle_id,
    deleted_at = NULL;

INSERT INTO open_kb.module_issues (id, organisation_id, project_id, issue_id, module_id, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000542',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000501',
  '11110000-0000-4000-8000-000000000401',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET module_id = EXCLUDED.module_id,
    deleted_at = NULL;

INSERT INTO open_kb.issue_comments (id, organisation_id, project_id, issue_id, description_text, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000551',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000501',
    'This issue exercises the Open-KB issue comments table without importing Plane editor code.',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000552',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000502',
    'Seat management now covers Open-KB alongside ETL and StoQR.',
    '22222222-2222-2222-2222-222222222222'
  )
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text;

INSERT INTO open_kb.issue_activities (id, organisation_id, project_id, issue_id, actor_profile_id, name, title, description_text, status, payload, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000553',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000501',
    '11111111-1111-1111-1111-111111111111',
    'issue.created',
    'Issue created',
    'Seeded launch issue created by Founder.',
    'completed',
    '{"field":"status","value":"started"}'::jsonb,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000554',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000502',
    '22222222-2222-2222-2222-222222222222',
    'issue.completed',
    'Issue completed',
    'Open-KB seats can be assigned from Accounts.',
    'completed',
    '{"state":"Done"}'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_links (id, organisation_id, project_id, issue_id, title, url, link_type, description_text, status, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000555',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000501',
    'Plane source reference',
    'https://github.com/makeplane/plane',
    'repository',
    'Original product reference for Open-KB parity planning.',
    'active',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000556',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000503',
    'Editor implementation notes',
    'https://example.com/open-kb/editor-notes',
    'document',
    'Internal reference for editor serialization and storage.',
    'active',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    url = EXCLUDED.url,
    link_type = EXCLUDED.link_type,
    description_text = EXCLUDED.description_text,
    deleted_at = NULL;

INSERT INTO open_kb.issue_relations (id, organisation_id, project_id, issue_id, related_issue_id, relation_type, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000557',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000503',
  '11110000-0000-4000-8000-000000000501',
  'related',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET related_issue_id = EXCLUDED.related_issue_id,
    relation_type = EXCLUDED.relation_type,
    deleted_at = NULL;

INSERT INTO open_kb.issue_blockers (id, organisation_id, project_id, issue_id, blocker_issue_id, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000558',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000503',
  '11110000-0000-4000-8000-000000000501',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET blocker_issue_id = EXCLUDED.blocker_issue_id,
    deleted_at = NULL;

INSERT INTO open_kb.issue_subscribers (id, organisation_id, project_id, issue_id, profile_id, created_by)
VALUES
  ('11110000-0000-4000-8000-000000000559', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000501', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000000560', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', '11110000-0000-4000-8000-000000000502', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET profile_id = EXCLUDED.profile_id,
    deleted_at = NULL;

INSERT INTO open_kb.issue_votes (id, organisation_id, project_id, issue_id, profile_id, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000561',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000503',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO UPDATE
SET profile_id = EXCLUDED.profile_id,
    deleted_at = NULL;

INSERT INTO open_kb.issue_reactions (id, organisation_id, project_id, issue_id, profile_id, name, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000562',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000502',
  '33333333-3333-3333-3333-333333333333',
  'ship-it',
  '33333333-3333-3333-3333-333333333333'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    deleted_at = NULL;

INSERT INTO open_kb.comment_reactions (id, organisation_id, project_id, issue_id, comment_id, profile_id, name, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000563',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000502',
  '11110000-0000-4000-8000-000000000552',
  '11111111-1111-1111-1111-111111111111',
  'seen',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    deleted_at = NULL;

INSERT INTO open_kb.issue_views (id, organisation_id, project_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000571',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'High priority launch work',
  'High priority launch work',
  'active',
  '{"view":"list","filters":{"project_id":"11110000-0000-4000-8000-000000000001","priority":"high"}}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    title = EXCLUDED.title,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.intakes (id, organisation_id, project_id, name, title, description_text, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000581',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Launch intake',
  'Launch intake',
  'Requests that need triage before they become planned Open-KB issues.',
  'open',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.intake_issues (id, organisation_id, project_id, intake_id, name, title, description_text, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000582',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11110000-0000-4000-8000-000000000581',
  'Add public feedback triage',
  'Add public feedback triage',
  'Capture requests in an intake inbox before promotion into issues.',
  'submitted',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.analytic_views (id, organisation_id, project_id, name, title, description_text, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000591',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Launch health',
  'Launch health',
  'Default analytics report for Open-KB launch work.',
  'active',
  '{"sections":["metrics","trend","priority","state","project"]}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.draft_issues (id, organisation_id, project_id, profile_id, title, description_text, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000621',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Draft: import Plane-style cycles',
  'Draft issue kept out of the main issue list until triage is complete.',
  'draft',
  '{"priority":"low","labels":["planning"]}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.user_favorites (id, organisation_id, project_id, issue_id, profile_id, name, title, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000641',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'project',
    'Open-KB Launch',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000642',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000502',
    '11111111-1111-1111-1111-111111111111',
    'issue',
    'Wire Open-KB account seat assignment',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    deleted_at = NULL;

INSERT INTO open_kb.user_recent_visits (id, organisation_id, project_id, issue_id, profile_id, name, title, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000651',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'project',
    'Open-KB Launch',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000652',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000501',
    '11111111-1111-1111-1111-111111111111',
    'issue',
    'Implement Open-KB project foundation',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    updated_at = timezone('utc'::text, now()),
    deleted_at = NULL;

INSERT INTO open_kb.user_notification_preferences (id, organisation_id, profile_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000661',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'founder-defaults',
  'Founder notification defaults',
  'active',
  '{"email":true,"in_app":true,"issue_activity":true}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.notifications (id, organisation_id, project_id, issue_id, profile_id, actor_profile_id, name, title, description_text, status, payload, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000671',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000502',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'issue.completed',
    'Seat assignment work completed',
    'Open-KB has been wired into Accounts seat management.',
    'unread',
    '{"issue_key":"OKB-2"}'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  ),
  (
    '11110000-0000-4000-8000-000000000672',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000503',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'issue.comment',
    'Editor implementation note added',
    'Rich text storage now keeps JSON, HTML, and text snapshots.',
    'read',
    '{"issue_key":"OKB-3"}'::jsonb,
    '33333333-3333-3333-3333-333333333333'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

-- Expanded founder demo data.
-- Founder should always be able to see every seeded project after setup.sh.

INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT om.id, 'open-kb'
FROM public.organisation_members om
WHERE om.org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ON CONFLICT (org_member_id, app_code) DO NOTHING;

INSERT INTO open_kb.organisation_member_roles (org_member_id, role_id)
SELECT
  om.id,
  open_kb.ensure_role(
    om.org_id,
    CASE WHEN om.role = 'owner' THEN 'Owner' ELSE 'Default' END,
    CASE WHEN om.role = 'owner' THEN 1000 ELSE 100 END
  )
FROM public.organisation_members om
WHERE om.org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ON CONFLICT (org_member_id) DO UPDATE
SET role_id = EXCLUDED.role_id;

INSERT INTO open_kb.feature_flags (
  organisation_id,
  github_sync_enabled,
  slack_sync_enabled,
  api_tokens_enabled,
  updated_by
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  true,
  true,
  true,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (organisation_id) DO UPDATE
SET github_sync_enabled = EXCLUDED.github_sync_enabled,
    slack_sync_enabled = EXCLUDED.slack_sync_enabled,
    api_tokens_enabled = EXCLUDED.api_tokens_enabled,
    updated_by = EXCLUDED.updated_by,
    updated_at = timezone('utc'::text, now());

INSERT INTO open_kb.teams (id, organisation_id, name, slug, description_text, status, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Product Systems', 'product-systems', 'Product, project, and implementation planning for Open-KB.', 'active', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Operations Desk', 'operations-desk', 'Operational issue triage, customer feedback, and release coordination.', 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.projects (
  id,
  organisation_id,
  team_id,
  name,
  identifier,
  description_text,
  status,
  visibility,
  sort_order,
  settings,
  metadata,
  created_by
)
VALUES
  (
    '11110000-0000-4000-8000-000000001101',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000001001',
    'Knowledge Base Migration',
    'KBM',
  'Move existing project knowledge, decisions, and release notes into Open-KB issues.',
    'active',
    'private',
    20,
    '{"default_view":"kanban","cycle_enabled":true}'::jsonb,
    '{"demo":"seed","health":"amber"}'::jsonb,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000001102',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000001002',
    'Integrations Reliability',
    'INT',
    'Track GitHub, Slack, webhook, importer, exporter, and API token reliability work.',
    'active',
    'public',
    30,
    '{"default_view":"list","provider_syncs":true}'::jsonb,
    '{"demo":"seed","health":"green"}'::jsonb,
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (organisation_id, identifier) DO UPDATE
SET name = EXCLUDED.name,
    team_id = EXCLUDED.team_id,
    description_text = EXCLUDED.description_text,
    visibility = EXCLUDED.visibility,
    sort_order = EXCLUDED.sort_order,
    settings = EXCLUDED.settings,
    metadata = EXCLUDED.metadata,
    deleted_at = NULL;

INSERT INTO open_kb.project_members (organisation_id, project_id, profile_id, role, created_by)
SELECT
  p.organisation_id,
  p.id,
  om.user_id,
  CASE
    WHEN om.user_id = '11111111-1111-1111-1111-111111111111' THEN 'lead'
    WHEN om.role = 'admin' THEN 'admin'
    WHEN om.role = 'owner' THEN 'lead'
    ELSE 'member'
  END,
  '11111111-1111-1111-1111-111111111111'
FROM open_kb.projects p
JOIN public.organisation_members om
  ON om.org_id = p.organisation_id
WHERE p.organisation_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND om.user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  )
ON CONFLICT (project_id, profile_id) DO UPDATE
SET role = EXCLUDED.role,
    deleted_at = NULL;

INSERT INTO open_kb.project_identifiers (id, organisation_id, project_id, name, title, status, payload, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001121', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'OKB', 'Open-KB Launch identifier', 'active', '{"next_sequence":25}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001122', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'KBM', 'Knowledge Base Migration identifier', 'active', '{"next_sequence":12}'::jsonb, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.project_member_invites (id, organisation_id, project_id, profile_id, name, title, external_id, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001123',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '55555555-5555-5555-5555-555555555555',
  'pending-collaborator',
  'Pending collaborator invite',
  'invite-open-kb-demo',
  'pending',
  '{"email":"ops.member@example.com","role":"member"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.project_public_members (id, organisation_id, project_id, profile_id, name, title, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001124',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11111111-1111-1111-1111-111111111111',
  'public-maintainer',
  'Public board maintainer',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.project_user_properties (id, organisation_id, project_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001125',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'founder-project-preferences',
  'Founder project preferences',
  '{"view":"kanban","density":"compact","group_by":"state"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.organisation_themes (id, organisation_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001126',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'maison-aurelia-open-kb',
  'Maison Aurelia Open-KB theme',
  'active',
  '{"accent":"#2563eb","surface":"#ffffff","density":"comfortable"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.organisation_user_properties (id, organisation_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001127',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'founder-open-kb-properties',
  'Founder Open-KB properties',
  '{"timezone":"Australia/Sydney","landing":"dashboard"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.organisation_user_links (id, organisation_id, profile_id, name, title, external_id, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001128',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'founder-github',
  'Founder GitHub link',
  'github:founder',
  '{"provider":"github","handle":"founder"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.organisation_home_preferences (id, organisation_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001129',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'founder-home',
  'Founder home layout',
  '{"sections":["assigned","recent","favorites","analytics"]}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.organisation_user_preferences (id, organisation_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001130',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'founder-preferences',
  'Founder user preferences',
  '{"theme":"system","email_digest":"daily","sidebar":"expanded"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

DELETE FROM open_kb.states
WHERE project_id = '11110000-0000-4000-8000-000000000002'
  AND name IN ('Backlog', 'Triage', 'In Progress', 'Investigating', 'Done', 'Resolved')
  AND id NOT IN (
    '11110000-0000-4000-8000-000000001201',
    '11110000-0000-4000-8000-000000001202',
    '11110000-0000-4000-8000-000000001203',
    '11110000-0000-4000-8000-000000001204',
    '11110000-0000-4000-8000-000000001205'
  );

INSERT INTO open_kb.states (id, organisation_id, project_id, name, group_key, color, sort_order, is_default, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001201', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Waiting', 'backlog', '#64748b', 10, true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001202', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Todo', 'backlog', '#64748b', 20, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001203', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'In Progress', 'started', '#2563eb', 30, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001204', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Blocked', 'blocked', '#dc2626', 40, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001205', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Completed', 'completed', '#16a34a', 50, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001211', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Backlog', 'backlog', '#64748b', 10, true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001212', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Migrating', 'started', '#7c3aed', 20, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001213', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Published', 'completed', '#16a34a', 30, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Queued', 'backlog', '#64748b', 10, true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Retrying', 'started', '#ea580c', 20, false, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001223', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Healthy', 'completed', '#16a34a', 30, false, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    group_key = EXCLUDED.group_key,
    color = EXCLUDED.color,
    sort_order = EXCLUDED.sort_order,
    is_default = EXCLUDED.is_default,
    deleted_at = NULL;

INSERT INTO open_kb.labels (id, organisation_id, project_id, name, color, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001231', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'customer', '#0891b2', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001232', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'bug', '#dc2626', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001233', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'docs', '#0f766e', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001234', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'migration', '#7c3aed', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001235', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'github', '#111827', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001236', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'slack', '#9333ea', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color,
    deleted_at = NULL;

INSERT INTO open_kb.issue_types (id, organisation_id, project_id, name, icon, color, is_default, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001241', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000001', 'Task', 'CheckSquare', '#2563eb', true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001242', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Bug', 'Bug', '#dc2626', true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001243', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Story', 'BookOpen', '#0f766e', true, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001244', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Incident', 'Activity', '#ea580c', true, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    deleted_at = NULL;

INSERT INTO open_kb.cycles (id, organisation_id, project_id, name, description_text, starts_at, ends_at, status, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001251', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Feedback Week 1', 'Triage customer feedback and turn validated requests into issues.', CURRENT_DATE - 3, CURRENT_DATE + 4, 'active', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001252', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Migration Sprint', 'Move docs, decisions, and release notes into Open-KB issues.', CURRENT_DATE, CURRENT_DATE + 14, 'active', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001253', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Provider Hardening', 'Exercise retry queues, provider settings, and webhook delivery logs.', CURRENT_DATE + 1, CURRENT_DATE + 15, 'draft', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description_text = EXCLUDED.description_text,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.modules (id, organisation_id, project_id, name, description_text, lead_profile_id, status, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001261', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Feedback Intake', 'Customer feedback intake and triage workflow.', '22222222-2222-2222-2222-222222222222', 'in_progress', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001262', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Documentation Import', 'Import old project notes into Open-KB issues.', '11111111-1111-1111-1111-111111111111', 'planned', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001263', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Provider Sync', 'GitHub, Slack, and webhook provider queue reliability.', '33333333-3333-3333-3333-333333333333', 'in_progress', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description_text = EXCLUDED.description_text,
    lead_profile_id = EXCLUDED.lead_profile_id,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.estimates (id, organisation_id, project_id, name, description_text, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001271', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'Feedback points', 'Small sizing scale for triage work.', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001272', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Migration points', 'Sizing scale for migration and documentation tasks.', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001273', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Reliability points', 'Sizing scale for provider reliability work.', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description_text = EXCLUDED.description_text,
    deleted_at = NULL;

INSERT INTO open_kb.estimate_points (id, organisation_id, project_id, estimate_id, name, value, sort_order, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001281', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001271', 'Small', 1, 10, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001282', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001271', 'Medium', 3, 20, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001283', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001272', 'Small', 1, 10, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001284', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001272', 'Large', 5, 20, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001285', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001273', 'Small', 1, 10, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001286', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001273', 'Medium', 3, 20, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    estimate_id = EXCLUDED.estimate_id,
    value = EXCLUDED.value,
    sort_order = EXCLUDED.sort_order,
    deleted_at = NULL;

INSERT INTO open_kb.issues (
  id,
  organisation_id,
  project_id,
  sequence_id,
  title,
  description_text,
  priority,
  state_id,
  issue_type_id,
  estimate_point_id,
  target_date,
  external_id,
  metadata,
  created_by
)
VALUES
  ('11110000-0000-4000-8000-000000001301', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 1, 'Triage refund feedback from store teams', 'Group customer-facing refund feedback into actionable fixes.', 'high', '11110000-0000-4000-8000-000000001203', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001282', CURRENT_DATE + 2, 'cfo-1', '{"source":"seed","area":"feedback"}'::jsonb, '22222222-2222-2222-2222-222222222222'),
  ('11110000-0000-4000-8000-000000001302', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 2, 'Draft customer release note template', 'Create a repeatable release note template for customer-facing changes.', 'medium', '11110000-0000-4000-8000-000000001202', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001281', CURRENT_DATE + 5, 'cfo-2', '{"source":"seed","area":"release-notes"}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('11110000-0000-4000-8000-000000001307', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 3, 'Slow Finder (Cancelled?)', 'Review whether Finder slowness reports are still valid after the last desktop patch.', 'low', '11110000-0000-4000-8000-000000001201', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001281', CURRENT_DATE + 1, 'cfo-3', '{"source":"seed","area":"desktop-feedback"}'::jsonb, '44444444-4444-4444-4444-444444444444'),
  ('11110000-0000-4000-8000-000000001308', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 4, 'Salesforce?', 'Confirm whether the sales team still needs a Salesforce import request path.', 'none', '11110000-0000-4000-8000-000000001201', '11110000-0000-4000-8000-000000001242', NULL, NULL, 'cfo-4', '{"source":"seed","area":"integrations"}'::jsonb, '22222222-2222-2222-2222-222222222222'),
  ('11110000-0000-4000-8000-000000001309', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 5, 'Some random automation stuff Raz mentioned about support queues', 'Turn the loose automation idea into a concrete intake workflow proposal.', 'medium', '11110000-0000-4000-8000-000000001201', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001282', CURRENT_DATE + 8, 'cfo-5', '{"source":"seed","area":"automation"}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('11110000-0000-4000-8000-000000001310', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 6, 'MiniPearl', 'Investigate MiniPearl feedback and identify the first customer-visible fix.', 'high', '11110000-0000-4000-8000-000000001203', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001282', CURRENT_DATE + 3, 'cfo-6', '{"source":"seed","area":"feedback"}'::jsonb, '22222222-2222-2222-2222-222222222222'),
  ('11110000-0000-4000-8000-000000001311', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 7, 'StoQR (formally fill the shelf)', 'Clean up legacy wording and customer notes around the StoQR rename.', 'medium', '11110000-0000-4000-8000-000000001203', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001281', CURRENT_DATE + 6, 'cfo-7', '{"source":"seed","area":"release-notes"}'::jsonb, '44444444-4444-4444-4444-444444444444'),
  ('11110000-0000-4000-8000-000000001312', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 8, 'Pearl', 'Blocked on a product decision before the Pearl response can ship.', 'urgent', '11110000-0000-4000-8000-000000001204', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001282', CURRENT_DATE + 1, 'cfo-8', '{"source":"seed","blocked_by":"product decision"}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('11110000-0000-4000-8000-000000001313', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 9, 'Tanya Plugin Adjustment', 'Customer-facing plugin adjustment is complete and ready for release notes.', 'medium', '11110000-0000-4000-8000-000000001205', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001281', CURRENT_DATE - 2, 'cfo-9', '{"source":"seed","area":"plugins"}'::jsonb, '22222222-2222-2222-2222-222222222222'),
  ('11110000-0000-4000-8000-000000001314', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 10, 'Insignia QR Code Scanner', 'Resolved scanner feedback and verified customer instructions.', 'low', '11110000-0000-4000-8000-000000001205', '11110000-0000-4000-8000-000000001242', '11110000-0000-4000-8000-000000001281', CURRENT_DATE - 1, 'cfo-10', '{"source":"seed","area":"scanner"}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001303', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 1, 'Import architecture decision records', 'Capture prior architecture decisions and link them to migration issues.', 'urgent', '11110000-0000-4000-8000-000000001212', '11110000-0000-4000-8000-000000001243', '11110000-0000-4000-8000-000000001284', CURRENT_DATE + 7, 'kbm-1', '{"source":"seed","area":"docs"}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001304', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 2, 'Build project launch handbook', 'Publish a handbook that explains how Open-KB projects should be run.', 'medium', '11110000-0000-4000-8000-000000001211', '11110000-0000-4000-8000-000000001243', '11110000-0000-4000-8000-000000001283', CURRENT_DATE + 10, 'kbm-2', '{"source":"seed","area":"handbook"}'::jsonb, '44444444-4444-4444-4444-444444444444'),
  ('11110000-0000-4000-8000-000000001305', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 1, 'Retry GitHub repository sync failures', 'Investigate failed GitHub issue sync queue items and improve retry visibility.', 'high', '11110000-0000-4000-8000-000000001222', '11110000-0000-4000-8000-000000001244', '11110000-0000-4000-8000-000000001286', CURRENT_DATE + 3, 'int-1', '{"source":"seed","provider":"github"}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('11110000-0000-4000-8000-000000001306', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 2, 'Verify Slack outbound comment sync', 'Confirm comments created in Open-KB can appear in the configured Slack channel.', 'low', '11110000-0000-4000-8000-000000001221', '11110000-0000-4000-8000-000000001244', '11110000-0000-4000-8000-000000001285', CURRENT_DATE + 9, 'int-2', '{"source":"seed","provider":"slack"}'::jsonb, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    priority = EXCLUDED.priority,
    state_id = EXCLUDED.state_id,
    issue_type_id = EXCLUDED.issue_type_id,
    estimate_point_id = EXCLUDED.estimate_point_id,
    target_date = EXCLUDED.target_date,
    metadata = EXCLUDED.metadata,
    deleted_at = NULL;

INSERT INTO open_kb.issue_sequences (id, organisation_id, project_id, name, title, payload, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001321', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', 'CFO sequence', 'Customer Feedback Ops sequence', '{"next":11}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001322', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'KBM sequence', 'Knowledge Base Migration sequence', '{"next":3}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001323', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'INT sequence', 'Integrations Reliability sequence', '{"next":3}'::jsonb, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_assignees (organisation_id, project_id, issue_id, profile_id, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001301', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001302', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001307', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001310', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001311', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001312', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001313', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001304', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001306', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.issue_mentions (organisation_id, project_id, issue_id, profile_id, name, title, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '22222222-2222-2222-2222-222222222222', 'mention', 'Mentioned in migration issue', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '11111111-1111-1111-1111-111111111111', 'mention', 'Mentioned in provider issue', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.issue_labels (organisation_id, project_id, issue_id, label_id, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001301', '11110000-0000-4000-8000-000000001232', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001302', '11110000-0000-4000-8000-000000001231', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001307', '11110000-0000-4000-8000-000000001231', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001309', '11110000-0000-4000-8000-000000001231', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001312', '11110000-0000-4000-8000-000000001232', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001314', '11110000-0000-4000-8000-000000001231', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '11110000-0000-4000-8000-000000001234', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001304', '11110000-0000-4000-8000-000000001233', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '11110000-0000-4000-8000-000000001235', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001306', '11110000-0000-4000-8000-000000001236', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.cycle_issues (organisation_id, project_id, issue_id, cycle_id, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001301', '11110000-0000-4000-8000-000000001251', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001310', '11110000-0000-4000-8000-000000001251', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001312', '11110000-0000-4000-8000-000000001251', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '11110000-0000-4000-8000-000000001252', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '11110000-0000-4000-8000-000000001253', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.module_issues (organisation_id, project_id, issue_id, module_id, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001301', '11110000-0000-4000-8000-000000001261', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001310', '11110000-0000-4000-8000-000000001261', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000000002', '11110000-0000-4000-8000-000000001311', '11110000-0000-4000-8000-000000001261', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '11110000-0000-4000-8000-000000001262', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '11110000-0000-4000-8000-000000001263', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.module_members (id, organisation_id, project_id, profile_id, name, title, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001331',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '33333333-3333-3333-3333-333333333333',
  'provider-sync-owner',
  'Provider sync owner',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.module_links (id, organisation_id, project_id, name, title, description_text, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001332',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  'provider-runbook',
  'Provider sync runbook',
  'Runbook link for provider queue recovery.',
  '{"url":"https://example.com/open-kb/provider-runbook"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.module_user_properties (id, organisation_id, project_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001333',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '33333333-3333-3333-3333-333333333333',
  'provider-module-prefs',
  'Provider module preferences',
  '{"collapsed":false,"sort":"priority"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.cycle_user_properties (id, organisation_id, project_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001334',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11111111-1111-1111-1111-111111111111',
  'migration-cycle-prefs',
  'Migration cycle preferences',
  '{"view":"burndown","show_completed":true}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_comments (id, organisation_id, project_id, issue_id, description_text, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001341', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', 'Imported ADRs should keep links back to their original documents.', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001342', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', 'Retry queue needs visible status and the last provider error.', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    deleted_at = NULL;

INSERT INTO open_kb.issue_attachments (id, organisation_id, project_id, issue_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001343',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001303',
  'adr-export.zip',
  'ADR export archive',
  'available',
  '{"bucket":"open-kb-assets","path":"demo/adr-export.zip","size_bytes":48192}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_activities (id, organisation_id, project_id, issue_id, actor_profile_id, name, title, description_text, status, payload, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001344', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '11111111-1111-1111-1111-111111111111', 'issue.assigned', 'Issue assigned', 'Founder assigned migration ownership.', 'completed', '{"assignee":"founder"}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001345', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '33333333-3333-3333-3333-333333333333', 'provider.sync.failed', 'Provider sync failed', 'GitHub sync failed once and is queued for retry.', 'retrying', '{"attempt":1,"provider":"github"}'::jsonb, '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_versions (id, organisation_id, project_id, issue_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001346',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001303',
  'kbm-1-v1',
  'KBM-1 initial version',
  '{"version":1,"fields":["title","description","priority"]}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_description_versions (id, organisation_id, project_id, issue_id, name, title, description_text, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001347',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001303',
  'kbm-1-description-v1',
  'KBM-1 description v1',
  'Initial migration description snapshot.',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    deleted_at = NULL;

INSERT INTO open_kb.issue_links (id, organisation_id, project_id, issue_id, title, url, link_type, description_text, status, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001348', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', 'Legacy ADR folder', 'https://example.com/legacy/adr', 'document', 'Original ADR export source.', 'active', '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001349', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', 'GitHub retry run', 'https://example.com/open-kb/github-retry', 'support', 'Support note for GitHub retry behavior.', 'active', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    url = EXCLUDED.url,
    link_type = EXCLUDED.link_type,
    deleted_at = NULL;

INSERT INTO open_kb.issue_blockers (organisation_id, project_id, issue_id, blocker_issue_id, created_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001304',
  '11110000-0000-4000-8000-000000001303',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.issue_relations (organisation_id, project_id, issue_id, related_issue_id, relation_type, created_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001306',
  '11110000-0000-4000-8000-000000001305',
  'related',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.issue_subscribers (organisation_id, project_id, issue_id, profile_id, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.issue_votes (organisation_id, project_id, issue_id, profile_id, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.issue_reactions (organisation_id, project_id, issue_id, profile_id, name, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11110000-0000-4000-8000-000000001303', '22222222-2222-2222-2222-222222222222', 'eyes', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '11110000-0000-4000-8000-000000001305', '11111111-1111-1111-1111-111111111111', 'priority', '11111111-1111-1111-1111-111111111111')
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.comment_reactions (organisation_id, project_id, issue_id, comment_id, profile_id, name, created_by)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001305',
  '11110000-0000-4000-8000-000000001342',
  '11111111-1111-1111-1111-111111111111',
  'ack',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT DO NOTHING;

INSERT INTO open_kb.project_issue_types (id, organisation_id, project_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001350',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  'incident',
  'Incident project issue type config',
  '{"issue_type_id":"11110000-0000-4000-8000-000000001244","default_priority":"high"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.descriptions (id, organisation_id, project_id, issue_id, name, title, description_text, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001425',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001303',
  'kbm-1-description',
  'KBM-1 rich description',
  'Rich text source snapshot for the migration issue.',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    deleted_at = NULL;

INSERT INTO open_kb.description_versions (id, organisation_id, project_id, issue_id, name, title, description_text, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001426',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001303',
  'kbm-1-description-version',
  'KBM-1 rich description v1',
  'First rich text description version for the migration issue.',
  '{"version":1}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.draft_issues (id, organisation_id, project_id, profile_id, title, description_text, status, payload, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', '11111111-1111-1111-1111-111111111111', 'Draft: archive imported duplicate notes', 'Draft issue for deduplicating imported knowledge notes.', 'draft', '{"priority":"medium"}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001502', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', '33333333-3333-3333-3333-333333333333', 'Draft: provider health dashboard', 'Draft issue for adding provider health metrics to analytics.', 'draft', '{"priority":"low"}'::jsonb, '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.draft_issue_assignees (id, organisation_id, project_id, profile_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001511',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11111111-1111-1111-1111-111111111111',
  'draft-assignee',
  'Draft issue assignee',
  '{"draft_issue_id":"11110000-0000-4000-8000-000000001501"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.draft_issue_labels (id, organisation_id, project_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001512',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  'draft-migration-label',
  'Draft migration label',
  '{"draft_issue_id":"11110000-0000-4000-8000-000000001501","label_id":"11110000-0000-4000-8000-000000001234"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.draft_issue_modules (id, organisation_id, project_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001513',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  'draft-module-link',
  'Draft module link',
  '{"draft_issue_id":"11110000-0000-4000-8000-000000001501","module_id":"11110000-0000-4000-8000-000000001262"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.draft_issue_cycles (id, organisation_id, project_id, name, title, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001514',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  'draft-cycle-link',
  'Draft cycle link',
  '{"draft_issue_id":"11110000-0000-4000-8000-000000001501","cycle_id":"11110000-0000-4000-8000-000000001252"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.deploy_boards (id, organisation_id, name, slug, title, description_text, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001601',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Open-KB public roadmap',
  'open-kb-public-roadmap',
  'Open-KB public roadmap',
  'Organisation-level deploy board demo.',
  'active',
  '{"visibility":"public"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.project_deploy_boards (id, organisation_id, project_id, name, slug, title, description_text, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001602',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  'Integrations reliability board',
  'integrations-reliability',
  'Integrations reliability board',
  'Public board for integration reliability work.',
  'active',
  '{"deploy_board_id":"11110000-0000-4000-8000-000000001601"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.importers (id, organisation_id, project_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001611',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  'Legacy docs CSV importer',
  'Legacy docs CSV importer',
  'completed',
  '{"source":"csv","rows":42,"imported":39,"skipped":3}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.exporters (id, organisation_id, project_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001612',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  'Provider queue CSV export',
  'Provider queue CSV export',
  'completed',
  '{"format":"csv","rows":18,"url":"https://example.com/export/provider-queue.csv"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.webhooks (id, organisation_id, name, title, url, secret_hash, events, status, description_text, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001621',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Provider retry webhook',
  'Provider retry webhook',
  'https://example.com/open-kb/provider-retry-webhook',
  encode(digest('provider-retry-secret', 'sha256'), 'hex'),
  ARRAY['provider.sync.failed', 'provider.sync.completed']::TEXT[],
  'active',
  'Webhook used by the seeded provider reliability project.',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET url = EXCLUDED.url,
    events = EXCLUDED.events,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.project_webhooks (id, organisation_id, project_id, webhook_id, event_name, name, title, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001622',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001621',
  'provider.sync.failed',
  'provider-sync-failed',
  'Provider sync failed hook',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.webhook_logs (id, organisation_id, project_id, webhook_id, name, title, status, external_id, http_status, attempt_count, delivered_at, payload, metadata, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001623',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001621',
  'provider.sync.failed',
  'Provider sync failed delivery',
  'success',
  'evt_seed_provider_failed',
  202,
  1,
  timezone('utc'::text, now()),
  '{"event":"provider.sync.failed","issue_key":"INT-1"}'::jsonb,
  '{"duration_ms":211}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    http_status = EXCLUDED.http_status,
    payload = EXCLUDED.payload,
    metadata = EXCLUDED.metadata,
    deleted_at = NULL;

INSERT INTO open_kb.integrations (id, organisation_id, provider, name, title, status, payload, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001631', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'github', 'GitHub', 'GitHub integration definition', 'active', '{"kind":"repository"}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001632', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'slack', 'Slack', 'Slack integration definition', 'active', '{"kind":"messaging"}'::jsonb, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

UPDATE open_kb.organisation_integrations
SET integration_id = CASE provider
  WHEN 'github' THEN '11110000-0000-4000-8000-000000001631'::uuid
  WHEN 'slack' THEN '11110000-0000-4000-8000-000000001632'::uuid
  ELSE integration_id
END,
connected_by_profile_id = '11111111-1111-1111-1111-111111111111',
access_token_hash = COALESCE(access_token_hash, encode(digest(provider || '-demo-access-token', 'sha256'), 'hex'))
WHERE organisation_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND provider IN ('github', 'slack');

INSERT INTO open_kb.integration_credentials (
  id,
  organisation_id,
  organisation_integration_id,
  provider,
  credential_hash,
  credential_ciphertext,
  refresh_credential_hash,
  refresh_credential_ciphertext,
  credential_key_version,
  metadata
)
VALUES
  (
    '11110000-0000-4000-8000-000000001633',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000080',
    'github',
    encode(digest('seed-github-token', 'sha256'), 'hex'),
    'seed-ciphertext-github-token',
    encode(digest('seed-github-refresh-token', 'sha256'), 'hex'),
    'seed-ciphertext-github-refresh-token',
    'seed-v1',
    '{"demo":true}'::jsonb
  ),
  (
    '11110000-0000-4000-8000-000000001634',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000081',
    'slack',
    encode(digest('seed-slack-token', 'sha256'), 'hex'),
    'seed-ciphertext-slack-token',
    NULL,
    NULL,
    'seed-v1',
    '{"demo":true}'::jsonb
  )
ON CONFLICT (organisation_integration_id) DO UPDATE
SET credential_hash = EXCLUDED.credential_hash,
    credential_ciphertext = EXCLUDED.credential_ciphertext,
    refresh_credential_hash = EXCLUDED.refresh_credential_hash,
    refresh_credential_ciphertext = EXCLUDED.refresh_credential_ciphertext,
    revoked_at = NULL;

INSERT INTO open_kb.github_repositories (
  id,
  organisation_id,
  project_id,
  organisation_integration_id,
  repository_owner,
  repository_name,
  installation_id,
  default_branch,
  name,
  title,
  status,
  created_by
)
VALUES (
  '11110000-0000-4000-8000-000000001641',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000000080',
  'opense',
  'integration-reliability-demo',
  'seed-installation-2',
  'main',
  'opense/integration-reliability-demo',
  'opense/integration-reliability-demo',
  'active',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET repository_owner = EXCLUDED.repository_owner,
    repository_name = EXCLUDED.repository_name,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.github_issue_syncs (id, organisation_id, project_id, issue_id, github_repository_id, external_issue_number, external_issue_url, name, title, status, external_id, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001642',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001305',
  '11110000-0000-4000-8000-000000001641',
  42,
  'https://github.com/opense/integration-reliability-demo/issues/42',
  'github-issue-42',
  'GitHub issue 42 sync',
  'retrying',
  'github-issue-42',
  '{"direction":"inbound","attempt":1}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.github_comment_syncs (id, organisation_id, project_id, issue_id, comment_id, github_repository_id, external_comment_id, external_comment_url, sync_direction, name, title, status, external_id, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001643',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001305',
  '11110000-0000-4000-8000-000000001342',
  '11110000-0000-4000-8000-000000001641',
  'github-comment-77',
  'https://github.com/opense/integration-reliability-demo/issues/42#issuecomment-77',
  'outbound',
  'github-comment-77',
  'GitHub comment 77 sync',
  'outbound_pending',
  'github-comment-77',
  '{"direction":"outbound"}'::jsonb,
  '33333333-3333-3333-3333-333333333333'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.slack_project_syncs (id, organisation_id, project_id, issue_id, comment_id, organisation_integration_id, channel_id, channel_name, sync_direction, name, title, status, external_id, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001644',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11110000-0000-4000-8000-000000001306',
  '11110000-0000-4000-8000-000000001342',
  '11110000-0000-4000-8000-000000000081',
  'COPENKBOPS',
  '#open-kb-ops',
  'outbound',
  '#open-kb-ops',
  '#open-kb-ops',
  'outbound_pending',
  'seed-slack-comment-sync',
  '{"direction":"outbound","issue_key":"INT-2"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.api_tokens (id, organisation_id, profile_id, name, token_hash, scopes, expires_at, last_used_at)
VALUES (
  '11110000-0000-4000-8000-000000001651',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Founder demo token',
  encode(digest('founder-open-kb-demo-token', 'sha256'), 'hex'),
  ARRAY['projects:read', 'issues:read', 'issues:write']::TEXT[],
  timezone('utc'::text, now()) + interval '90 days',
  timezone('utc'::text, now()) - interval '2 hours'
)
ON CONFLICT (organisation_id, token_hash) DO UPDATE
SET name = EXCLUDED.name,
    scopes = EXCLUDED.scopes,
    expires_at = EXCLUDED.expires_at,
    last_used_at = EXCLUDED.last_used_at,
    revoked_at = NULL;

INSERT INTO open_kb.api_activity_logs (id, organisation_id, project_id, profile_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001652',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  '11111111-1111-1111-1111-111111111111',
  'GET /issues',
  'Founder demo token issue list request',
  'success',
  '{"method":"GET","path":"/issues","status":200}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.email_notification_logs (id, organisation_id, project_id, issue_id, profile_id, name, title, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001661',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001101',
  '11110000-0000-4000-8000-000000001303',
  '11111111-1111-1111-1111-111111111111',
  'issue-assigned-email',
  'Issue assigned email',
  'sent',
  '{"template":"issue_assigned","recipient":"founder@gmail.com"}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.issue_views (id, organisation_id, project_id, name, title, status, payload, created_by)
VALUES
  ('11110000-0000-4000-8000-000000001671', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001101', 'Migration blockers', 'Migration blockers', 'active', '{"view":"kanban","filters":{"label":"migration","blocked":true}}'::jsonb, '11111111-1111-1111-1111-111111111111'),
  ('11110000-0000-4000-8000-000000001672', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11110000-0000-4000-8000-000000001102', 'Provider retries', 'Provider retries', 'active', '{"view":"list","filters":{"status":"retrying","provider":"github"}}'::jsonb, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE
SET payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.analytic_views (id, organisation_id, project_id, name, title, description_text, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001673',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000001102',
  'Provider reliability',
  'Provider reliability',
  'Provider sync health, retry backlog, and delivery trend.',
  'active',
  '{"metrics":["sync_success_rate","retry_backlog","webhook_latency"]}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.intakes (id, organisation_id, project_id, name, title, description_text, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001681',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000002',
  'Customer feedback inbox',
  'Customer feedback inbox',
  'Seeded intake queue for customer feedback project.',
  'open',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    deleted_at = NULL;

INSERT INTO open_kb.intake_issues (id, organisation_id, project_id, intake_id, name, title, description_text, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000001682',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000002',
  '11110000-0000-4000-8000-000000001681',
  'Refund status wording is confusing',
  'Refund status wording is confusing',
  'Store teams report that customers misunderstand pending refund states.',
  'submitted',
  '44444444-4444-4444-4444-444444444444'
)
ON CONFLICT (id) DO UPDATE
SET description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
    deleted_at = NULL;
