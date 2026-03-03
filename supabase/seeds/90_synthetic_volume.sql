-- 6) High-volume synthetic dataset
-- ------------------------------------------------------------

INSERT INTO etl.workflow_executions (id, workflow_id, user_id, org_id, status, started_at, completed_at, error_message)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'etl-acme-exec-' || gs::text),
  'd1111111-1111-1111-1111-111111111111'::uuid,
  CASE WHEN gs % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '44444444-4444-4444-4444-444444444444'::uuid END,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE
    WHEN gs % 10 = 0 THEN 'failed'
    WHEN gs % 7 = 0 THEN 'running'
    ELSE 'success'
  END,
  timezone('utc'::text, now()) - (gs || ' hours')::interval,
  CASE WHEN gs % 7 = 0 THEN NULL ELSE timezone('utc'::text, now()) - (gs || ' hours')::interval + ((2 + (gs % 15)) || ' minutes')::interval END,
  CASE WHEN gs % 10 = 0 THEN 'Synthetic ETL failure sample #' || gs::text ELSE NULL END
FROM generate_series(1, 220) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO etl.workflow_executions (id, workflow_id, user_id, org_id, status, started_at, completed_at, error_message)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'etl-globex-exec-' || gs::text),
  'd3333333-3333-3333-3333-333333333333'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  CASE WHEN gs % 8 = 0 THEN 'failed' ELSE 'success' END,
  timezone('utc'::text, now()) - (gs || ' hours')::interval,
  timezone('utc'::text, now()) - (gs || ' hours')::interval + ((5 + (gs % 10)) || ' minutes')::interval,
  CASE WHEN gs % 8 = 0 THEN 'Globex synthetic processing timeout' ELSE NULL END
FROM generate_series(1, 140) AS gs
ON CONFLICT (id) DO NOTHING;

WITH acme_bulk_products AS (
  SELECT
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || gs::text) AS id,
    gs
  FROM generate_series(1, 180) AS gs
),
globex_bulk_products AS (
  SELECT
    extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || gs::text) AS id,
    gs
  FROM generate_series(1, 120) AS gs
)
INSERT INTO stoqr.products (
  id,
  company_id,
  folder_id,
  location_id,
  sku,
  primary_barcode,
  name,
  description,
  quantity_on_hand,
  min_stock_level,
  max_stock_level,
  reorder_point,
  cost_price,
  selling_price,
  image_urls,
  custom_fields
)
SELECT
  p.id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE WHEN p.gs % 3 = 0 THEN '82828282-8282-8282-8282-828282828001'::uuid ELSE '82828282-8282-8282-8282-828282828002'::uuid END,
  CASE WHEN p.gs % 4 = 0 THEN '81818181-8181-8181-8181-818181818002'::uuid ELSE '81818181-8181-8181-8181-818181818001'::uuid END,
  'ACM-AUTO-' || lpad(p.gs::text, 4, '0'),
  NULL,
  'Acme Auto Product ' || p.gs::text,
  'Synthetic seeded product for high-volume UI testing',
  10 + (p.gs % 90),
  5 + (p.gs % 20),
  120 + (p.gs % 300),
  8 + (p.gs % 25),
  round((0.5 + (p.gs % 20) * 0.27)::numeric, 2),
  round((1.2 + (p.gs % 25) * 0.55)::numeric, 2),
  ARRAY[]::text[],
  jsonb_build_object('seed_type', 'bulk', 'batch', 'acme', 'ordinal', p.gs)
FROM acme_bulk_products p
UNION ALL
SELECT
  p.id,
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  '82828282-8282-8282-8282-828282828003'::uuid,
  '81818181-8181-8181-8181-818181818003'::uuid,
  'GLX-AUTO-' || lpad(p.gs::text, 4, '0'),
  NULL,
  'Globex Auto Component ' || p.gs::text,
  'Synthetic seeded component for load testing',
  5 + (p.gs % 70),
  8 + (p.gs % 18),
  150 + (p.gs % 350),
  10 + (p.gs % 20),
  round((12 + (p.gs % 35) * 1.25)::numeric, 2),
  round((20 + (p.gs % 40) * 2.10)::numeric, 2),
  ARRAY[]::text[],
  jsonb_build_object('seed_type', 'bulk', 'batch', 'globex', 'ordinal', p.gs)
