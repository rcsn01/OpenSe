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
    '11111111-1111-1111-1111-111111111111',
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
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'admin'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'editor'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '55555555-5555-5555-5555-555555555555', 'member'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a006', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '77777777-7777-7777-7777-777777777777', 'editor'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 'member'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a008', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'member'),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'owner')
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
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '77777777-7777-7777-7777-777777777777'::uuid, 'etl'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '88888888-8888-8888-8888-888888888888'::uuid, 'stoqr'::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '99999999-9999-9999-9999-999999999999'::uuid, 'etl'::text),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'etl'::text),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'stoqr'::text)
) AS src(org_id, user_id, app_code)
JOIN public.organisation_members om
  ON om.org_id = src.org_id
 AND om.user_id = src.user_id
ON CONFLICT (org_member_id, app_code) DO NOTHING;

-- ------------------------------------------------------------