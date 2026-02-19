-- Improve reports page query performance for transaction timelines
-- Used by stoqr/src/api/reports.ts:
--   .eq('company_id', companyId)
--   .gte('created_at', ...)
--   .order('created_at', { ascending: false })

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_created_at
  ON stoqr.inventory_transactions (company_id, created_at DESC);