FROM globex_bulk_products p
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_barcodes (id, company_id, product_id, barcode, barcode_type, is_primary)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-bc-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || gs::text),
  'ACMEBC' || lpad(gs::text, 8, '0'),
  'barcode',
  true
FROM generate_series(1, 180) AS gs
UNION ALL
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'globex-bc-' || gs::text),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || gs::text),
  'GLXBC' || lpad(gs::text, 8, '0'),
  'barcode',
  true
FROM generate_series(1, 120) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_tags (product_id, tag_id, company_id)
SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || gs::text), CASE WHEN gs % 2 = 0 THEN '83838383-8383-8383-8383-838383838001'::uuid ELSE '83838383-8383-8383-8383-838383838002'::uuid END, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
FROM generate_series(1, 180) AS gs
UNION ALL
SELECT extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || gs::text), '83838383-8383-8383-8383-838383838003'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid
FROM generate_series(1, 120) AS gs
ON CONFLICT (product_id, tag_id) DO NOTHING;

INSERT INTO stoqr.inventory_transactions (id, company_id, product_id, performed_by, transaction_type, source, quantity_change, notes, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-bulk-tx-' || p.gs::text || '-' || t.tx_idx::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || p.gs::text),
  CASE WHEN t.tx_idx % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '44444444-4444-4444-4444-444444444444'::uuid END,
  CASE
    WHEN t.tx_idx = 1 THEN 'purchase'
    WHEN t.tx_idx = 2 THEN 'sale'
    WHEN t.tx_idx = 3 THEN 'scan_out'
    WHEN t.tx_idx = 4 THEN 'return'
    ELSE 'adjustment'
  END,
  CASE WHEN t.tx_idx IN (3, 4) THEN 'scan' ELSE 'manual' END,
  1 + ((p.gs + t.tx_idx) % 9),
  'Synthetic transaction ' || t.tx_idx::text || ' for product #' || p.gs::text,
  timezone('utc'::text, now()) - ((p.gs * 2 + t.tx_idx) || ' hours')::interval
FROM generate_series(1, 180) AS p(gs)
CROSS JOIN generate_series(1, 5) AS t(tx_idx)
UNION ALL
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'globex-bulk-tx-' || p.gs::text || '-' || t.tx_idx::text),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-globex-product-' || p.gs::text),
  '66666666-6666-6666-6666-666666666666'::uuid,
  CASE WHEN t.tx_idx % 2 = 0 THEN 'purchase' ELSE 'sale' END,
  'manual',
  1 + ((p.gs + t.tx_idx) % 7),
  'Globex synthetic transaction ' || t.tx_idx::text || ' for product #' || p.gs::text,
  timezone('utc'::text, now()) - ((p.gs * 3 + t.tx_idx) || ' hours')::interval
