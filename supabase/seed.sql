--
-- supabase/seed.sql
--

-- 1. Create Users in auth.users
-- We include 'raw_app_meta_data' to tell Supabase Auth that these users use the 'email' provider.
-- The 'handle_new_user' trigger will automatically create public.profiles entries.

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
    '{"provider": "email", "providers": ["email"]}',
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
    '{"provider": "email", "providers": ["email"]}',
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
    '{"provider": "email", "providers": ["email"]}',
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
    '{"provider": "email", "providers": ["email"]}',
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
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "User Two"}',
    now(),
    now()
);

-- 2. Create Organizations
INSERT INTO public.organizations (id, name, owner_id) VALUES 
(
    '10000000-0000-0000-0000-000000000001', 
    'Organisation 1', 
    '00000000-0000-0000-0000-000000000002'
),
(
    '10000000-0000-0000-0000-000000000002', 
    'Organisation 2', 
    '00000000-0000-0000-0000-000000000004'
);

-- 3. Create Memberships
INSERT INTO public.organization_members (org_id, user_id, role) VALUES 
-- Organisation 1
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member'),
-- Organisation 2
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'admin'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'member');

-- 4. Create Identities (CRITICAL FOR LOGIN)
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
(
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '{"sub": "00000000-0000-0000-0000-000000000001", "email": "ivan.earth2024@gmail.com", "email_verified": true, "phone_verified": false}',
    'email',
    now(),
    now(),
    now()
),
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