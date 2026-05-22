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
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '77777777-7777-7777-7777-777777777777',
    'authenticated',
    'authenticated',
    'analyst@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Avery Analyst","username":"averyanalyst","avatar_url":"https://i.pravatar.cc/150?u=avery"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '88888888-8888-8888-8888-888888888888',
    'authenticated',
    'authenticated',
    'coordinator@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Casey Coordinator","username":"caseycoordinator","avatar_url":"https://i.pravatar.cc/150?u=casey"}'::jsonb,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '99999999-9999-9999-9999-999999999999',
    'authenticated',
    'authenticated',
    'qa@acme.test',
    extensions.crypt('!Password1', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Quinn QA","username":"quinnqa","avatar_url":"https://i.pravatar.cc/150?u=quinn"}'::jsonb,
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
  ),
  (
    'aaaaaaa7-aaaa-aaaa-aaaa-aaaaaaaaaaa7',
    '77777777-7777-7777-7777-777777777777',
    jsonb_build_object('sub', '77777777-7777-7777-7777-777777777777', 'email', 'analyst@acme.test'),
    'email',
    'analyst@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa8-aaaa-aaaa-aaaa-aaaaaaaaaaa8',
    '88888888-8888-8888-8888-888888888888',
    jsonb_build_object('sub', '88888888-8888-8888-8888-888888888888', 'email', 'coordinator@acme.test'),
    'email',
    'coordinator@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaa9-aaaa-aaaa-aaaa-aaaaaaaaaaa9',
    '99999999-9999-9999-9999-999999999999',
    jsonb_build_object('sub', '99999999-9999-9999-9999-999999999999', 'email', 'qa@acme.test'),
    'email',
    'qa@acme.test',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
