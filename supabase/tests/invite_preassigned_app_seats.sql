BEGIN;

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
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '12121212-1212-1212-1212-121212121212',
  'authenticated',
  'authenticated',
  'preassigned@acme.test',
  extensions.crypt('!Password1', extensions.gen_salt('bf')),
  timezone('utc'::text, now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Preassigned User"}'::jsonb,
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name)
VALUES (
  '12121212-1212-1212-1212-121212121212',
  'preassigned@acme.test',
  'Preassigned User'
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_invite_id UUID;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  PERFORM set_config('request.jwt.claim.email', 'admin@acme.test', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT id
  INTO v_invite_id
  FROM public.accounts_invite_organisation_member(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'preassigned@acme.test'
  );

  PERFORM public.accounts_assign_org_invite_app_seat(v_invite_id, 'etl');

  IF NOT EXISTS (
    SELECT 1
    FROM public.organisation_invite_app_seats
    WHERE invite_id = v_invite_id
      AND app_code = 'etl'
  ) THEN
    RAISE EXCEPTION 'Admin should be able to pre-assign a seat to a pending invite';
  END IF;

  PERFORM public.accounts_unassign_org_invite_app_seat(v_invite_id, 'etl');

  IF EXISTS (
    SELECT 1
    FROM public.organisation_invite_app_seats
    WHERE invite_id = v_invite_id
      AND app_code = 'etl'
  ) THEN
    RAISE EXCEPTION 'Admin should be able to remove a pre-assigned invite seat';
  END IF;

  PERFORM public.accounts_assign_org_invite_app_seat(v_invite_id, 'stoqr');
END;
$$;

DO $$
DECLARE
  v_member_id UUID;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '12121212-1212-1212-1212-121212121212', true);
  PERFORM set_config('request.jwt.claim.email', 'preassigned@acme.test', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  PERFORM public.accept_invite((
    SELECT id
    FROM public.organisation_invites
    WHERE org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      AND email = 'preassigned@acme.test'
    LIMIT 1
  ));

  SELECT id
  INTO v_member_id
  FROM public.organisation_members
  WHERE org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    AND user_id = '12121212-1212-1212-1212-121212121212';

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Accepting invite should create an organisation membership';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organisation_member_app_seats
    WHERE org_member_id = v_member_id
      AND app_code = 'stoqr'
  ) THEN
    RAISE EXCEPTION 'Accepted invite should transfer pre-assigned seats to the new member';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
