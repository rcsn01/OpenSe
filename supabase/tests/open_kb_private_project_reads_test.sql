-- Open-KB private-project read restriction.
--
-- After 20260629092000, project-scoped reads require kb.has_project_access:
--   * a seat-holder whose role lacks 'projects.view' and who is not a project
--     member cannot read the project or its issues,
--   * adding them to kb.project_members grants read access,
--   * a user holding 'projects.view' (here, the org owner) reads regardless, and
--   * a user from another organisation sees nothing.
--
-- Reads run as the authenticated role with a forged request.jwt.claim.sub so RLS
-- is enforced exactly as in production.

BEGIN;

SELECT plan(1);

DO $$
DECLARE
  c_org_o  CONSTANT UUID := 'cccc3333-0000-4000-8000-0000000000c0';
  c_org_x  CONSTANT UUID := 'dddd4444-0000-4000-8000-0000000000d0';
  c_user_o CONSTANT UUID := 'cccc3333-0000-4000-8000-000000000001';
  c_user_l CONSTANT UUID := 'cccc3333-0000-4000-8000-000000000002';
  c_user_x CONSTANT UUID := 'dddd4444-0000-4000-8000-000000000001';
  v_member_l UUID;
  v_role_limited UUID;
  v_project UUID;
  v_count BIGINT;
BEGIN
  UPDATE public.platform_instance_settings
  SET max_organisations = 1000
  WHERE id = true;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES
    ('00000000-0000-0000-0000-000000000000', c_user_o, 'authenticated', 'authenticated',
     'owner@orgo.test', extensions.crypt('!Password1', extensions.gen_salt('bf')),
     timezone('utc'::text, now()), '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Owner O"}'::jsonb, timezone('utc'::text, now()), timezone('utc'::text, now()),
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', c_user_l, 'authenticated', 'authenticated',
     'limited@orgo.test', extensions.crypt('!Password1', extensions.gen_salt('bf')),
     timezone('utc'::text, now()), '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Limited L"}'::jsonb, timezone('utc'::text, now()), timezone('utc'::text, now()),
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', c_user_x, 'authenticated', 'authenticated',
     'owner@orgx.test', extensions.crypt('!Password1', extensions.gen_salt('bf')),
     timezone('utc'::text, now()), '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Owner X"}'::jsonb, timezone('utc'::text, now()), timezone('utc'::text, now()),
     '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES
    (c_user_o, 'owner@orgo.test', 'Owner O'),
    (c_user_l, 'limited@orgo.test', 'Limited L'),
    (c_user_x, 'owner@orgx.test', 'Owner X')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organisations (id, name, owner_id)
  VALUES (c_org_o, 'Organisation O', c_user_o), (c_org_x, 'Organisation X', c_user_x);

  -- Add the limited user to Organisation O with an open-kb seat. The seat trigger
  -- assigns the Default role (which includes projects.view); override it with a
  -- role that intentionally lacks projects.view.
  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (c_org_o, c_user_l, 'member')
  RETURNING id INTO v_member_l;

  INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
  VALUES (v_member_l, 'open-kb');

  INSERT INTO kb.roles (organisation_id, name, role_rank)
  VALUES (c_org_o, 'Limited', 50)
  RETURNING id INTO v_role_limited;

  INSERT INTO kb.role_permissions (role_id, permission_code)
  VALUES (v_role_limited, 'dashboard.view');

  UPDATE kb.organisation_member_roles
  SET role_id = v_role_limited
  WHERE org_member_id = v_member_l;

  -- A private project (owned by Organisation O) with one issue; the limited user
  -- is deliberately NOT a member of it yet.
  INSERT INTO kb.projects (organisation_id, name, identifier)
  VALUES (c_org_o, 'Secret Project', 'SEC')
  RETURNING id INTO v_project;

  INSERT INTO kb.issues (organisation_id, project_id, title)
  VALUES (c_org_o, v_project, 'Secret issue');

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- 1. Limited seat-holder, not a project member: no read access.
  PERFORM set_config('request.jwt.claim.sub', c_user_l::text, true);

  SELECT count(*) INTO v_count FROM kb.projects WHERE id = v_project;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Limited non-member must not read a private project (% rows)', v_count;
  END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE project_id = v_project;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Limited non-member must not read a private project''s issues (% rows)', v_count;
  END IF;

  -- 2. Grant project membership -> reads now succeed.
  EXECUTE 'RESET ROLE';
  INSERT INTO kb.project_members (organisation_id, project_id, profile_id, role)
  VALUES (c_org_o, v_project, c_user_l, 'member');

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.sub', c_user_l::text, true);

  SELECT count(*) INTO v_count FROM kb.projects WHERE id = v_project;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Project member must be able to read the project';
  END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE project_id = v_project;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Project member must be able to read the project''s issues';
  END IF;

  -- 3. Owner holds projects.view -> reads regardless of project membership.
  PERFORM set_config('request.jwt.claim.sub', c_user_o::text, true);

  SELECT count(*) INTO v_count FROM kb.projects WHERE id = v_project;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Owner with projects.view must read the project';
  END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE project_id = v_project;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Owner with projects.view must read the project''s issues';
  END IF;

  -- 4. A user from another organisation still sees nothing.
  PERFORM set_config('request.jwt.claim.sub', c_user_x::text, true);

  SELECT count(*) INTO v_count FROM kb.projects WHERE id = v_project;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Cross-org user must not read another org''s project (% rows)', v_count;
  END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE project_id = v_project;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Cross-org user must not read another org''s issues (% rows)', v_count;
  END IF;

  EXECUTE 'RESET ROLE';
END;
$$;

RESET ROLE;

SELECT pass('Open-KB private projects are readable only by members or projects.view holders, never across organisations');

SELECT * FROM finish();

ROLLBACK;