FROM generate_series(1, 120) AS p(gs)
CROSS JOIN generate_series(1, 3) AS t(tx_idx)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.scan_events (id, company_id, product_id, barcode, scan_type, quantity, entry_method, scanned_by, transaction_id, metadata, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'scan-acme-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || ((gs % 180) + 1)::text),
  'ACMEBC' || lpad(((gs % 180) + 1)::text, 8, '0'),
  CASE WHEN gs % 3 = 0 THEN 'stock_out' WHEN gs % 3 = 1 THEN 'lookup' ELSE 'stock_in' END,
  1 + (gs % 5),
  CASE WHEN gs % 2 = 0 THEN 'camera' ELSE 'manual' END,
  CASE WHEN gs % 2 = 0 THEN '44444444-4444-4444-4444-444444444444'::uuid ELSE '55555555-5555-5555-5555-555555555555'::uuid END,
  NULL,
  jsonb_build_object('seed_scan', true, 'ordinal', gs),
  timezone('utc'::text, now()) - (gs || ' minutes')::interval
FROM generate_series(1, 500) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_events (id, company_id, rule_id, product_id, alert_type, severity, status, message, metadata, triggered_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-alert-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  '95959595-9595-9595-9595-959595959001'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'bulk-acme-product-' || ((gs % 180) + 1)::text),
  'low_stock',
  CASE WHEN gs % 5 = 0 THEN 'critical' WHEN gs % 2 = 0 THEN 'high' ELSE 'medium' END,
  CASE WHEN gs % 6 = 0 THEN 'resolved' WHEN gs % 4 = 0 THEN 'acknowledged' ELSE 'open' END,
  'Synthetic low stock alert #' || gs::text,
  jsonb_build_object('qoh', gs % 12, 'threshold', 15),
  timezone('utc'::text, now()) - (gs || ' hours')::interval
FROM generate_series(1, 160) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_delivery_logs (id, company_id, alert_event_id, channel, recipient, status, provider_message_id, sent_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-alert-delivery-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-alert-' || gs::text),
  CASE WHEN gs % 2 = 0 THEN 'email' ELSE 'in_app' END,
  CASE WHEN gs % 2 = 0 THEN 'ops@acme.test' ELSE 'dashboard' END,
  'sent',
  'seed-msg-' || gs::text,
  timezone('utc'::text, now()) - (gs || ' hours')::interval + interval '5 minutes'
FROM generate_series(1, 160) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.report_exports (id, company_id, report_type, export_format, date_range_start, date_range_end, filters, status, requested_by, file_path, completed_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'acme-export-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE WHEN gs % 3 = 0 THEN 'inventory_valuation' WHEN gs % 3 = 1 THEN 'stock_movement' ELSE 'reorder_analysis' END,
  CASE WHEN gs % 2 = 0 THEN 'csv' ELSE 'pdf' END,
  current_date - (30 + gs),
  current_date - gs,
  jsonb_build_object('seed_batch', gs),
  CASE WHEN gs % 10 = 0 THEN 'failed' WHEN gs % 4 = 0 THEN 'processing' ELSE 'completed' END,
  '33333333-3333-3333-3333-333333333333'::uuid,
  CASE WHEN gs % 10 = 0 OR gs % 4 = 0 THEN NULL ELSE 'exports/acme-auto-' || gs::text || '.csv' END,
  CASE WHEN gs % 10 = 0 OR gs % 4 = 0 THEN NULL ELSE timezone('utc'::text, now()) - (gs || ' days')::interval END
FROM generate_series(1, 120) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.organisation_audit_events (id, org_id, actor_user_id, action, app_code, target_org_member_id, metadata, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'org-audit-acme-' || gs::text),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  CASE WHEN gs % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '22222222-2222-2222-2222-222222222222'::uuid END,
  CASE WHEN gs % 3 = 0 THEN 'org_member_app_seat_assigned' ELSE 'org_seat_limit_updated' END,
  CASE WHEN gs % 2 = 0 THEN 'stoqr' ELSE 'etl' END,
  CASE WHEN gs % 4 = 0 THEN 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a004'::uuid ELSE NULL END,
  jsonb_build_object('seed', true, 'ordinal', gs),
  timezone('utc'::text, now()) - (gs || ' hours')::interval
FROM generate_series(1, 180) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_admin_audit_events (id, actor_user_id, action, metadata, created_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'platform-audit-' || gs::text),
  '11111111-1111-1111-1111-111111111111'::uuid,
  CASE WHEN gs % 2 = 0 THEN 'feature_flag_updated' ELSE 'pricing_plan_updated' END,
  jsonb_build_object('seed', true, 'batch', gs),
  timezone('utc'::text, now()) - (gs || ' hours')::interval
FROM generate_series(1, 120) AS gs
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_app_health_snapshots (id, app_code, uptime_percent, error_spike_level, active_alert_count, incident_summary, measured_at)
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'etl-health-' || gs::text),
  'etl',
  round((97.5 + (gs % 20) * 0.1)::numeric, 2),
  CASE WHEN gs % 12 = 0 THEN 'high' WHEN gs % 6 = 0 THEN 'medium' WHEN gs % 3 = 0 THEN 'low' ELSE 'stable' END,
  gs % 7,
  'ETL synthetic health sample #' || gs::text,
  timezone('utc'::text, now()) - (gs || ' minutes')::interval
FROM generate_series(1, 160) AS gs
UNION ALL
SELECT
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'stoqr-health-' || gs::text),
  'stoqr',
  round((96.8 + (gs % 18) * 0.12)::numeric, 2),
  CASE WHEN gs % 10 = 0 THEN 'high' WHEN gs % 5 = 0 THEN 'medium' WHEN gs % 3 = 0 THEN 'low' ELSE 'stable' END,
  gs % 9,
  'StoQR synthetic health sample #' || gs::text,
  timezone('utc'::text, now()) - (gs || ' minutes')::interval
FROM generate_series(1, 160) AS gs
ON CONFLICT (id) DO NOTHING;
