-- 4) StoQR catalog + inventory flows
-- ------------------------------------------------------------

INSERT INTO stoqr.product_categories (id, company_id, name, description)
VALUES
  ('80808080-8080-8080-8080-808080808001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Beverages', 'Drinks and ready-to-sell beverages'),
  ('80808080-8080-8080-8080-808080808002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Packaging', 'Boxes, wraps, and packaging materials'),
  ('80808080-8080-8080-8080-808080808003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Components', 'Manufacturing parts and components')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.inventory_locations (id, company_id, name, code, description)
VALUES
  ('81818181-8181-8181-8181-818181818001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Main Warehouse', 'A-WH1', 'Primary Acme warehouse'),
  ('81818181-8181-8181-8181-818181818002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Front Store', 'A-ST1', 'Retail facing location'),
  ('81818181-8181-8181-8181-818181818003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Plant Floor', 'G-PLT', 'Globex plant storage')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.folders (id, company_id, parent_id, name, description)
VALUES
  ('82828282-8282-8282-8282-828282828001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Top Sellers', 'Fast moving SKUs'),
  ('82828282-8282-8282-8282-828282828002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82828282-8282-8282-8282-828282828001', 'Seasonal', 'Seasonal stock'),
  ('82828282-8282-8282-8282-828282828003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, 'Critical Parts', 'Parts with low tolerance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.tags (id, company_id, name, color)
VALUES
  ('83838383-8383-8383-8383-838383838001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Fast-moving', '#22c55e'),
  ('83838383-8383-8383-8383-838383838002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Needs Audit', '#f59e0b'),
  ('83838383-8383-8383-8383-838383838003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'High Value', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.products (
  id,
  company_id,
  folder_id,
  category_id,
  location_id,
  sku,
  primary_barcode,
  name,
  description,
  category,
  quantity_on_hand,
  min_stock_level,
  max_stock_level,
  reorder_point,
  cost_price,
  selling_price,
  image_urls,
  expiry_date,
  custom_fields,
  deleted_at
)
VALUES
  (
    '84848484-8484-8484-8484-848484848001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '82828282-8282-8282-8282-828282828001',
    '80808080-8080-8080-8080-808080808001',
    '81818181-8181-8181-8181-818181818001',
    'ACM-BEV-001',
    '8901111111111',
    'Acme Sparkling Water 500ml',
    'Top selling sparkling water.',
    'Beverages',
    120,
    30,
    500,
    60,
    0.50,
    1.25,
    ARRAY['https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800'],
    NULL,
    '{"brand":"Acme","unit":"bottle"}'::jsonb,
    NULL
  ),
  (
    '84848484-8484-8484-8484-848484848002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '82828282-8282-8282-8282-828282828002',
    '80808080-8080-8080-8080-808080808002',
    '81818181-8181-8181-8181-818181818001',
    'ACM-PKG-010',
    '8902222222222',
    'Acme Medium Shipping Box',
    'Corrugated packaging box.',
    'Packaging',
    45,
    50,
    300,
    80,
    0.35,
    0.99,
    ARRAY['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800'],
    NULL,
    '{"material":"kraft"}'::jsonb,
    NULL
  ),
  (
    '84848484-8484-8484-8484-848484848003',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '82828282-8282-8282-8282-828282828003',
    '80808080-8080-8080-8080-808080808003',
    '81818181-8181-8181-8181-818181818003',
    'GLX-CMP-777',
    '9903333333333',
    'Globex Precision Valve',
    'Machined valve component.',
    'Components',
    12,
    20,
    200,
    25,
    45.00,
    89.00,
    ARRAY['https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800'],
    timezone('utc'::text, now())::date + 120,
    '{"line":"PX","batch":"B-901"}'::jsonb,
    NULL
  ),
  (
    '84848484-8484-8484-8484-848484848004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NULL,
    '80808080-8080-8080-8080-808080808001',
    '81818181-8181-8181-8181-818181818002',
    'ACM-OLD-099',
    '8909999999999',
    'Archived Soda 1L',
    'Soft-deleted product sample.',
    'Beverages',
    0,
    0,
    NULL,
    0,
    0.60,
    1.40,
    ARRAY[]::text[],
    NULL,
    '{}'::jsonb,
    timezone('utc'::text, now()) - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_barcodes (id, company_id, product_id, barcode, barcode_type, is_primary)
VALUES
  ('85858585-8585-8585-8585-858585858001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', '8901111111111', 'barcode', true),
  ('85858585-8585-8585-8585-858585858002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', 'QR-ACM-BEV-001', 'qr', false),
  ('85858585-8585-8585-8585-858585858003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848002', '8902222222222', 'barcode', true),
  ('85858585-8585-8585-8585-858585858004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '84848484-8484-8484-8484-848484848003', '9903333333333', 'barcode', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.product_tags (product_id, tag_id, company_id)
VALUES
  ('84848484-8484-8484-8484-848484848001', '83838383-8383-8383-8383-838383838001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('84848484-8484-8484-8484-848484848002', '83838383-8383-8383-8383-838383838002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('84848484-8484-8484-8484-848484848003', '83838383-8383-8383-8383-838383838003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
ON CONFLICT (product_id, tag_id) DO NOTHING;

INSERT INTO stoqr.inventory_transactions (id, company_id, product_id, performed_by, transaction_type, source, quantity_change, notes, created_at)
VALUES
  ('86868686-8686-8686-8686-868686868001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', '33333333-3333-3333-3333-333333333333', 'purchase', 'receiving', 40, 'Initial restock', timezone('utc'::text, now()) - interval '7 days'),
  ('86868686-8686-8686-8686-868686868002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848001', '44444444-4444-4444-4444-444444444444', 'sale', 'manual', 15, 'Retail sales adjustment', timezone('utc'::text, now()) - interval '3 days'),
  ('86868686-8686-8686-8686-868686868003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-848484848002', '33333333-3333-3333-3333-333333333333', 'scan_out', 'scan', 12, 'Store transfer', timezone('utc'::text, now()) - interval '2 days'),
  ('86868686-8686-8686-8686-868686868004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '84848484-8484-8484-8484-848484848003', '66666666-6666-6666-6666-666666666666', 'adjustment', 'manual', -3, 'Damaged units', timezone('utc'::text, now()) - interval '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.inventory_bulk_operations (
  id,
  company_id,
  operation_type,
  status,
  initiated_by,
  file_path,
  summary,
  error_message,
  completed_at
)
VALUES
  (
    '87878787-8787-8787-8787-878787878001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'import',
    'completed',
    '33333333-3333-3333-3333-333333333333',
    'imports/acme-products-2026-02.csv',
    '{"created":12,"updated":3,"failed":0}'::jsonb,
    NULL,
    timezone('utc'::text, now()) - interval '5 days'
  ),
  (
    '87878787-8787-8787-8787-878787878002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'bulk_update',
    'failed',
    '66666666-6666-6666-6666-666666666666',
    'bulk/globex-thresholds.xlsx',
    '{"updated":0,"failed":14}'::jsonb,
    'Validation failed on row 14',
    timezone('utc'::text, now()) - interval '12 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.scan_events (
  id,
  company_id,
  product_id,
  barcode,
  scan_type,
  quantity,
  entry_method,
  scanned_by,
  transaction_id,
  metadata,
  created_at
)
VALUES
  (
    '88888888-8888-8888-8888-888888888001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '84848484-8484-8484-8484-848484848001',
    '8901111111111',
    'lookup',
    1,
    'camera',
    '55555555-5555-5555-5555-555555555555',
    NULL,
    '{"device":"android"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  ),
  (
    '88888888-8888-8888-8888-888888888002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '84848484-8484-8484-8484-848484848002',
    '8902222222222',
    'stock_out',
    2,
    'manual',
    '44444444-4444-4444-4444-444444444444',
    '86868686-8686-8686-8686-868686868003',
    '{"reason":"front-store"}'::jsonb,
    timezone('utc'::text, now()) - interval '10 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.report_schedules (
  id,
  company_id,
  report_type,
  cadence,
  day_of_week,
  day_of_month,
  time_of_day,
  recipients,
  created_by
)
VALUES
  (
    '89898989-8989-8989-8989-898989898001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'inventory_valuation',
    'weekly',
    1,
    NULL,
    '09:00:00',
    ARRAY['ops@acme.test','finance@acme.test'],
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '89898989-8989-8989-8989-898989898002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'stock_movement',
    'monthly',
    NULL,
    1,
    '08:30:00',
    ARRAY['warehouse@globex.test'],
    '66666666-6666-6666-6666-666666666666'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.report_exports (
  id,
  company_id,
  report_type,
  export_format,
  date_range_start,
  date_range_end,
  filters,
  status,
  requested_by,
  file_path,
  completed_at
)
VALUES
  (
    '90909090-9090-9090-9090-909090909001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'inventory_valuation',
    'csv',
    current_date - 30,
    current_date,
    '{"category":"Beverages"}'::jsonb,
    'completed',
    '33333333-3333-3333-3333-333333333333',
    'exports/acme-inventory-valuation.csv',
    timezone('utc'::text, now()) - interval '4 days'
  ),
  (
    '90909090-9090-9090-9090-909090909002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dead_stock',
    'pdf',
    current_date - 90,
    current_date,
    '{}'::jsonb,
    'processing',
    '66666666-6666-6666-6666-666666666666',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.suppliers (
  id,
  company_id,
  name,
  contact_name,
  email,
  phone,
  address,
  website
)
VALUES
  (
    '91919191-9191-9191-9191-919191919001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'North Beverage Supply',
    'Nora Fields',
    'sales@northbev.test',
    '+1-555-1010',
    '100 Supply Ave, Denver, CO',
    'https://northbev.test'
  ),
  (
    '91919191-9191-9191-9191-919191919002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Precision Parts Co',
    'Paul Chen',
    'orders@precisionparts.test',
    '+1-555-2020',
    '77 Industrial Rd, Austin, TX',
    'https://precisionparts.test'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.purchase_orders (
  id,
  company_id,
  supplier_id,
  status,
  expected_date,
  notes,
  created_by,
  updated_at
)
VALUES
  (
    '92929292-9292-9292-9292-929292929001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '91919191-9191-9191-9191-919191919001',
    'sent',
    current_date + 7,
    'Replenish beverage stock for Q1 campaign.',
    '33333333-3333-3333-3333-333333333333',
    timezone('utc'::text, now()) - interval '2 days'
  ),
  (
    '92929292-9292-9292-9292-929292929002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '91919191-9191-9191-9191-919191919002',
    'partial',
    current_date + 3,
    'Critical valve replacement order.',
    '66666666-6666-6666-6666-666666666666',
    timezone('utc'::text, now()) - interval '12 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.purchase_order_items (id, po_id, product_id, quantity_ordered, quantity_received, unit_cost)
VALUES
  ('93939393-9393-9393-9393-939393939001', '92929292-9292-9292-9292-929292929001', '84848484-8484-8484-8484-848484848001', 80, 20, 0.48),
  ('93939393-9393-9393-9393-939393939002', '92929292-9292-9292-9292-929292929001', '84848484-8484-8484-8484-848484848002', 120, 0, 0.31),
  ('93939393-9393-9393-9393-939393939003', '92929292-9292-9292-9292-929292929002', '84848484-8484-8484-8484-848484848003', 25, 10, 44.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.receiving_logs (id, company_id, po_id, product_id, quantity_received, received_by, received_at, notes)
VALUES
  (
    '94949494-9494-9494-9494-949494949001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '92929292-9292-9292-9292-929292929001',
    '84848484-8484-8484-8484-848484848001',
    20,
    '33333333-3333-3333-3333-333333333333',
    timezone('utc'::text, now()) - interval '1 day',
    'First pallet received in good condition.'
  ),
  (
    '94949494-9494-9494-9494-949494949002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '92929292-9292-9292-9292-929292929002',
    '84848484-8484-8484-8484-848484848003',
    10,
    '66666666-6666-6666-6666-666666666666',
    timezone('utc'::text, now()) - interval '6 hours',
    'Partial shipment received.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_rules (
  id,
  company_id,
  name,
  alert_type,
  enabled,
  condition,
  delivery_channels,
  recipients,
  created_by
)
VALUES
  (
    '95959595-9595-9595-9595-959595959001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Acme Low Stock Rule',
    'low_stock',
    true,
    '{"threshold_field":"min_stock_level"}'::jsonb,
    ARRAY['in_app','email'],
    ARRAY['ops@acme.test'],
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '95959595-9595-9595-9595-959595959002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Globex Reorder Rule',
    'reorder_point',
    true,
    '{"threshold_field":"reorder_point"}'::jsonb,
    ARRAY['in_app'],
    ARRAY['warehouse@globex.test'],
    '66666666-6666-6666-6666-666666666666'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_events (
  id,
  company_id,
  rule_id,
  product_id,
  alert_type,
  severity,
  status,
  message,
  metadata,
  triggered_at,
  acknowledged_by,
  acknowledged_at,
  resolved_at
)
VALUES
  (
    '96969696-9696-9696-9696-969696969001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '95959595-9595-9595-9595-959595959001',
    '84848484-8484-8484-8484-848484848002',
    'low_stock',
    'high',
    'open',
    'Acme Medium Shipping Box is below minimum stock.',
    '{"quantity_on_hand":33,"min_stock_level":50}'::jsonb,
    timezone('utc'::text, now()) - interval '2 hours',
    NULL,
    NULL,
    NULL
  ),
  (
    '96969696-9696-9696-9696-969696969002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '95959595-9595-9595-9595-959595959002',
    '84848484-8484-8484-8484-848484848003',
    'reorder_point',
    'critical',
    'acknowledged',
    'Precision Valve reached reorder point.',
    '{"quantity_on_hand":9,"reorder_point":25}'::jsonb,
    timezone('utc'::text, now()) - interval '8 hours',
    '66666666-6666-6666-6666-666666666666',
    timezone('utc'::text, now()) - interval '7 hours',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.alert_delivery_logs (
  id,
  company_id,
  alert_event_id,
  channel,
  recipient,
  status,
  provider_message_id,
  error_message,
  sent_at
)
VALUES
  (
    '97979797-9797-9797-9797-979797979001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '96969696-9696-9696-9696-969696969001',
    'email',
    'ops@acme.test',
    'sent',
    'msg-1001',
    NULL,
    timezone('utc'::text, now()) - interval '115 minutes'
  ),
  (
    '97979797-9797-9797-9797-979797979002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '96969696-9696-9696-9696-969696969002',
    'in_app',
    'owner@globex.test',
    'sent',
    NULL,
    NULL,
    timezone('utc'::text, now()) - interval '7 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.activity_events (
  id,
  company_id,
  actor_user_id,
  event_type,
  entity_type,
  entity_id,
  message,
  metadata,
  created_at
)
VALUES
  (
    '98989898-9898-9898-9898-989898989001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'inventory.bulk_import.completed',
    'inventory_bulk_operations',
    '87878787-8787-8787-8787-878787878001',
    'Bulk import completed with no failures.',
    '{"created":12,"updated":3}'::jsonb,
    timezone('utc'::text, now()) - interval '5 days'
  ),
  (
    '98989898-9898-9898-9898-989898989002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '66666666-6666-6666-6666-666666666666',
    'alerts.rule.triggered',
    'alert_events',
    '96969696-9696-9696-9696-969696969002',
    'Critical reorder alert raised for precision valve.',
    '{"severity":"critical"}'::jsonb,
    timezone('utc'::text, now()) - interval '8 hours'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.label_templates (
  id,
  company_id,
  name,
  template_type,
  is_system,
  layout,
  variable_fields,
  created_by
)
VALUES
  (
    '99999999-9999-9999-9999-999999999001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Acme Shelf Compact',
    'shelf',
    false,
    '{"size":"50x30","font":"inter"}'::jsonb,
    ARRAY['barcode','name','qr'],
    '33333333-3333-3333-3333-333333333333'
  ),
  (
    '99999999-9999-9999-9999-999999999002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Globex Product Standard',
    'product',
    false,
    '{"size":"70x40","font":"mono"}'::jsonb,
    ARRAY['barcode','sku','name','price'],
    '66666666-6666-6666-6666-666666666666'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO stoqr.label_print_jobs (
  id,
  company_id,
  template_id,
  format,
  status,
  quantity,
  payload,
  preview_url,
  output_url,
  requested_by,
  completed_at
)
VALUES
  (
    'aaaa0000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '99999999-9999-9999-9999-999999999001',
    'pdf',
    'completed',
    50,
    '{"product_ids":["84848484-8484-8484-8484-848484848001"]}'::jsonb,
    'https://files.example.test/labels/acme-preview.pdf',
    'https://files.example.test/labels/acme-output.pdf',
    '33333333-3333-3333-3333-333333333333',
    timezone('utc'::text, now()) - interval '1 day'
  ),
  (
    'aaaa0000-0000-0000-0000-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '99999999-9999-9999-9999-999999999002',
    'png',
    'processing',
    20,
    '{"product_ids":["84848484-8484-8484-8484-848484848003"]}'::jsonb,
    NULL,
    NULL,
    '66666666-6666-6666-6666-666666666666',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------