BEGIN;

DO $$
DECLARE
  v_company_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  IF NOT app_private.has_permission(v_company_id, 'inventory.view') THEN
    RAISE EXCEPTION 'Viewer should have inventory.view';
  END IF;

  IF NOT app_private.has_permission(v_company_id, 'inventory.use') THEN
    RAISE EXCEPTION 'Viewer inventory.view legacy backfill should imply inventory.use';
  END IF;

  IF app_private.has_permission(v_company_id, 'inventory.adjust') THEN
    RAISE EXCEPTION 'Viewer should not have inventory.adjust';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

  IF NOT app_private.has_permission(v_company_id, 'scanner.view') THEN
    RAISE EXCEPTION 'Manager scanner.use should imply scanner.view';
  END IF;

  IF NOT app_private.has_permission(v_company_id, 'procurement.receive') THEN
    RAISE EXCEPTION 'Manager should have procurement.receive from seeded role';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

  IF NOT app_private.has_permission(v_company_id, 'organisation.billing.manage') THEN
    RAISE EXCEPTION 'Owner should have all StoQR permissions';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stoqr.my_permissions
    WHERE company_id = v_company_id
      AND code IN ('products.view', 'transactions.create', 'members.manage')
  ) THEN
    RAISE EXCEPTION 'stoqr.my_permissions should not return hidden legacy codes';
  END IF;
END;
$$;

ROLLBACK;
