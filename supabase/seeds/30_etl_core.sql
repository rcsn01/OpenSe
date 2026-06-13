-- 2) ETL tables
-- ------------------------------------------------------------

INSERT INTO public.organisation_invites (id, org_id, email, invited_by, token)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'newstylist@maison-aurelia.test', '33333333-3333-3333-3333-333333333333', 'token-org-maison-aurelia-newstylist'),
  ('c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'buyer@velvet-crown.test', '66666666-6666-6666-6666-666666666666', 'token-org-velvet-crown-buyer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.roles (id, org_id, name, description, role_rank)
VALUES
  ('19191919-1919-1919-1919-191919191901', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ETL Admin', 'Full data administration for Maison Aurelia', 900),
  ('19191919-1919-1919-1919-191919191902', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ETL Operator', 'Run and monitor retail data workflows for Maison Aurelia', 600),
  ('19191919-1919-1919-1919-191919191903', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'ETL Admin', 'Full data administration for Velvet Crown', 900)
ON CONFLICT (org_id, name) DO UPDATE
SET description = EXCLUDED.description,
    role_rank = EXCLUDED.role_rank;

INSERT INTO etl.role_permissions (role_id, permission_code)
VALUES
  ('19191919-1919-1919-1919-191919191901', 'workflows.view'),
  ('19191919-1919-1919-1919-191919191901', 'workflows.manage'),
  ('19191919-1919-1919-1919-191919191901', 'executions.view'),
  ('19191919-1919-1919-1919-191919191901', 'executions.run'),
  ('19191919-1919-1919-1919-191919191901', 'notifications.manage'),
  ('19191919-1919-1919-1919-191919191901', 'roles.manage'),
  ('19191919-1919-1919-1919-191919191902', 'workflows.view'),
  ('19191919-1919-1919-1919-191919191902', 'executions.view'),
  ('19191919-1919-1919-1919-191919191902', 'executions.run'),
  ('19191919-1919-1919-1919-191919191903', 'workflows.view'),
  ('19191919-1919-1919-1919-191919191903', 'workflows.manage'),
  ('19191919-1919-1919-1919-191919191903', 'executions.view'),
  ('19191919-1919-1919-1919-191919191903', 'executions.run'),
  ('19191919-1919-1919-1919-191919191903', 'notifications.manage'),
  ('19191919-1919-1919-1919-191919191903', 'roles.manage')
ON CONFLICT (role_id, permission_code) DO NOTHING;

INSERT INTO etl.role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM etl.roles r
JOIN etl.app_permissions p ON TRUE
WHERE lower(r.name) = 'owner'
ON CONFLICT (role_id, permission_code) DO NOTHING;

INSERT INTO etl.organisation_member_roles (id, org_member_id, role_id)
SELECT
  src.id,
  om.id,
  er.id
FROM (
  VALUES
    ('29292929-2929-2929-2929-292929292904'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'Owner'::text),
    ('29292929-2929-2929-2929-292929292901'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'ETL Admin'::text),
    ('29292929-2929-2929-2929-292929292902'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'ETL Operator'::text),
    ('29292929-2929-2929-2929-292929292905'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '77777777-7777-7777-7777-777777777777'::uuid, 'ETL Operator'::text),
    ('29292929-2929-2929-2929-292929292903'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'Owner'::text)
) AS src(id, org_id, user_id, role_name)
JOIN public.organisation_members om
  ON om.org_id = src.org_id
 AND om.user_id = src.user_id
JOIN etl.roles er
  ON er.org_id = src.org_id
 AND er.name = src.role_name
ON CONFLICT (org_member_id) DO UPDATE
SET role_id = EXCLUDED.role_id;

INSERT INTO etl.workflows (id, name, description, graph_data, owner_id, org_id, is_template)
VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'Maison Aurelia Boutique Sales ETL',
    'Imports daily point-of-sale exports and normalises channel revenue.',
    '{"nodes":[{"id":"source","type":"csv"},{"id":"transform","type":"map"},{"id":"sink","type":"postgres"}],"edges":[{"from":"source","to":"transform"},{"from":"transform","to":"sink"}]}'::jsonb,
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    false
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'Luxury Inventory Reconciliation Template',
    'Reusable template for nightly boutique, concession, and online stock sync.',
    '{"nodes":[{"id":"api","type":"http"},{"id":"clean","type":"script"},{"id":"warehouse","type":"warehouse"}],"edges":[{"from":"api","to":"clean"},{"from":"clean","to":"warehouse"}]}'::jsonb,
    '11111111-1111-1111-1111-111111111111',
    NULL,
    true
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'Velvet Crown Procurement ETL',
    'Extracts apparel purchase orders and builds merchandising analytics.',
    '{"nodes":[{"id":"source","type":"api"},{"id":"join","type":"join"},{"id":"export","type":"s3"}],"edges":[{"from":"source","to":"join"},{"from":"join","to":"export"}]}'::jsonb,
    '66666666-6666-6666-6666-666666666666',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    false
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.workflow_executions (id, workflow_id, user_id, org_id, status, started_at, completed_at, error_message)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'success', timezone('utc'::text, now()) - interval '2 days', timezone('utc'::text, now()) - interval '2 days' + interval '6 minutes', NULL),
  ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'failed', timezone('utc'::text, now()) - interval '1 day', timezone('utc'::text, now()) - interval '1 day' + interval '3 minutes', 'Boutique sales export missing from inbound folder'),
  ('e3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'running', timezone('utc'::text, now()) - interval '30 minutes', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.workflow_versions (id, workflow_id, version_number, graph_data, name, created_by, change_summary)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 1, '{"nodes":[{"id":"source"}]}'::jsonb, 'Initial', '22222222-2222-2222-2222-222222222222', 'Initial version'),
  ('f2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 2, '{"nodes":[{"id":"source"},{"id":"transform"}]}'::jsonb, 'Added mapping', '33333333-3333-3333-3333-333333333333', 'Added transform node'),
  ('f3333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 1, '{"nodes":[{"id":"source"},{"id":"join"},{"id":"export"}]}'::jsonb, 'Baseline', '66666666-6666-6666-6666-666666666666', 'First deployed')
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.notification_settings (id, workflow_id, channel, enabled, config, created_by)
VALUES
  ('f4444444-4444-4444-4444-444444444441', 'd1111111-1111-1111-1111-111111111111', 'email', true, '{"recipients":["ops@maison-aurelia.test"]}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('f4444444-4444-4444-4444-444444444442', 'd1111111-1111-1111-1111-111111111111', 'slack', true, '{"webhook":"https://hooks.slack.test/maison-aurelia"}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('f4444444-4444-4444-4444-444444444443', 'd3333333-3333-3333-3333-333333333333', 'webhook', false, '{"url":"https://api.velvet-crown.test/webhooks/etl"}'::jsonb, '66666666-6666-6666-6666-666666666666')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
