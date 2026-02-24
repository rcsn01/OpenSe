-- Improve reports page query performance for transaction timelines
-- Used by stoqr/src/api/reports.ts:
--   .eq('company_id', companyId)
--   .gte('created_at', ...)
--   .order('created_at', { ascending: false })

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_created_at
  ON stoqr.inventory_transactions (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_product_created_at
  ON stoqr.inventory_transactions (company_id, product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_type_created_at
  ON stoqr.inventory_transactions (company_id, transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_company_deleted_at
  ON stoqr.products (company_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company_status_created_at
  ON stoqr.purchase_orders (company_id, status, created_at DESC);
