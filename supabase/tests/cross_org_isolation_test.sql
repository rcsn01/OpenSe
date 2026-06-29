-- Behavioral cross-organisation isolation guard.
--
-- Seeds two fully independent organisations (each owner is auto-provisioned with
-- etl/stoqr/open-kb seats, roles, and memberships by the org triggers) and proves
-- that, when authenticated as one organisation's owner, none of the other
-- organisation's rows are visible through any tenant table, view, or helper.
--
-- The table/view reads run as the `authenticated` role with a forged
-- request.jwt.claim.sub so RLS is enforced exactly as in production. The helper
-- functions are SECURITY DEFINER and keyed off auth.uid()/explicit ids, so they
-- are exercised as superuser with the JWT GUC set (mirroring stoqr_permission_matrix.sql),
-- because several are intentionally not EXECUTE-able by `authenticated`.

BEGIN;

SELECT plan(1);

DO $$
DECLARE
  c_user_a CONSTANT UUID := 'aaaa1111-0000-4000-8000-000000000001';
  c_user_b CONSTANT UUID := 'bbbb2222-0000-4000-8000-000000000001';
  c_org_a  CONSTANT UUID := 'aaaa1111-0000-4000-8000-0000000000a0';
  c_org_b  CONSTANT UUID := 'bbbb2222-0000-4000-8000-0000000000b0';
  v_project_a UUID;
  v_project_b UUID;
  v_count BIGINT;
