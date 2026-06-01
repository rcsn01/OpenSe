BEGIN;

DO $$
DECLARE
  v_company_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_product_id UUID := '84848484-8484-8484-8484-f00000000001';
  v_updated_barcode TEXT := 'trigger-helper-test-barcode-updated';
BEGIN
  IF has_function_privilege('anon', 'stoqr.normalize_product_identity_fields()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon should not execute stoqr.normalize_product_identity_fields directly';
  END IF;

  IF has_function_privilege('authenticated', 'stoqr.normalize_product_identity_fields()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should not execute stoqr.normalize_product_identity_fields directly';
  END IF;

  IF has_function_privilege('anon', 'stoqr.sync_product_barcode_identities()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon should not execute stoqr.sync_product_barcode_identities directly';
  END IF;

  IF has_function_privilege('authenticated', 'stoqr.sync_product_barcode_identities()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should not execute stoqr.sync_product_barcode_identities directly';
  END IF;

  INSERT INTO stoqr.products (
    id,
    company_id,
    sku,
    primary_barcode,
    name
  )
  VALUES (
    v_product_id,
    v_company_id,
    ' trigger-helper-test-sku ',
    ' trigger-helper-test-barcode ',
    'Trigger helper privilege test product'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.products
    WHERE id = v_product_id
      AND sku = 'trigger-helper-test-sku'
      AND primary_barcode = 'trigger-helper-test-barcode'
  ) THEN
    RAISE EXCEPTION 'Product identity trigger should trim SKU and primary barcode';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.product_barcodes
    WHERE company_id = v_company_id
      AND product_id = v_product_id
      AND barcode = v_product_id::text
      AND is_primary = false
  ) THEN
    RAISE EXCEPTION 'Barcode sync trigger should create non-primary product-id barcode';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.product_barcodes
    WHERE company_id = v_company_id
      AND product_id = v_product_id
      AND barcode = 'trigger-helper-test-barcode'
      AND is_primary = true
  ) THEN
    RAISE EXCEPTION 'Barcode sync trigger should create primary barcode identity';
  END IF;

  UPDATE stoqr.products
  SET primary_barcode = v_updated_barcode
  WHERE id = v_product_id;

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.product_barcodes
    WHERE company_id = v_company_id
      AND product_id = v_product_id
      AND barcode = v_updated_barcode
      AND is_primary = true
  ) THEN
    RAISE EXCEPTION 'Barcode sync trigger should maintain updated primary barcode identity';
  END IF;
END;
$$;

ROLLBACK;
