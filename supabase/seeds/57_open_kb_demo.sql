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

INSERT INTO open_kb.pages (id, organisation_id, project_id, title, slug, content_text, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000601',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Open-KB Architecture Notes',
  'architecture-notes',
  'Open-KB uses OpenSe organisations as its tenant boundary.',
  'published',
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    content_text = EXCLUDED.content_text,
    status = EXCLUDED.status;

INSERT INTO open_kb.pages (id, organisation_id, project_id, title, slug, content_text, status, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000602',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  'Open-KB Release Checklist',
  'release-checklist',
  'Verify seats, navigation, project CRUD, issue workflow, and page publishing before release.',
  'draft',
  '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    content_text = EXCLUDED.content_text,
    status = EXCLUDED.status;

INSERT INTO open_kb.page_versions (id, organisation_id, project_id, page_id, title, description_text, status, payload, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000611',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000601',
    'Architecture notes v1',
    'Initial notes describing organisation-scoped Open-KB tenancy.',
    'published',
    '{"version":1,"summary":"Initial page seed"}'::jsonb,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000612',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    '11110000-0000-4000-8000-000000000602',
    'Release checklist draft',
    'Draft checklist for smoke testing the seeded Open-KB instance.',
    'draft',
    '{"version":1,"summary":"Checklist draft"}'::jsonb,
    '22222222-2222-2222-2222-222222222222'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    status = EXCLUDED.status,
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

INSERT INTO open_kb.stickies (id, organisation_id, project_id, profile_id, name, title, description_text, status, payload, created_by)
VALUES (
  '11110000-0000-4000-8000-000000000631',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11110000-0000-4000-8000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'launch-note',
  'Launch note',
  'Remember to verify Open-KB from Accounts after assigning seats.',
  'active',
  '{"color":"yellow","x":120,"y":90}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    description_text = EXCLUDED.description_text,
    payload = EXCLUDED.payload,
    deleted_at = NULL;

INSERT INTO open_kb.user_favorites (id, organisation_id, project_id, issue_id, page_id, profile_id, name, title, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000641',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    NULL,
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
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'issue',
    'Wire Open-KB account seat assignment',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000643',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    NULL,
    '11110000-0000-4000-8000-000000000601',
    '11111111-1111-1111-1111-111111111111',
    'page',
    'Open-KB Architecture Notes',
    '11111111-1111-1111-1111-111111111111'
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    deleted_at = NULL;

INSERT INTO open_kb.user_recent_visits (id, organisation_id, project_id, issue_id, page_id, profile_id, name, title, created_by)
VALUES
  (
    '11110000-0000-4000-8000-000000000651',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    NULL,
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
    NULL,
    '11111111-1111-1111-1111-111111111111',
    'issue',
    'Implement Open-KB project foundation',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '11110000-0000-4000-8000-000000000653',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11110000-0000-4000-8000-000000000001',
    NULL,
    '11110000-0000-4000-8000-000000000602',
    '11111111-1111-1111-1111-111111111111',
    'page',
    'Open-KB Release Checklist',
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