BEGIN
  -- The default instance cap is a single organisation; lift it for the test.
  UPDATE public.platform_instance_settings
  SET max_organisations = 1000
  WHERE id = true;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  VALUES
    ('00000000-0000-0000-0000-000000000000', c_user_a, 'authenticated', 'authenticated',
     'owner-a@orga.test', extensions.crypt('!Password1', extensions.gen_salt('bf')),
     timezone('utc'::text, now()), '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Owner A"}'::jsonb, timezone('utc'::text, now()), timezone('utc'::text, now()),
     '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', c_user_b, 'authenticated', 'authenticated',
     'owner-b@orgb.test', extensions.crypt('!Password1', extensions.gen_salt('bf')),
     timezone('utc'::text, now()), '{"provider":"email","providers":["email"]}'::jsonb,
     '{"full_name":"Owner B"}'::jsonb, timezone('utc'::text, now()), timezone('utc'::text, now()),
     '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name)
  VALUES
    (c_user_a, 'owner-a@orga.test', 'Owner A'),
    (c_user_b, 'owner-b@orgb.test', 'Owner B')
  ON CONFLICT (id) DO NOTHING;

  -- Owner triggers seed memberships, etl/stoqr/open-kb seats, and owner roles.
  INSERT INTO public.organisations (id, name, owner_id)
  VALUES
    (c_org_a, 'Organisation A', c_user_a),
    (c_org_b, 'Organisation B', c_user_b);

  -- Representative tenant data in each organisation.
  INSERT INTO stoqr.folders (company_id, name) VALUES (c_org_a, 'Folder A'), (c_org_b, 'Folder B');
  INSERT INTO stoqr.products (company_id, name) VALUES (c_org_a, 'Product A'), (c_org_b, 'Product B');
  INSERT INTO stoqr.suppliers (company_id, name) VALUES (c_org_a, 'Supplier A'), (c_org_b, 'Supplier B');

  INSERT INTO etl.workflows (name, owner_id, org_id)
  VALUES ('Workflow A', c_user_a, c_org_a), ('Workflow B', c_user_b, c_org_b);

  INSERT INTO kb.projects (organisation_id, name, identifier)
  VALUES (c_org_a, 'Project A', 'PRA') RETURNING id INTO v_project_a;
  INSERT INTO kb.projects (organisation_id, name, identifier)
  VALUES (c_org_b, 'Project B', 'PRB') RETURNING id INTO v_project_b;

  INSERT INTO kb.issues (organisation_id, project_id, title)
  VALUES (c_org_a, v_project_a, 'Issue A');
  INSERT INTO kb.issues (organisation_id, project_id, title)
  VALUES (c_org_b, v_project_b, 'Issue B');

  -- ---- Behavioral reads under RLS as the authenticated role ----
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Owner A must never see Organisation B rows.
  PERFORM set_config('request.jwt.claim.sub', c_user_a::text, true);

  SELECT count(*) INTO v_count FROM stoqr.products WHERE company_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner can read Org B stoqr.products (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM stoqr.folders WHERE company_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner can read Org B stoqr.folders (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM stoqr.suppliers WHERE company_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner can read Org B stoqr.suppliers (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM etl.workflows WHERE org_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner can read Org B etl.workflows (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM kb.projects WHERE organisation_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner can read Org B kb.projects (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE organisation_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner can read Org B kb.issues (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM stoqr.my_permissions WHERE company_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner sees Org B in stoqr.my_permissions (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM kb.my_permissions WHERE organisation_id = c_org_b;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org A owner sees Org B in kb.my_permissions (% rows)', v_count; END IF;

  -- Sanity: Owner A can read their own organisation (guards against over-blocking).
  SELECT count(*) INTO v_count FROM stoqr.products WHERE company_id = c_org_a;
  IF v_count < 1 THEN RAISE EXCEPTION 'Org A owner cannot read own stoqr.products'; END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE organisation_id = c_org_a;
  IF v_count < 1 THEN RAISE EXCEPTION 'Org A owner cannot read own kb.issues'; END IF;

  -- Owner B must never see Organisation A rows.
  PERFORM set_config('request.jwt.claim.sub', c_user_b::text, true);

  SELECT count(*) INTO v_count FROM stoqr.products WHERE company_id = c_org_a;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org B owner can read Org A stoqr.products (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM etl.workflows WHERE org_id = c_org_a;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org B owner can read Org A etl.workflows (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM kb.projects WHERE organisation_id = c_org_a;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org B owner can read Org A kb.projects (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM kb.issues WHERE organisation_id = c_org_a;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org B owner can read Org A kb.issues (% rows)', v_count; END IF;
  SELECT count(*) INTO v_count FROM kb.my_permissions WHERE organisation_id = c_org_a;
  IF v_count <> 0 THEN RAISE EXCEPTION 'Org B owner sees Org A in kb.my_permissions (% rows)', v_count; END IF;

  SELECT count(*) INTO v_count FROM stoqr.products WHERE company_id = c_org_b;
  IF v_count < 1 THEN RAISE EXCEPTION 'Org B owner cannot read own stoqr.products'; END IF;

  EXECUTE 'RESET ROLE';

  -- ---- Helper functions deny the foreign organisation ----
  -- Evaluated as superuser with the JWT GUC set, matching how RLS evaluates them.
  PERFORM set_config('request.jwt.claim.sub', c_user_a::text, true);

  IF app_private.is_org_member(c_org_b, c_user_a) THEN
    RAISE EXCEPTION 'app_private.is_org_member must be false for a foreign org';
  END IF;
  IF NOT app_private.is_org_member(c_org_a, c_user_a) THEN
    RAISE EXCEPTION 'app_private.is_org_member must be true for the owner''s own org';
  END IF;
  IF app_private.is_org_admin(c_org_b, c_user_a) THEN
    RAISE EXCEPTION 'app_private.is_org_admin must be false for a foreign org';
  END IF;
  IF app_private.has_permission(c_org_b, 'inventory.view') THEN
    RAISE EXCEPTION 'app_private.has_permission must be false for a foreign org';
  END IF;
  IF NOT app_private.has_permission(c_org_a, 'inventory.view') THEN
    RAISE EXCEPTION 'app_private.has_permission must be true for the owner''s own org';
  END IF;
  IF app_private.has_etl_permission(c_org_b, 'workflows.view') THEN
    RAISE EXCEPTION 'app_private.has_etl_permission must be false for a foreign org';
  END IF;
  IF kb.has_app_seat(c_org_b) THEN
    RAISE EXCEPTION 'kb.has_app_seat must be false for a foreign org';
  END IF;
  IF NOT kb.has_app_seat(c_org_a) THEN
    RAISE EXCEPTION 'kb.has_app_seat must be true for the owner''s own org';
  END IF;
  IF kb.has_permission(c_org_b, 'projects.view') THEN
    RAISE EXCEPTION 'kb.has_permission must be false for a foreign org';
  END IF;
  IF kb.has_project_access(v_project_b) THEN
    RAISE EXCEPTION 'kb.has_project_access must be false for a foreign org project';
  END IF;

  -- Symmetric check for Owner B against Organisation A.
  PERFORM set_config('request.jwt.claim.sub', c_user_b::text, true);

  IF app_private.has_permission(c_org_a, 'inventory.view') THEN
    RAISE EXCEPTION 'app_private.has_permission must be false for a foreign org (B->A)';
  END IF;
  IF kb.has_app_seat(c_org_a) THEN
    RAISE EXCEPTION 'kb.has_app_seat must be false for a foreign org (B->A)';
  END IF;
  IF kb.has_project_access(v_project_a) THEN
    RAISE EXCEPTION 'kb.has_project_access must be false for a foreign org project (B->A)';
  END IF;
END;
$$;

RESET ROLE;

SELECT pass('No organisation can read another organisation''s rows via tables, views, or helper functions');

SELECT * FROM finish();

ROLLBACK;
