-- ============================================================
-- OpenSe Mock Seed Data
-- Loaded automatically after `supabase db reset`
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0) Canonical users (auth + identities)
-- ------------------------------------------------------------

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
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'ivan.earth2024@gmail.com',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ivan Earth","username":"ivanearth","avatar_url":"https://i.pravatar.cc/150?u=ivan"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'owner@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Olivia Owner","username":"oliviaowner","avatar_url":"https://i.pravatar.cc/150?u=olivia"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'admin@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Aria Admin","username":"ariaadmin","avatar_url":"https://i.pravatar.cc/150?u=aria"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'editor@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Ethan Editor","username":"ethaneditor","avatar_url":"https://i.pravatar.cc/150?u=ethan"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'member@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Mina Member","username":"minamember","avatar_url":"https://i.pravatar.cc/150?u=mina"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'owner@globex.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Gina Globex","username":"ginaglobex","avatar_url":"https://i.pravatar.cc/150?u=gina"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'ivan.earth2024@gmail.com'),
    'email',
    'ivan.earth2024@gmail.com',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'owner@acme.test'),
    'email',
    'owner@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'admin@acme.test'),
    'email',
    'admin@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
    '44444444-4444-4444-4444-444444444444',
    jsonb_build_object('sub', '44444444-4444-4444-4444-444444444444', 'email', 'editor@acme.test'),
    'email',
    'editor@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa5-aaaa-aaaa-aaaa-aaaaaaaaaaa5',
    '55555555-5555-5555-5555-555555555555',
    jsonb_build_object('sub', '55555555-5555-5555-5555-555555555555', 'email', 'member@acme.test'),
    'email',
    'member@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa6-aaaa-aaaa-aaaa-aaaaaaaaaaa6',
    '66666666-6666-6666-6666-666666666666',
    jsonb_build_object('sub', '66666666-6666-6666-6666-666666666666', 'email', 'owner@globex.test'),
    'email',
    'owner@globex.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.super_admin_members (id, user_id)
VALUES ('91111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (user_id) DO NOTHING;

-- ------------------------------------------------------------
-- 1) Core public tables
-- ------------------------------------------------------------

INSERT INTO public.apps (code, name)
VALUES
  ('etl', 'ETL'),
  ('stoqr', 'StoQR')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.organisations (
  id,
  name,
  owner_id,
  stripe_customer_id,
  stripe_subscription_id,
  status
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Acme Distribution',
    '22222222-2222-2222-2222-222222222222',
    'cus_acme_001',
    'sub_acme_001',
    'active'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Globex Manufacturing',
    '66666666-6666-6666-6666-666666666666',
    'cus_globex_001',
    'sub_globex_001',
    'suspended'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organisation_members (id, org_id, user_id, role)
VALUES
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'owner'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'editor'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member'),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'owner'),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'admin')
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'etl', 10),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stoqr', 20),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'etl', 5),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stoqr', 8)
ON CONFLICT (org_id, app_code)
DO UPDATE SET seat_limit = EXCLUDED.seat_limit;

INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT om.id, src.app_code
FROM (
  VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'stoqr'::text),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'etl'::text),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'stoqr'::text),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'etl'::text)
) AS src(org_id, user_id, app_code)
JOIN public.organisation_members om
  ON om.org_id = src.org_id
 AND om.user_id = src.user_id
ON CONFLICT (org_member_id, app_code) DO NOTHING;

-- ------------------------------------------------------------
-- 2) ETL tables
-- ------------------------------------------------------------

