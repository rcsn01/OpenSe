--
-- supabase/seed.sql
--

-- 1. Create Users in auth.users
-- Note: The 'handle_new_user' trigger will automatically create public.profiles entries for these.
-- We insert Ivan FIRST so he becomes the Super Admin.

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
-- 1. Super Admin (First user = Super Admin)
(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'ivan.earth2024@gmail.com',
    crypt('watermelon', gen_salt('bf')),
    now(),
    '{"full_name": "Ivan Super Admin"}',
    now(),
    now()
),
-- 2. Organisation 1 Admin
(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'admin1@gmail.com',
    crypt('Orange', gen_salt('bf')),
    now(),
    '{"full_name": "Admin One"}',
    now(),
    now()
),
-- 3. Organisation 1 User
(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'user1@gmail.com',
    crypt('Orange', gen_salt('bf')),
    now(),
    '{"full_name": "User One"}',
    now(),
    now()
),
-- 4. Organisation 2 Admin
(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'admin2@gmail.com',
    crypt('Orange', gen_salt('bf')),
    now(),
    '{"full_name": "Admin Two"}',
    now(),
    now()
),
-- 5. Organisation 2 User
(
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'user2@gmail.com',
    crypt('Orange', gen_salt('bf')),
    now(),
    '{"full_name": "User Two"}',
    now(),
    now()
);

-- 2. Create Organizations
-- We assign the 'admin' users as the owners of their respective orgs.

INSERT INTO public.organizations (id, name, owner_id) VALUES 
(
    '10000000-0000-0000-0000-000000000001', 
    'Organisation 1', 
    '00000000-0000-0000-0000-000000000002' -- Owned by admin1
),
(
    '10000000-0000-0000-0000-000000000002', 
    'Organisation 2', 
    '00000000-0000-0000-0000-000000000004' -- Owned by admin2
);

-- 3. Create Memberships
-- Assign users to orgs with specific roles (admin/member)

INSERT INTO public.organization_members (org_id, user_id, role) VALUES 
-- Organisation 1 Members
(
    '10000000-0000-0000-0000-000000000001', -- Org 1
    '00000000-0000-0000-0000-000000000002', -- admin1
    'admin'
),
(
    '10000000-0000-0000-0000-000000000001', -- Org 1
    '00000000-0000-0000-0000-000000000003', -- user1
    'member'
),
-- Organisation 2 Members
(
    '10000000-0000-0000-0000-000000000002', -- Org 2
    '00000000-0000-0000-0000-000000000004', -- admin2
    'admin'
),
(
    '10000000-0000-0000-0000-000000000002', -- Org 2
    '00000000-0000-0000-0000-000000000005', -- user2
    'member'
);

-- 4. Create Identities (REQUIRED for Login)
-- Without these, Supabase Auth will throw a 500 error because it cannot find the provider data.

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
-- 1. Ivan Super Admin
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001', -- Must match auth.users.id
  '00000000-0000-0000-0000-000000000001', -- For email provider, this is usually the user_id
  '{"sub": "00000000-0000-0000-0000-000000000001", "email": "ivan.earth2024@gmail.com", "email_verified": true, "phone_verified": false}',
  'email',
  now(),
  now(),
  now()
),
-- 2. Admin One
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub": "00000000-0000-0000-0000-000000000002", "email": "admin1@gmail.com", "email_verified": true, "phone_verified": false}',
  'email',
  now(),
  now(),
  now()
),
-- 3. User One
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000003',
  '{"sub": "00000000-0000-0000-0000-000000000003", "email": "user1@gmail.com", "email_verified": true, "phone_verified": false}',
  'email',
  now(),
  now(),
  now()
),
-- 4. Admin Two
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000004',
  '{"sub": "00000000-0000-0000-0000-000000000004", "email": "admin2@gmail.com", "email_verified": true, "phone_verified": false}',
  'email',
  now(),
  now(),
  now()
),
-- 5. User Two
(
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000005',
  '{"sub": "00000000-0000-0000-0000-000000000005", "email": "user2@gmail.com", "email_verified": true, "phone_verified": false}',
  'email',
  now(),
  now(),
  now()
);