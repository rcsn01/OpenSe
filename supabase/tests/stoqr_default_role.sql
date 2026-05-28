BEGIN;

DO $$
DECLARE
  v_company_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_default_role_id UUID;
  v_owner_role_id UUID;
  v_manager_role_id UUID;
  v_preserved_role_id UUID;
BEGIN
  SELECT id
  INTO v_default_role_id
  FROM stoqr.roles
  WHERE company_id = v_company_id
    AND lower(name) = 'default';

  IF v_default_role_id IS NULL THEN
    RAISE EXCEPTION 'Default role should exist for each StoQR organisation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stoqr.roles
    WHERE id = v_default_role_id
      AND (name <> 'Default' OR description <> 'System-managed default role' OR role_rank <> 0)
  ) THEN
    RAISE EXCEPTION 'Default role should be rank 0, canonically named, and system described';
  END IF;

  IF (
    SELECT array_agg(permission_code ORDER BY permission_code)
    FROM stoqr.role_permissions
    WHERE role_id = v_default_role_id
  ) IS DISTINCT FROM ARRAY['dashboard.view', 'inventory.view'] THEN
    RAISE EXCEPTION 'Default should start with former Guest dashboard.view and inventory.view baseline';
  END IF;

  BEGIN
    UPDATE stoqr.roles
    SET name = 'Renamed Default'
    WHERE id = v_default_role_id;
    RAISE EXCEPTION 'Default rename should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Default rename should have failed' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    UPDATE stoqr.roles
    SET role_rank = 10
    WHERE id = v_default_role_id;
    RAISE EXCEPTION 'Default rank update should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Default rank update should have failed' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    DELETE FROM stoqr.roles
    WHERE id = v_default_role_id;
    RAISE EXCEPTION 'Default delete should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Default delete should have failed' THEN
      RAISE;
    END IF;
  END;

  BEGIN
    INSERT INTO stoqr.roles (company_id, name, description, role_rank)
    VALUES (v_company_id, 'Rank Zero Custom', 'Invalid custom role', 0);
    RAISE EXCEPTION 'Custom rank 0 role should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Custom rank 0 role should have failed' THEN
      RAISE;
    END IF;
  END;

  SELECT role_id
  INTO v_preserved_role_id
  FROM stoqr.organisation_member_roles
  WHERE company_id = v_company_id
    AND user_id = '88888888-8888-8888-8888-888888888888';

  IF v_preserved_role_id IS DISTINCT FROM v_default_role_id THEN
    RAISE EXCEPTION 'New StoQR seat assignment should default to Default';
  END IF;

  SELECT id
  INTO v_manager_role_id
  FROM stoqr.roles
  WHERE company_id = v_company_id
    AND name = 'Manager';

  DELETE FROM public.organisation_member_app_seats
  WHERE org_member_id = 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a002'
    AND app_code = 'stoqr';

  INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
  VALUES ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a002', 'stoqr');

  SELECT role_id
  INTO v_preserved_role_id
  FROM stoqr.organisation_member_roles
  WHERE company_id = v_company_id
    AND user_id = '33333333-3333-3333-3333-333333333333';

  IF v_preserved_role_id IS DISTINCT FROM v_manager_role_id THEN
    RAISE EXCEPTION 'Existing StoQR role should be preserved on seat reassignment';
  END IF;

  SELECT id
  INTO v_owner_role_id
  FROM stoqr.roles
  WHERE company_id = v_company_id
    AND lower(name) = 'owner';

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.role_permissions rp
    RIGHT JOIN stoqr.app_permissions ap ON ap.code = rp.permission_code
      AND rp.role_id = v_owner_role_id
    WHERE rp.permission_code IS NULL
  ) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Owner should retain all StoQR permissions';
  END IF;

  BEGIN
    DELETE FROM stoqr.role_permissions
    WHERE role_id = v_owner_role_id
      AND permission_code = 'inventory.view';
    RAISE EXCEPTION 'Owner permission delete should have failed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Owner permission delete should have failed' THEN
      RAISE;
    END IF;
  END;
END;
$$;

SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_company_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_default_role_id UUID;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT id
  INTO v_default_role_id
  FROM stoqr.roles
  WHERE company_id = v_company_id
    AND lower(name) = 'default';

  INSERT INTO stoqr.role_permissions (role_id, permission_code)
  VALUES (v_default_role_id, 'reports.view')
  ON CONFLICT DO NOTHING;

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.role_permissions
    WHERE role_id = v_default_role_id
      AND permission_code = 'reports.view'
  ) THEN
    RAISE EXCEPTION 'Authorized role manager should be able to grant Default permissions';
  END IF;

  DELETE FROM stoqr.role_permissions
  WHERE role_id = v_default_role_id
    AND permission_code = 'reports.view';

  IF EXISTS (
    SELECT 1
    FROM stoqr.role_permissions
    WHERE role_id = v_default_role_id
      AND permission_code = 'reports.view'
  ) THEN
    RAISE EXCEPTION 'Authorized role manager should be able to remove Default permissions';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