INSERT INTO etl.organisation_invites (id, org_id, email, role, invited_by)
VALUES
  ('c1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'newjoiner@acme.test', 'member', '33333333-3333-3333-3333-333333333333'),
  ('c2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'analyst@globex.test', 'editor', '66666666-6666-6666-6666-666666666666')
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.workflows (id, name, description, graph_data, owner_id, org_id, is_template)
VALUES
  (
    'd1111111-1111-1111-1111-111111111111',
    'Acme Sales ETL',
    'Imports daily sales CSV and normalises output.',
    '{"nodes":[{"id":"source","type":"csv"},{"id":"transform","type":"map"},{"id":"sink","type":"postgres"}],"edges":[{"from":"source","to":"transform"},{"from":"transform","to":"sink"}]}'::jsonb,
    '22222222-2222-2222-2222-222222222222',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    false
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    'Inventory Reconciliation Template',
    'Reusable template for nightly inventory sync.',
    '{"nodes":[{"id":"api","type":"http"},{"id":"clean","type":"script"},{"id":"warehouse","type":"warehouse"}],"edges":[{"from":"api","to":"clean"},{"from":"clean","to":"warehouse"}]}'::jsonb,
    '11111111-1111-1111-1111-111111111111',
    NULL,
    true
  ),
  (
    'd3333333-3333-3333-3333-333333333333',
    'Globex Procurement ETL',
    'Extracts PO data and builds analytics mart.',
    '{"nodes":[{"id":"source","type":"api"},{"id":"join","type":"join"},{"id":"export","type":"s3"}],"edges":[{"from":"source","to":"join"},{"from":"join","to":"export"}]}'::jsonb,
    '66666666-6666-6666-6666-666666666666',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    false
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.workflow_executions (id, workflow_id, user_id, org_id, status, started_at, completed_at, error_message)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'success', timezone('utc'::text, now()) - interval '2 days', timezone('utc'::text, now()) - interval '2 days' + interval '6 minutes', NULL),
  ('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'failed', timezone('utc'::text, now()) - interval '1 day', timezone('utc'::text, now()) - interval '1 day' + interval '3 minutes', 'Source file not found'),
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
  ('f4444444-4444-4444-4444-444444444441', 'd1111111-1111-1111-1111-111111111111', 'email', true, '{"recipients":["ops@acme.test"]}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('f4444444-4444-4444-4444-444444444442', 'd1111111-1111-1111-1111-111111111111', 'slack', true, '{"webhook":"https://hooks.slack.test/acme"}'::jsonb, '33333333-3333-3333-3333-333333333333'),
  ('f4444444-4444-4444-4444-444444444443', 'd3333333-3333-3333-3333-333333333333', 'webhook', false, '{"url":"https://api.globex.test/webhooks/etl"}'::jsonb, '66666666-6666-6666-6666-666666666666')
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 3) StoQR reference + membership
-- ------------------------------------------------------------

INSERT INTO stoqr.roles (id, company_id, name, description)
VALUES
  ('10101010-1010-1010-1010-101010101010', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Owner', 'Full access role for Acme'),
  ('20202020-2020-2020-2020-202020202020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Manager', 'Operational manager role for Acme'),
  ('30303030-3030-3030-3030-303030303030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Viewer', 'Read-only role for Acme'),
  ('40404040-4040-4040-4040-404040404040', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Owner', 'Full access role for Globex'),
  ('50505050-5050-5050-5050-505050505050', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Operator', 'Warehouse operator role for Globex')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.role_permissions (role_id, permission_code)
VALUES
  ('10101010-1010-1010-1010-101010101010', 'company.manage'),
  ('10101010-1010-1010-1010-101010101010', 'billing.manage'),
  ('10101010-1010-1010-1010-101010101010', 'members.view'),
  ('10101010-1010-1010-1010-101010101010', 'members.manage'),
  ('10101010-1010-1010-1010-101010101010', 'roles.manage'),
  ('10101010-1010-1010-1010-101010101010', 'dashboard.view'),
  ('10101010-1010-1010-1010-101010101010', 'products.view'),
  ('10101010-1010-1010-1010-101010101010', 'products.manage'),
  ('10101010-1010-1010-1010-101010101010', 'inventory.bulk_manage'),
  ('10101010-1010-1010-1010-101010101010', 'scanner.use'),
  ('10101010-1010-1010-1010-101010101010', 'labels.manage'),
  ('10101010-1010-1010-1010-101010101010', 'reports.view'),
  ('10101010-1010-1010-1010-101010101010', 'reports.export'),
  ('10101010-1010-1010-1010-101010101010', 'procurement.manage'),
  ('10101010-1010-1010-1010-101010101010', 'alerts.view'),
  ('10101010-1010-1010-1010-101010101010', 'alerts.manage'),
  ('10101010-1010-1010-1010-101010101010', 'activity.view'),
  ('10101010-1010-1010-1010-101010101010', 'transactions.view'),
  ('10101010-1010-1010-1010-101010101010', 'transactions.create'),
  ('20202020-2020-2020-2020-202020202020', 'dashboard.view'),
  ('20202020-2020-2020-2020-202020202020', 'products.view'),
  ('20202020-2020-2020-2020-202020202020', 'products.manage'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.bulk_manage'),
  ('20202020-2020-2020-2020-202020202020', 'scanner.use'),
  ('20202020-2020-2020-2020-202020202020', 'reports.view'),
  ('20202020-2020-2020-2020-202020202020', 'transactions.view'),
  ('20202020-2020-2020-2020-202020202020', 'transactions.create'),
  ('30303030-3030-3030-3030-303030303030', 'dashboard.view'),
  ('30303030-3030-3030-3030-303030303030', 'products.view'),
  ('30303030-3030-3030-3030-303030303030', 'reports.view'),
  ('30303030-3030-3030-3030-303030303030', 'transactions.view'),
  ('40404040-4040-4040-4040-404040404040', 'company.manage'),
  ('40404040-4040-4040-4040-404040404040', 'dashboard.view'),
  ('40404040-4040-4040-4040-404040404040', 'products.view'),
  ('40404040-4040-4040-4040-404040404040', 'products.manage'),
  ('40404040-4040-4040-4040-404040404040', 'reports.view'),
  ('40404040-4040-4040-4040-404040404040', 'transactions.view'),
  ('50505050-5050-5050-5050-505050505050', 'products.view'),
  ('50505050-5050-5050-5050-505050505050', 'scanner.use'),
  ('50505050-5050-5050-5050-505050505050', 'transactions.create')
ON CONFLICT (role_id, permission_code) DO NOTHING;

INSERT INTO stoqr.company_members (id, user_id, company_id, role_id)
VALUES
  ('60606060-6060-6060-6060-606060606001', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10101010-1010-1010-1010-101010101010'),
  ('60606060-6060-6060-6060-606060606002', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '20202020-2020-2020-2020-202020202020'),
  ('60606060-6060-6060-6060-606060606003', '44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '20202020-2020-2020-2020-202020202020'),
  ('60606060-6060-6060-6060-606060606004', '55555555-5555-5555-5555-555555555555', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '30303030-3030-3030-3030-303030303030'),
  ('60606060-6060-6060-6060-606060606005', '66666666-6666-6666-6666-666666666666', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '40404040-4040-4040-4040-404040404040'),
  ('60606060-6060-6060-6060-606060606006', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '50505050-5050-5050-5050-505050505050')
ON CONFLICT (user_id, company_id) DO UPDATE
SET role_id = EXCLUDED.role_id;

INSERT INTO stoqr.company_invitations (id, company_id, email, role_id, token, invited_by, accepted_at)
VALUES
  ('70707070-7070-7070-7070-707070707001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'candidate@acme.test', '30303030-3030-3030-3030-303030303030', 'token-acme-viewer', '33333333-3333-3333-3333-333333333333', NULL),
  ('70707070-7070-7070-7070-707070707002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'newoperator@globex.test', '50505050-5050-5050-5050-505050505050', 'token-globex-operator', '66666666-6666-6666-6666-666666666666', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.subscriptions (
  id,
  company_id,
  status,
  price_id,
  quantity,
  cancel_at_period_end,
  current_period_start,
  current_period_end,
  ended_at
)
VALUES
  (
    'sub_stoqr_acme_001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'active',
    'price_stoqr_monthly_01',
    20,
    false,
    timezone('utc'::text, now()) - interval '15 days',
    timezone('utc'::text, now()) + interval '15 days',
    NULL
  ),
  (
    'sub_stoqr_globex_001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'past_due',
    'price_stoqr_yearly_01',
    8,
    true,
    timezone('utc'::text, now()) - interval '45 days',
    timezone('utc'::text, now()) - interval '15 days',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 4) StoQR catalog + inventory flows
-- ------------------------------------------------------------

INSERT INTO stoqr.product_categories (id, company_id, name, description)
VALUES
  ('80808080-8080-8080-8080-808080808001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beverages', 'Drinks and ready-to-sell beverages'),
  ('80808080-8080-8080-8080-808080808002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Packaging', 'Boxes, wraps, and packaging materials'),
  ('80808080-8080-8080-8080-808080808003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Components', 'Manufacturing parts and components')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.inventory_locations (id, company_id, name, code, description)
VALUES
  ('81818181-8181-8181-8181-818181818001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Main Warehouse', 'A-WH1', 'Primary Acme warehouse'),
  ('81818181-8181-8181-8181-818181818002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Front Store', 'A-ST1', 'Retail facing location'),
  ('81818181-8181-8181-8181-818181818003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Plant Floor', 'G-PLT', 'Globex plant storage')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.folders (id, company_id, parent_id, name, description)
VALUES
  ('82828282-8282-8282-8282-828282828001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Top Sellers', 'Fast moving SKUs'),
  ('82828282-8282-8282-8282-828282828002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82828282-8282-8282-8282-828282828001', 'Seasonal', 'Seasonal stock'),
  ('82828282-8282-8282-8282-828282828003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'Critical Parts', 'Parts with low tolerance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.tags (id, company_id, name, color)
VALUES
  ('83838383-8383-8383-8383-838383838001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fast-moving', '#22c55e'),
  ('83838383-8383-8383-8383-838383838002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Needs Audit', '#f59e0b'),
  ('83838383-8383-8383-8383-838383838003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'High Value', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.products (
  id,
  company_id,
  folder_id,
  category_id,
  location_id,
  sku,
  primary_barcode,
  name,
  description,
  category,
  quantity_on_hand,
  min_stock_level,
  max_stock_level,
  reorder_point,
  cost_price,
  selling_price,
  image_urls,
  expiry_date,
  custom_fields,
  deleted_at
)
VALUES
  (
    '84848484-8484-8484-8484-848484848001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '82828282-8282-8282-8282-828282828001',
    '80808080-8080-8080-8080-808080808001',
    '81818181-8181-8181-8181-818181818001',
    'ACM-BEV-001',
    '8901111111111',
    'Acme Sparkling Water 500ml',
    'Top selling sparkling water.',
    'Beverages',
    120,
    30,
    500,
    60,
    0.50,
    1.25,
    ARRAY['https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800'],
    NULL,
    '{"brand":"Acme","unit":"bottle"}'::jsonb,
    NULL
  ),
  (
    '84848484-8484-8484-8484-848484848002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '82828282-8282-8282-8282-828282828002',
    '80808080-8080-8080-8080-808080808002',
    '81818181-8181-8181-8181-818181818001',
    'ACM-PKG-010',
    '8902222222222',
    'Acme Medium Shipping Box',
    'Corrugated packaging box.',
    'Packaging',
    45,
    50,
    300,
    80,
    0.35,
    0.99,
    ARRAY['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800'],
    NULL,
    '{"material":"kraft"}'::jsonb,
    NULL
  ),
  (
    '84848484-8484-8484-8484-848484848003',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '82828282-8282-8282-8282-828282828003',
    '80808080-8080-8080-8080-808080808003',
    '81818181-8181-8181-8181-818181818003',
    'GLX-CMP-777',
    '9903333333333',
    'Globex Precision Valve',
    'Machined valve component.',
    'Components',
    12,
    20,
    200,
    25,
    45.00,
    89.00,
    ARRAY['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800'],
    timezone('utc'::text, now())::date + 120,
    '{"line":"PX","batch":"B-901"}'::jsonb,
    NULL
  ),
  (
    '84848484-8484-8484-8484-848484848004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    '80808080-8080-8080-8080-808080808001',
    '81818181-8181-8181-8181-818181818002',
    'ACM-OLD-099',
    '8909999999999',
    'Archived Soda 1L',
    'Soft-deleted product sample.',
    'Beverages',
    0,
    0,
    NULL,
    0,
    0.60,
    1.40,
    ARRAY[]::text[],
    NULL,
    '{}'::jsonb,
    timezone('utc'::text, now()) - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_barcodes (id, company_id, product_id, barcode, barcode_type, is_primary)
VALUES
  ('85858585-8585-8585-8585-858585858001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', '8901111111111', 'barcode', true),
  ('85858585-8585-8585-8585-858585858002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', 'QR-ACM-BEV-001', 'qr', false),
  ('85858585-8585-8585-8585-858585858003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848002', '8902222222222', 'barcode', true),
  ('85858585-8585-8585-8585-858585858004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '84848484-8484-8484-8484-848484848003', '9903333333333', 'barcode', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_tags (product_id, tag_id, company_id)
VALUES
  ('84848484-8484-8484-8484-848484848001', '83838383-8383-8383-8383-838383838001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('84848484-8484-8484-8484-848484848002', '83838383-8383-8383-8383-838383838002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('84848484-8484-8484-8484-848484848003', '83838383-8383-8383-8383-838383838003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (product_id, tag_id) DO NOTHING;

INSERT INTO stoqr.inventory_transactions (id, company_id, product_id, performed_by, transaction_type, source, quantity_change, notes, created_at)
VALUES
  ('86868686-8686-8686-8686-868686868001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', '33333333-3333-3333-3333-333333333333', 'purchase', 'receiving', 40, 'Initial restock', timezone('utc'::text, now()) - interval '7 days'),
  ('86868686-8686-8686-8686-868686868002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', '44444444-4444-4444-4444-444444444444', 'sale', 'manual', 15, 'Retail sales adjustment', timezone('utc'::text, now()) - interval '3 days'),
  ('86868686-8686-8686-8686-868686868003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848002', '33333333-3333-3333-3333-333333333333', 'scan_out', 'scan', 12, 'Store transfer', timezone('utc'::text, now()) - interval '2 days'),
  ('86868686-8686-8686-8686-868686868004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '84848484-8484-8484-8484-848484848003', '66666666-6666-6666-6666-666666666666', 'adjustment', 'manual', -3, 'Damaged units', timezone('utc'::text, now()) - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.inventory_bulk_operations (
  id,
  company_id,
  operation_type,
  status,
  initiated_by,
  file_path,
  summary,
  error_message,
  completed_at
)
VALUES
  (
    '87878787-8787-8787-8787-878787878001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'import',
    'completed',
    '33333333-3333-3333-3333-333333333333',
    'imports/acme-products-2026-02.csv',
    '{"created":12,"updated":3,"failed":0}'::jsonb,
    NULL,
    timezone('utc'::text, now()) - interval '5 days'
  ),
  (
    '87878787-8787-8787-8787-878787878002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bulk_update',
    'failed',
    '66666666-6666-6666-6666-666666666666',
    'bulk/globex-thresholds.xlsx',
    '{"updated":0,"failed":14}'::jsonb,
    'Validation failed on row 14',
    timezone('utc'::text, now()) - interval '12 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.scan_events (
  id,
  company_id,
  product_id,
  barcode,
  scan_type,
  quantity,
  entry_method,
  scanned_by,
  transaction_id,
  metadata,
  created_at
)
VALUES
  (
    '88888888-8888-8888-8888-888888888001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '84848484-8484-8484-8484-848484848001',
    '8901111111111',
    'lookup',
    1,
    'camera',
    '55555555-5555-5555-5555-555555555555',
    NULL,
    '{"device":"android"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  ),
  (
    '88888888-8888-8888-8888-888888888002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '84848484-8484-8484-8484-848484848002',
    '8902222222222',
    'stock_out',
    2,
    'manual',
    '44444444-4444-4444-4444-444444444444',
    '86868686-8686-8686-8686-868686868003',
    '{"reason":"front-store"}'::jsonb,
    timezone('utc'::text, now()) - interval '10 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.report_schedules (
  id,
  company_id,
  report_type,
  cadence,
  day_of_week,
  day_of_month,
  time_of_day,
  recipients,
  created_by
)
VALUES
  (
    '89898989-8989-8989-8989-898989898001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'inventory_valuation',
    'weekly',
    1,
    NULL,
    '09:00:00',
    ARRAY['ops@acme.test','finance@acme.test'],
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '89898989-8989-8989-8989-898989898002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'stock_movement',
    'monthly',
    NULL,
    1,
    '08:30:00',
    ARRAY['warehouse@globex.test'],
    '66666666-6666-6666-6666-666666666666'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.report_exports (
  id,
  company_id,
  report_type,
  export_format,
  date_range_start,
  date_range_end,
  filters,
  status,
  requested_by,
  file_path,
  completed_at
)
VALUES
  (
    '90909090-9090-9090-9090-909090909001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'inventory_valuation',
    'csv',
    current_date - 30,
    current_date,
    '{"category":"Beverages"}'::jsonb,
    'completed',
    '33333333-3333-3333-3333-333333333333',
    'exports/acme-inventory-valuation.csv',
    timezone('utc'::text, now()) - interval '4 days'
  ),
  (
    '90909090-9090-9090-9090-909090909002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dead_stock',
    'pdf',
    current_date - 90,
    current_date,
    '{}'::jsonb,
    'processing',
    '66666666-6666-6666-6666-666666666666',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.suppliers (
  id,
  company_id,
  name,
  contact_name,
  email,
  phone,
  address,
  website
)
VALUES
  (
    '91919191-9191-9191-9191-919191919001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'North Beverage Supply',
    'Nora Fields',
    'sales@northbev.test',
    '+1-555-1010',
    '100 Supply Ave, Denver, CO',
    'https://northbev.test'
  ),
  (
    '91919191-9191-9191-9191-919191919002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Precision Parts Co',
    'Paul Chen',
    'orders@precisionparts.test',
    '+1-555-2020',
    '77 Industrial Rd, Austin, TX',
    'https://precisionparts.test'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.purchase_orders (
  id,
  company_id,
  supplier_id,
  status,
  expected_date,
  notes,
  created_by,
  updated_at
)
VALUES
  (
    '92929292-9292-9292-9292-929292929001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '91919191-9191-9191-9191-919191919001',
    'sent',
    current_date + 7,
    'Replenish beverage stock for Q1 campaign.',
    '33333333-3333-3333-3333-333333333333',
    timezone('utc'::text, now()) - interval '2 days'
  ),
  (
    '92929292-9292-9292-9292-929292929002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '91919191-9191-9191-9191-919191919002',
    'partial',
    current_date + 3,
    'Critical valve replacement order.',
    '66666666-6666-6666-6666-666666666666',
    timezone('utc'::text, now()) - interval '12 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.purchase_order_items (id, po_id, product_id, quantity_ordered, quantity_received, unit_cost)
VALUES
  ('93939393-9393-9393-9393-939393939001', '92929292-9292-9292-9292-929292929001', '84848484-8484-8484-8484-848484848001', 80, 20, 0.48),
  ('93939393-9393-9393-9393-939393939002', '92929292-9292-9292-9292-929292929001', '84848484-8484-8484-8484-848484848002', 120, 0, 0.31),
  ('93939393-9393-9393-9393-939393939003', '92929292-9292-9292-9292-929292929002', '84848484-8484-8484-8484-848484848003', 25, 10, 44.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.receiving_logs (id, company_id, po_id, product_id, quantity_received, received_by, received_at, notes)
VALUES
  (
    '94949494-9494-9494-9494-949494949001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '92929292-9292-9292-9292-929292929001',
    '84848484-8484-8484-8484-848484848001',
    20,
    '33333333-3333-3333-3333-333333333333',
    timezone('utc'::text, now()) - interval '1 day',
    'First pallet received in good condition.'
  ),
  (
    '94949494-9494-9494-9494-949494949002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '92929292-9292-9292-9292-929292929002',
    '84848484-8484-8484-8484-848484848003',
    10,
    '66666666-6666-6666-6666-666666666666',
    timezone('utc'::text, now()) - interval '6 hours',
    'Partial shipment received.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_rules (
  id,
  company_id,
  name,
  alert_type,
  enabled,
  condition,
  delivery_channels,
  recipients,
  created_by
)
VALUES
  (
    '95959595-9595-9595-9595-959595959001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Acme Low Stock Rule',
    'low_stock',
    true,
    '{"threshold_field":"min_stock_level"}'::jsonb,
    ARRAY['in_app','email'],
    ARRAY['ops@acme.test'],
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '95959595-9595-9595-9595-959595959002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Globex Reorder Rule',
    'reorder_point',
    true,
    '{"threshold_field":"reorder_point"}'::jsonb,
    ARRAY['in_app'],
    ARRAY['warehouse@globex.test'],
    '66666666-6666-6666-6666-666666666666'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_events (
  id,
  company_id,
  rule_id,
  product_id,
  alert_type,
  severity,
  status,
  message,
  metadata,
  triggered_at,
  acknowledged_by,
  acknowledged_at,
  resolved_at
)
VALUES
  (
    '96969696-9696-9696-9696-969696969001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '95959595-9595-9595-9595-959595959001',
    '84848484-8484-8484-8484-848484848002',
    'low_stock',
    'high',
    'open',
    'Acme Medium Shipping Box is below minimum stock.',
    '{"quantity_on_hand":33,"min_stock_level":50}'::jsonb,
    timezone('utc'::text, now()) - interval '2 hours',
    NULL,
    NULL,
    NULL
  ),
  (
    '96969696-9696-9696-9696-969696969002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '95959595-9595-9595-9595-959595959002',
    '84848484-8484-8484-8484-848484848003',
    'reorder_point',
    'critical',
    'acknowledged',
    'Precision Valve reached reorder point.',
    '{"quantity_on_hand":9,"reorder_point":25}'::jsonb,
    timezone('utc'::text, now()) - interval '8 hours',
    '66666666-6666-6666-6666-666666666666',
    timezone('utc'::text, now()) - interval '7 hours',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_delivery_logs (
  id,
  company_id,
  alert_event_id,
  channel,
  recipient,
  status,
  provider_message_id,
  error_message,
  sent_at
)
VALUES
  (
    '97979797-9797-9797-9797-979797979001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '96969696-9696-9696-9696-969696969001',
    'email',
    'ops@acme.test',
    'sent',
    'msg-1001',
    NULL,
    timezone('utc'::text, now()) - interval '115 minutes'
  ),
  (
    '97979797-9797-9797-9797-979797979002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '96969696-9696-9696-9696-969696969002',
    'in_app',
    'owner@globex.test',
    'sent',
    NULL,
    NULL,
    timezone('utc'::text, now()) - interval '7 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.activity_events (
  id,
  company_id,
  actor_user_id,
  event_type,
  entity_type,
  entity_id,
  message,
  metadata,
  created_at
)
VALUES
  (
    '98989898-9898-9898-9898-989898989001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'inventory.bulk_import.completed',
    'inventory_bulk_operations',
    '87878787-8787-8787-8787-878787878001',
    'Bulk import completed with no failures.',
    '{"created":12,"updated":3}'::jsonb,
    timezone('utc'::text, now()) - interval '5 days'
  ),
  (
    '98989898-9898-9898-9898-989898989002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '66666666-6666-6666-6666-666666666666',
    'alerts.rule.triggered',
    'alert_events',
    '96969696-9696-9696-9696-969696969002',
    'Critical reorder alert raised for precision valve.',
    '{"severity":"critical"}'::jsonb,
    timezone('utc'::text, now()) - interval '8 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.label_templates (
  id,
  company_id,
  name,
  template_type,
  is_system,
  layout,
  variable_fields,
  created_by
)
VALUES
  (
    '99999999-9999-9999-9999-999999999001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Acme Shelf Compact',
    'shelf',
    false,
    '{"size":"50x30","font":"inter"}'::jsonb,
    ARRAY['barcode','name','qr'],
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '99999999-9999-9999-9999-999999999002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Globex Product Standard',
    'product',
    false,
    '{"size":"70x40","font":"mono"}'::jsonb,
    ARRAY['barcode','sku','name','price'],
    '66666666-6666-6666-6666-666666666666'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.label_print_jobs (
  id,
  company_id,
  template_id,
  format,
  status,
  quantity,
  payload,
  preview_url,
  output_url,
  requested_by,
  completed_at
)
VALUES
  (
    'aaaa0000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '99999999-9999-9999-9999-999999999001',
    'pdf',
    'completed',
    50,
    '{"product_ids":["84848484-8484-8484-8484-848484848001"]}'::jsonb,
    'https://files.example.test/labels/acme-preview.pdf',
    'https://files.example.test/labels/acme-output.pdf',
    '33333333-3333-3333-3333-333333333333',
    timezone('utc'::text, now()) - interval '1 day'
  ),
  (
    'aaaa0000-0000-0000-0000-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '99999999-9999-9999-9999-999999999002',
    'png',
    'processing',
    20,
    '{"product_ids":["84848484-8484-8484-8484-848484848003"]}'::jsonb,
    NULL,
    NULL,
    '66666666-6666-6666-6666-666666666666',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 5) Audit + admin tables
-- ------------------------------------------------------------

INSERT INTO public.organisation_audit_events (
  id,
  org_id,
  actor_user_id,
  action,
  app_code,
  target_org_member_id,
  metadata,
  created_at
)
VALUES
  (
    'abababab-abab-abab-abab-ababababab01',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'org_seat_limit_updated',
    'stoqr',
    NULL,
    '{"from":15,"to":20}'::jsonb,
    timezone('utc'::text, now()) - interval '3 days'
  ),
  (
    'abababab-abab-abab-abab-ababababab02',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '66666666-6666-6666-6666-666666666666',
    'org_member_app_seat_assigned',
    'etl',
    'b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b002',
    '{"app_code":"etl"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_app_health_snapshots (
  id,
  app_code,
  uptime_percent,
  error_spike_level,
  active_alert_count,
  incident_summary,
  measured_at
)
VALUES
  (
    'acacacac-acac-acac-acac-acacacacac01',
    'etl',
    99.75,
    'low',
    1,
    'Minor webhook retry spikes observed.',
    timezone('utc'::text, now()) - interval '30 minutes'
  ),
  (
    'acacacac-acac-acac-acac-acacacacac02',
    'stoqr',
    98.90,
    'medium',
    4,
    'Inventory export queue slower than usual.',
    timezone('utc'::text, now()) - interval '30 minutes'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_pricing_plans (
  id,
  app_code,
  plan_name,
  billing_interval,
  seat_price_cents,
  is_bundle,
  stripe_product_id,
  stripe_price_id,
  is_active
)
VALUES
  ('adadadad-adad-adad-adad-adadadadad01', 'etl', 'ETL Pro', 'monthly', 2900, false, 'prod_etl_pro', 'price_etl_pro_monthly', true),
  ('adadadad-adad-adad-adad-adadadadad02', 'etl', 'ETL Pro', 'yearly', 2500, false, 'prod_etl_pro', 'price_etl_pro_yearly', true),
  ('adadadad-adad-adad-adad-adadadadad03', 'stoqr', 'StoQR Growth', 'monthly', 1900, false, 'prod_stoqr_growth', 'price_stoqr_growth_monthly', true),
  ('adadadad-adad-adad-adad-adadadadad04', NULL, 'OpenSe Bundle', 'yearly', 3900, true, 'prod_opense_bundle', 'price_opense_bundle_yearly', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_coupons (
  id,
  code,
  discount_percent,
  duration,
  duration_in_months,
  stripe_coupon_id,
  is_active,
  created_at
)
VALUES
  (
    'aeaeaeae-aeae-aeae-aeae-aeaeaeaeae01',
    'WELCOME20',
    20.00,
    'once',
    NULL,
    'coupon_welcome20',
    true,
    timezone('utc'::text, now()) - interval '10 days'
  ),
  (
    'aeaeaeae-aeae-aeae-aeae-aeaeaeaeae02',
    'BETA50',
    50.00,
    'repeating',
    3,
    'coupon_beta50',
    false,
    timezone('utc'::text, now()) - interval '20 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_admin_audit_events (id, actor_user_id, action, metadata, created_at)
VALUES
  (
    'afafafaf-afaf-afaf-afaf-afafafafaf01',
    '11111111-1111-1111-1111-111111111111',
    'pricing_plan_updated',
    '{"plan_id":"adadadad-adad-adad-adad-adadadadad03","from":1700,"to":1900}'::jsonb,
    timezone('utc'::text, now()) - interval '2 days'
  ),
  (
    'afafafaf-afaf-afaf-afaf-afafafafaf02',
    '11111111-1111-1111-1111-111111111111',
    'feature_flag_updated',
    '{"flag_key":"stoqr.inventory-anomaly-alerts","rollout_status":"beta"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_feature_flags (id, app_code, flag_key, rollout_status, audience)
VALUES
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b101', 'etl', 'etl.enhanced-lineage-graph', 'beta', 'Selected enterprise orgs'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b102', 'stoqr', 'stoqr.smart-reorder-assistant', 'enabled', 'All organisations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_default_configurations (id, app_code, config_key, config_value)
VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b201', 'etl', 'default_workflow_timeout_seconds', '900'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b202', 'stoqr', 'default_alert_severity', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_release_notes (id, app_code, version, summary, published_at)
VALUES
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b301',
    'etl',
    'ETL 1.15.0',
    'Pipeline run diagnostics and role-aware template publishing.',
    timezone('utc'::text, now()) - interval '6 days'
  ),
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b302',
    'stoqr',
    'StoQR 1.10.0',
    'Inventory alert feed improvements and bulk import recovery.',
    timezone('utc'::text, now()) - interval '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 6) High-volume synthetic dataset
-- ------------------------------------------------------------

INSERT INTO etl.workflow_executions (id, workflow_id, user_id, org_id, status, started_at, completed_at, error_message)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'etl-acme-exec-' || gs::text),
  'd1111111-1111-1111-1111-111111111111'::uuid,
  CASE WHEN gs % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '44444444-4444-4444-4444-444444444444'::uuid END,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE
    WHEN gs % 10 = 0 THEN 'failed'
    WHEN gs % 7 = 0 THEN 'running'
    ELSE 'success'
  END,
  timezone('utc'::text, now()) - (gs || ' hours')::interval,
  CASE WHEN gs % 7 = 0 THEN NULL ELSE timezone('utc'::text, now()) - (gs || ' hours')::interval + ((2 + (gs % 15)) || ' minutes')::interval END,
  CASE WHEN gs % 10 = 0 THEN 'Synthetic ETL failure sample #' || gs::text ELSE NULL END
FROM generate_series(1, 220) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.workflow_executions (id, workflow_id, user_id, org_id, status, started_at, completed_at, error_message)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'etl-globex-exec-' || gs::text),
  'd3333333-3333-3333-3333-333333333333'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  CASE WHEN gs % 8 = 0 THEN 'failed' ELSE 'success' END,
  timezone('utc'::text, now()) - (gs || ' hours')::interval,
  timezone('utc'::text, now()) - (gs || ' hours')::interval + ((5 + (gs % 10)) || ' minutes')::interval,
  CASE WHEN gs % 8 = 0 THEN 'Globex synthetic processing timeout' ELSE NULL END
FROM generate_series(1, 140) AS gs
ON CONFLICT (id) DO NOTHING;

WITH acme_bulk_products AS (
  SELECT
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || gs::text) AS id,
    gs
  FROM generate_series(1, 180) AS gs
),
globex_bulk_products AS (
  SELECT
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || gs::text) AS id,
    gs
  FROM generate_series(1, 120) AS gs
)
INSERT INTO stoqr.products (
  id,
  company_id,
  folder_id,
  category_id,
  location_id,
  sku,
  primary_barcode,
  name,
  description,
  category,
  quantity_on_hand,
  min_stock_level,
  max_stock_level,
  reorder_point,
  cost_price,
  selling_price,
  image_urls,
  custom_fields
)
SELECT
  p.id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE WHEN p.gs % 3 = 0 THEN '82828282-8282-8282-8282-828282828001'::uuid ELSE '82828282-8282-8282-8282-828282828002'::uuid END,
  CASE WHEN p.gs % 2 = 0 THEN '80808080-8080-8080-8080-808080808001'::uuid ELSE '80808080-8080-8080-8080-808080808002'::uuid END,
  CASE WHEN p.gs % 4 = 0 THEN '81818181-8181-8181-8181-818181818002'::uuid ELSE '81818181-8181-8181-8181-818181818001'::uuid END,
  'ACM-AUTO-' || lpad(p.gs::text, 4, '0'),
  NULL,
  'Acme Auto Product ' || p.gs::text,
  'Synthetic seeded product for high-volume UI testing',
  CASE WHEN p.gs % 2 = 0 THEN 'Beverages' ELSE 'Packaging' END,
  10 + (p.gs % 90),
  5 + (p.gs % 20),
  120 + (p.gs % 300),
  8 + (p.gs % 25),
  round((0.5 + (p.gs % 20) * 0.27)::numeric, 2),
  round((1.2 + (p.gs % 25) * 0.55)::numeric, 2),
  ARRAY[]::text[],
  jsonb_build_object('seed_type', 'bulk', 'batch', 'acme', 'ordinal', p.gs)
FROM acme_bulk_products p
UNION ALL
SELECT
  p.id,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '82828282-8282-8282-8282-828282828003'::uuid,
  '80808080-8080-8080-8080-808080808003'::uuid,
  '81818181-8181-8181-8181-818181818003'::uuid,
  'GLX-AUTO-' || lpad(p.gs::text, 4, '0'),
  NULL,
  'Globex Auto Component ' || p.gs::text,
  'Synthetic seeded component for load testing',
  'Components',
  5 + (p.gs % 70),
  8 + (p.gs % 18),
  150 + (p.gs % 350),
  10 + (p.gs % 20),
  round((12 + (p.gs % 35) * 1.25)::numeric, 2),
  round((20 + (p.gs % 40) * 2.10)::numeric, 2),
  ARRAY[]::text[],
  jsonb_build_object('seed_type', 'bulk', 'batch', 'globex', 'ordinal', p.gs)
FROM globex_bulk_products p
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_barcodes (id, company_id, product_id, barcode, barcode_type, is_primary)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-bc-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || gs::text),
  'ACMEBC' || lpad(gs::text, 8, '0'),
  'barcode',
  true
FROM generate_series(1, 180) AS gs
UNION ALL
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'globex-bc-' || gs::text),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || gs::text),
  'GLXBC' || lpad(gs::text, 8, '0'),
  'barcode',
  true
FROM generate_series(1, 120) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_tags (product_id, tag_id, company_id)
SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || gs::text), CASE WHEN gs % 2 = 0 THEN '83838383-8383-8383-8383-838383838001'::uuid ELSE '83838383-8383-8383-8383-838383838002'::uuid END, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
FROM generate_series(1, 180) AS gs
UNION ALL
SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || gs::text), '83838383-8383-8383-8383-838383838003'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
FROM generate_series(1, 120) AS gs
ON CONFLICT (product_id, tag_id) DO NOTHING;

INSERT INTO stoqr.inventory_transactions (id, company_id, product_id, performed_by, transaction_type, source, quantity_change, notes, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-bulk-tx-' || p.gs::text || '-' || t.tx_idx::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || p.gs::text),
  CASE WHEN t.tx_idx % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '44444444-4444-4444-4444-444444444444'::uuid END,
  CASE
    WHEN t.tx_idx = 1 THEN 'purchase'
    WHEN t.tx_idx = 2 THEN 'sale'
    WHEN t.tx_idx = 3 THEN 'scan_out'
    WHEN t.tx_idx = 4 THEN 'return'
    ELSE 'adjustment'
  END,
  CASE WHEN t.tx_idx IN (3, 4) THEN 'scan' ELSE 'manual' END,
  1 + ((p.gs + t.tx_idx) % 9),
  'Synthetic transaction ' || t.tx_idx::text || ' for product #' || p.gs::text,
  timezone('utc'::text, now()) - ((p.gs * 2 + t.tx_idx) || ' hours')::interval
FROM generate_series(1, 180) AS p(gs)
CROSS JOIN generate_series(1, 5) AS t(tx_idx)
UNION ALL
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'globex-bulk-tx-' || p.gs::text || '-' || t.tx_idx::text),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || p.gs::text),
  '66666666-6666-6666-6666-666666666666'::uuid,
  CASE WHEN t.tx_idx % 2 = 0 THEN 'purchase' ELSE 'sale' END,
  'manual',
  1 + ((p.gs + t.tx_idx) % 7),
  'Globex synthetic transaction ' || t.tx_idx::text || ' for product #' || p.gs::text,
  timezone('utc'::text, now()) - ((p.gs * 3 + t.tx_idx) || ' hours')::interval
FROM generate_series(1, 120) AS p(gs)
CROSS JOIN generate_series(1, 3) AS t(tx_idx)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.scan_events (id, company_id, product_id, barcode, scan_type, quantity, entry_method, scanned_by, transaction_id, metadata, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'scan-acme-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || ((gs % 180) + 1)::text),
  'ACMEBC' || lpad(((gs % 180) + 1)::text, 8, '0'),
  CASE WHEN gs % 3 = 0 THEN 'stock_out' WHEN gs % 3 = 1 THEN 'lookup' ELSE 'stock_in' END,
  1 + (gs % 5),
  CASE WHEN gs % 2 = 0 THEN 'camera' ELSE 'manual' END,
  CASE WHEN gs % 2 = 0 THEN '44444444-4444-4444-4444-444444444444'::uuid ELSE '55555555-5555-5555-5555-555555555555'::uuid END,
  NULL,
  jsonb_build_object('seed_scan', true, 'ordinal', gs),
  timezone('utc'::text, now()) - (gs || ' minutes')::interval
FROM generate_series(1, 500) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_events (id, company_id, rule_id, product_id, alert_type, severity, status, message, metadata, triggered_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-alert-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  '95959595-9595-9595-9595-959595959001'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || ((gs % 180) + 1)::text),
  'low_stock',
  CASE WHEN gs % 5 = 0 THEN 'critical' WHEN gs % 2 = 0 THEN 'high' ELSE 'medium' END,
  CASE WHEN gs % 6 = 0 THEN 'resolved' WHEN gs % 4 = 0 THEN 'acknowledged' ELSE 'open' END,
  'Synthetic low stock alert #' || gs::text,
  jsonb_build_object('qoh', gs % 12, 'threshold', 15),
  timezone('utc'::text, now()) - (gs || ' hours')::interval
FROM generate_series(1, 160) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_delivery_logs (id, company_id, alert_event_id, channel, recipient, status, provider_message_id, sent_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-alert-delivery-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-alert-' || gs::text),
  CASE WHEN gs % 2 = 0 THEN 'email' ELSE 'in_app' END,
  CASE WHEN gs % 2 = 0 THEN 'ops@acme.test' ELSE 'dashboard' END,
  'sent',
  'seed-msg-' || gs::text,
  timezone('utc'::text, now()) - (gs || ' hours')::interval + interval '5 minutes'
FROM generate_series(1, 160) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.report_exports (id, company_id, report_type, export_format, date_range_start, date_range_end, filters, status, requested_by, file_path, completed_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-export-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE WHEN gs % 3 = 0 THEN 'inventory_valuation' WHEN gs % 3 = 1 THEN 'stock_movement' ELSE 'reorder_analysis' END,
  CASE WHEN gs % 2 = 0 THEN 'csv' ELSE 'pdf' END,
  current_date - (30 + gs),
  current_date - gs,
  jsonb_build_object('seed_batch', gs),
  CASE WHEN gs % 10 = 0 THEN 'failed' WHEN gs % 4 = 0 THEN 'processing' ELSE 'completed' END,
  '33333333-3333-3333-3333-333333333333'::uuid,
  CASE WHEN gs % 10 = 0 OR gs % 4 = 0 THEN NULL ELSE 'exports/acme-auto-' || gs::text || '.csv' END,
  CASE WHEN gs % 10 = 0 OR gs % 4 = 0 THEN NULL ELSE timezone('utc'::text, now()) - (gs || ' days')::interval END
FROM generate_series(1, 120) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organisation_audit_events (id, org_id, actor_user_id, action, app_code, target_org_member_id, metadata, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'org-audit-acme-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE WHEN gs % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '22222222-2222-2222-2222-222222222222'::uuid END,
  CASE WHEN gs % 3 = 0 THEN 'org_member_app_seat_assigned' ELSE 'org_seat_limit_updated' END,
  CASE WHEN gs % 2 = 0 THEN 'stoqr' ELSE 'etl' END,
  CASE WHEN gs % 4 = 0 THEN 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a004'::uuid ELSE NULL END,
  jsonb_build_object('seed', true, 'ordinal', gs),
  timezone('utc'::text, now()) - (gs || ' hours')::interval
FROM generate_series(1, 180) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_admin_audit_events (id, actor_user_id, action, metadata, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'platform-audit-' || gs::text),
  '11111111-1111-1111-1111-111111111111'::uuid,
  CASE WHEN gs % 2 = 0 THEN 'feature_flag_updated' ELSE 'pricing_plan_updated' END,
  jsonb_build_object('seed', true, 'batch', gs),
  timezone('utc'::text, now()) - (gs || ' hours')::interval
FROM generate_series(1, 120) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_app_health_snapshots (id, app_code, uptime_percent, error_spike_level, active_alert_count, incident_summary, measured_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'etl-health-' || gs::text),
  'etl',
  round((97.5 + (gs % 20) * 0.1)::numeric, 2),
  CASE WHEN gs % 12 = 0 THEN 'high' WHEN gs % 6 = 0 THEN 'medium' WHEN gs % 3 = 0 THEN 'low' ELSE 'stable' END,
  gs % 7,
  'ETL synthetic health sample #' || gs::text,
  timezone('utc'::text, now()) - (gs || ' minutes')::interval
FROM generate_series(1, 160) AS gs
UNION ALL
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'stoqr-health-' || gs::text),
  'stoqr',
  round((96.8 + (gs % 18) * 0.12)::numeric, 2),
  CASE WHEN gs % 10 = 0 THEN 'high' WHEN gs % 5 = 0 THEN 'medium' WHEN gs % 3 = 0 THEN 'low' ELSE 'stable' END,
  gs % 9,
  'StoQR synthetic health sample #' || gs::text,
  timezone('utc'::text, now()) - (gs || ' minutes')::interval
FROM generate_series(1, 160) AS gs
ON CONFLICT (id) DO NOTHING;

COMMIT;