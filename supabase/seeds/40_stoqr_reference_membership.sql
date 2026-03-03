-- 3) StoQR reference + membership
-- ------------------------------------------------------------

INSERT INTO stoqr.roles (id, company_id, name, description, role_rank)
VALUES
  ('20202020-2020-2020-2020-202020202020', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Manager', 'Operational manager role for Acme', 800),
  ('30303030-3030-3030-3030-303030303030', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Viewer', 'Read-only role for Acme', 300),
  ('50505050-5050-5050-5050-505050505050', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Operator', 'Warehouse operator role for Globex', 600)
ON CONFLICT (company_id, name) DO UPDATE
SET description = EXCLUDED.description,
    role_rank = EXCLUDED.role_rank;

INSERT INTO stoqr.role_permissions (role_id, permission_code)
VALUES
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
  ('50505050-5050-5050-5050-505050505050', 'products.view'),
  ('50505050-5050-5050-5050-505050505050', 'scanner.use'),
  ('50505050-5050-5050-5050-505050505050', 'transactions.create')
ON CONFLICT (role_id, permission_code) DO NOTHING;

INSERT INTO stoqr.role_permissions (role_id, permission_code)
SELECT r.id, p.code
FROM stoqr.roles r
JOIN stoqr.app_permissions p ON TRUE
WHERE lower(r.name) = 'owner'
ON CONFLICT (role_id, permission_code) DO NOTHING;

INSERT INTO stoqr.organisation_member_roles (id, user_id, company_id, role_id)
SELECT
  src.id,
  src.user_id,
  src.company_id,
  sr.id
FROM (
  VALUES
    ('60606060-6060-6060-6060-606060606001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Owner'::text),
    ('60606060-6060-6060-6060-606060606002'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Manager'::text),
    ('60606060-6060-6060-6060-606060606003'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Manager'::text),
    ('60606060-6060-6060-6060-606060606004'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Viewer'::text),
    ('60606060-6060-6060-6060-606060606005'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Owner'::text)
) AS src(id, user_id, company_id, role_name)
JOIN stoqr.roles sr
  ON sr.company_id = src.company_id
 AND sr.name = src.role_name
ON CONFLICT (user_id, company_id) DO UPDATE
SET role_id = EXCLUDED.role_id;

-- Enforce owner invariants across public + app-specific membership tables.
INSERT INTO public.organisation_members (org_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM public.organisations o
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = 'owner';

INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT om.id, apps.app_code
FROM public.organisations o
JOIN public.organisation_members om
  ON om.org_id = o.id
 AND om.user_id = o.owner_id
CROSS JOIN (VALUES ('etl'::text), ('stoqr'::text)) AS apps(app_code)
ON CONFLICT (org_member_id, app_code) DO NOTHING;

INSERT INTO etl.organisation_member_roles (org_member_id, role_id)
SELECT om.id, er.id
FROM public.organisations o
JOIN public.organisation_members om
  ON om.org_id = o.id
 AND om.user_id = o.owner_id
JOIN etl.roles er
  ON er.org_id = o.id
 AND lower(er.name) = 'owner'
ON CONFLICT (org_member_id) DO UPDATE
SET role_id = EXCLUDED.role_id;

INSERT INTO stoqr.organisation_member_roles (user_id, company_id, role_id)
SELECT o.owner_id, o.id, sr.id
FROM public.organisations o
JOIN stoqr.roles sr
  ON sr.company_id = o.id
 AND lower(sr.name) = 'owner'
ON CONFLICT (user_id, company_id) DO UPDATE
SET role_id = EXCLUDED.role_id;

INSERT INTO public.subscriptions (
  id,
  org_id,
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
ON CONFLICT (id) DO UPDATE
SET
  status = EXCLUDED.status,
  price_id = EXCLUDED.price_id,
  quantity = EXCLUDED.quantity,
  cancel_at_period_end = EXCLUDED.cancel_at_period_end,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  ended_at = EXCLUDED.ended_at;

-- ------------------------------------------------------------