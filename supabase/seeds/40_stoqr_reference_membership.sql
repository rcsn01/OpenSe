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

-- Repair system-managed StoQR baseline roles after custom seed roles.
SELECT public.ensure_stoqr_default_role(o.id)
FROM public.organisations o;

INSERT INTO stoqr.role_permissions (role_id, permission_code)
VALUES
  ('20202020-2020-2020-2020-202020202020', 'dashboard.view'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.view'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.use'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.create'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.edit'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.adjust'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.delete'),
  ('20202020-2020-2020-2020-202020202020', 'inventory.import_export'),
  ('20202020-2020-2020-2020-202020202020', 'scanner.view'),
  ('20202020-2020-2020-2020-202020202020', 'scanner.use'),
  ('20202020-2020-2020-2020-202020202020', 'reports.view'),
  ('20202020-2020-2020-2020-202020202020', 'reports.export'),
  ('20202020-2020-2020-2020-202020202020', 'procurement.view'),
  ('20202020-2020-2020-2020-202020202020', 'procurement.create'),
  ('20202020-2020-2020-2020-202020202020', 'procurement.receive'),
  ('20202020-2020-2020-2020-202020202020', 'procurement.manage'),
  ('20202020-2020-2020-2020-202020202020', 'alerts.view'),
  ('20202020-2020-2020-2020-202020202020', 'alerts.use'),
  ('20202020-2020-2020-2020-202020202020', 'alerts.manage'),
  ('20202020-2020-2020-2020-202020202020', 'labels.view'),
  ('20202020-2020-2020-2020-202020202020', 'labels.use'),
  ('20202020-2020-2020-2020-202020202020', 'labels.manage'),
  ('20202020-2020-2020-2020-202020202020', 'organisation.view'),
  ('20202020-2020-2020-2020-202020202020', 'organisation.members.manage'),
  ('20202020-2020-2020-2020-202020202020', 'organisation.roles.manage'),
  ('20202020-2020-2020-2020-202020202020', 'organisation.pages.manage'),
  ('20202020-2020-2020-2020-202020202020', 'organisation.activity.view'),
  ('30303030-3030-3030-3030-303030303030', 'dashboard.view'),
  ('30303030-3030-3030-3030-303030303030', 'inventory.view'),
  ('30303030-3030-3030-3030-303030303030', 'inventory.use'),
  ('30303030-3030-3030-3030-303030303030', 'reports.view'),
  ('50505050-5050-5050-5050-505050505050', 'inventory.view'),
  ('50505050-5050-5050-5050-505050505050', 'inventory.use'),
  ('50505050-5050-5050-5050-505050505050', 'scanner.view'),
  ('50505050-5050-5050-5050-505050505050', 'scanner.use'),
  ('50505050-5050-5050-5050-505050505050', 'inventory.adjust')
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

-- Any seeded StoQR seat without an explicit role starts as Default.
INSERT INTO stoqr.organisation_member_roles (user_id, company_id, role_id)
SELECT om.user_id, om.org_id, default_role.id
FROM public.organisation_member_app_seats mas
JOIN public.organisation_members om
  ON om.id = mas.org_member_id
JOIN stoqr.roles default_role
  ON default_role.company_id = om.org_id
 AND lower(default_role.name) = 'default'
WHERE mas.app_code = 'stoqr'
ON CONFLICT (user_id, company_id) DO NOTHING;

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

INSERT INTO stoqr.organisation_page_settings (
  company_id,
  reports_enabled,
  procurement_enabled,
  alerts_enabled
)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, true, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, true, true)
ON CONFLICT (company_id) DO UPDATE
SET
  reports_enabled = EXCLUDED.reports_enabled,
  procurement_enabled = EXCLUDED.procurement_enabled,
  alerts_enabled = EXCLUDED.alerts_enabled;

INSERT INTO stoqr.label_templates (company_id, name, is_system, layout, variable_fields)
VALUES
  (NULL, 'Standard Product Barcode', true, '{}'::jsonb, '{barcode,sku,name,price,qr}'::text[]),
  (NULL, 'Warehouse Bin Locator', true, '{}'::jsonb, '{barcode,name,qr}'::text[]),
  (NULL, 'B2B Shipping Label (4x6)', true, '{}'::jsonb, '{barcode,sku,name,qr}'::text[])
ON CONFLICT DO NOTHING;

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
