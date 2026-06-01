-- These StoQR functions are trigger-only helpers for product identity bookkeeping.
-- Direct Data API/RPC execution is intentionally blocked for client roles.
REVOKE ALL ON FUNCTION stoqr.normalize_product_identity_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.sync_product_barcode_identities() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION stoqr.normalize_product_identity_fields() TO service_role;
GRANT EXECUTE ON FUNCTION stoqr.sync_product_barcode_identities() TO service_role;

-- Future functions in exposed schemas should opt in to client EXECUTE grants explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA stoqr REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
