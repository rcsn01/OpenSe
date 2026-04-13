-- 5.5) StoQR reports demo data
-- ------------------------------------------------------------

INSERT INTO stoqr.folders (
  id,
  company_id,
  parent_id,
  name,
  description,
  created_at,
  sort_order
)
VALUES
  ('71717171-7171-7171-7171-717171717171', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Main Warehouse', 'Primary distribution centre', timezone('utc'::text, now()) - interval '90 days', 1),
  ('72727272-7272-7272-7272-727272727272', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'East Coast Hub', 'Secondary regional warehouse', timezone('utc'::text, now()) - interval '90 days', 2),
  ('73737373-7373-7373-7373-737373737373', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'West Coast Hub', 'Western fulfilment centre', timezone('utc'::text, now()) - interval '90 days', 3),
  ('74747474-7474-7474-7474-747474747474', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Retail Store 1', 'Retail-facing stock room', timezone('utc'::text, now()) - interval '90 days', 4)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

UPDATE stoqr.products
SET
  folder_id = '71717171-7171-7171-7171-717171717171',
  quantity_on_hand = 120,
  min_stock_level = 24,
  max_stock_level = 160,
  reorder_point = 30,
  cost_price = 15.00,
  selling_price = 40.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000001';

UPDATE stoqr.products
SET
  folder_id = '72727272-7272-7272-7272-727272727272',
  quantity_on_hand = 54,
  min_stock_level = 18,
  max_stock_level = 90,
  reorder_point = 20,
  cost_price = 9.00,
  selling_price = 18.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000004';

UPDATE stoqr.products
SET
  folder_id = '73737373-7373-7373-7373-737373737373',
  quantity_on_hand = 32,
  min_stock_level = 10,
  max_stock_level = 60,
  reorder_point = 12,
  cost_price = 6.00,
  selling_price = 14.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000008';

UPDATE stoqr.products
SET
  folder_id = '74747474-7474-7474-7474-747474747474',
  quantity_on_hand = 12,
  min_stock_level = 6,
  max_stock_level = 24,
  reorder_point = 8,
  cost_price = 28.00,
  selling_price = 62.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000017';

UPDATE stoqr.products
SET
  folder_id = '71717171-7171-7171-7171-717171717171',
  quantity_on_hand = 90,
  min_stock_level = 20,
  max_stock_level = 140,
  reorder_point = 25,
  cost_price = 11.00,
  selling_price = 22.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000029';

UPDATE stoqr.products
SET
  folder_id = '72727272-7272-7272-7272-727272727272',
  quantity_on_hand = 40,
  min_stock_level = 12,
  max_stock_level = 70,
  reorder_point = 15,
  cost_price = 55.00,
  selling_price = 95.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000038';

UPDATE stoqr.products
SET
  folder_id = '73737373-7373-7373-7373-737373737373',
  quantity_on_hand = 18,
  min_stock_level = 8,
  max_stock_level = 42,
  reorder_point = 10,
  cost_price = 33.00,
  selling_price = 60.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000039';

UPDATE stoqr.products
SET
  folder_id = '74747474-7474-7474-7474-747474747474',
  quantity_on_hand = 22,
  min_stock_level = 10,
  max_stock_level = 36,
  reorder_point = 12,
  cost_price = 44.00,
  selling_price = 72.00,
  updated_at = timezone('utc'::text, now())
WHERE id = '84848484-8484-8484-8484-a00000000040';

INSERT INTO stoqr.suppliers (
  id,
  company_id,
  name,
  contact_name,
  email,
  phone,
  address,
  website,
  created_at
)
VALUES
  ('81818181-8181-8181-8181-818181818181', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TechGlobal Inc.', 'Nadia Stone', 'procurement@techglobal.example', '+61 2 9000 1001', '12 Science Park, Sydney', 'https://techglobal.example', timezone('utc'::text, now()) - interval '120 days'),
  ('82828282-8282-8282-8282-828282828282', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Apex Materials', 'Jon Lim', 'sales@apexmaterials.example', '+61 2 9000 1002', '8 Industry Ave, Melbourne', 'https://apexmaterials.example', timezone('utc'::text, now()) - interval '110 days'),
  ('83838383-8383-8383-8383-838383838383', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Textile Wonders', 'Maya Cole', 'ops@textilewonders.example', '+61 2 9000 1003', '77 Freight Rd, Brisbane', 'https://textilewonders.example', timezone('utc'::text, now()) - interval '105 days'),
  ('84818181-8481-8481-8481-848181818181', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FastPack Logistics', 'Kai Morgan', 'hello@fastpack.example', '+61 2 9000 1004', '45 Packaging Close, Perth', 'https://fastpack.example', timezone('utc'::text, now()) - interval '100 days')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  contact_name = EXCLUDED.contact_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  website = EXCLUDED.website;

INSERT INTO stoqr.purchase_orders (
  id,
  company_id,
  supplier_id,
  po_number,
  status,
  expected_date,
  notes,
  created_by,
  created_at,
  updated_at
)
VALUES
  ('91919191-9191-9191-9191-919191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '81818181-8181-8181-8181-818181818181', 1201, 'closed', (date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '16 days')::date, 'January replenishment', '11111111-1111-1111-1111-111111111111', date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '7 days', date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '14 days'),
  ('92929292-9292-9292-9292-929292929292', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82828282-8282-8282-8282-828282828282', 1202, 'closed', (date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '15 days')::date, 'February reagents top-up', '11111111-1111-1111-1111-111111111111', date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '6 days', date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '13 days'),
  ('93939393-9393-9393-9393-939393939393', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84818181-8481-8481-8481-848181818181', 1203, 'closed', (date_trunc('month', timezone('utc'::text, now())) - interval '20 days')::date, 'Quarterly bulk replenishment', '33333333-3333-3333-3333-333333333333', timezone('utc'::text, now()) - interval '24 days', timezone('utc'::text, now()) - interval '18 days'),
  ('94949494-9494-9494-9494-949494949494', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '83838383-8383-8383-8383-838383838383', 1204, 'partial', (timezone('utc'::text, now()) + interval '4 days')::date, 'Partial PPE restock', '33333333-3333-3333-3333-333333333333', timezone('utc'::text, now()) - interval '12 days', timezone('utc'::text, now()) - interval '4 days'),
  ('95959595-9595-9595-9595-959595959595', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82828282-8282-8282-8282-828282828282', 1205, 'sent', (timezone('utc'::text, now()) + interval '9 days')::date, 'April fast follow order', '11111111-1111-1111-1111-111111111111', timezone('utc'::text, now()) - interval '7 days', timezone('utc'::text, now()) - interval '7 days'),
  ('96969696-9696-9696-9696-969696969696', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '81818181-8181-8181-8181-818181818181', 1206, 'draft', (timezone('utc'::text, now()) + interval '12 days')::date, 'Template-driven replenishment draft', '11111111-1111-1111-1111-111111111111', timezone('utc'::text, now()) - interval '3 days', timezone('utc'::text, now()) - interval '3 days')
ON CONFLICT (id) DO UPDATE
SET
  supplier_id = EXCLUDED.supplier_id,
  po_number = EXCLUDED.po_number,
  status = EXCLUDED.status,
  expected_date = EXCLUDED.expected_date,
  notes = EXCLUDED.notes,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO stoqr.purchase_order_items (
  id,
  po_id,
  product_id,
  quantity_ordered,
  quantity_received,
  unit_cost
)
VALUES
  ('a1919191-a191-a191-a191-a19191919191', '91919191-9191-9191-9191-919191919191', '84848484-8484-8484-8484-a00000000001', 40, 40, 119.00),
  ('a2929292-a292-a292-a292-a29292929292', '92929292-9292-9292-9292-929292929292', '84848484-8484-8484-8484-a00000000001', 50, 49, 122.00),
  ('a3939393-a393-a393-a393-a39393939393', '92929292-9292-9292-9292-929292929292', '84848484-8484-8484-8484-a00000000004', 30, 30, 9.00),
  ('a4949494-a494-a494-a494-a49494949494', '93939393-9393-9393-9393-939393939393', '84848484-8484-8484-8484-a00000000001', 65, 65, 125.00),
  ('a5959595-a595-a595-a595-a59595959595', '94949494-9494-9494-9494-949494949494', '84848484-8484-8484-8484-a00000000008', 48, 36, 6.00),
  ('a6969696-a696-a696-a696-a69696969696', '95959595-9595-9595-9595-959595959595', '84848484-8484-8484-8484-a00000000001', 35, 0, 129.00),
  ('a7979797-a797-a797-a797-a79797979797', '96969696-9696-9696-9696-969696969696', '84848484-8484-8484-8484-a00000000029', 80, 0, 11.00)
ON CONFLICT (id) DO UPDATE
SET
  po_id = EXCLUDED.po_id,
  product_id = EXCLUDED.product_id,
  quantity_ordered = EXCLUDED.quantity_ordered,
  quantity_received = EXCLUDED.quantity_received,
  unit_cost = EXCLUDED.unit_cost;

INSERT INTO stoqr.receiving_logs (
  id,
  company_id,
  po_id,
  product_id,
  quantity_received,
  received_by,
  received_at,
  notes
)
VALUES
  ('b1919191-b191-b191-b191-b19191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '91919191-9191-9191-9191-919191919191', '84848484-8484-8484-8484-a00000000001', 40, '11111111-1111-1111-1111-111111111111', date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '14 days', 'Received in full'),
  ('b2929292-b292-b292-b292-b29292929292', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '92929292-9292-9292-9292-929292929292', '84848484-8484-8484-8484-a00000000001', 49, '33333333-3333-3333-3333-333333333333', date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '12 days', 'One carton short on arrival'),
  ('b3939393-b393-b393-b393-b39393939393', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '92929292-9292-9292-9292-929292929292', '84848484-8484-8484-8484-a00000000004', 30, '33333333-3333-3333-3333-333333333333', date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '12 days', 'Received in full'),
  ('b4949494-b494-b494-b494-b49494949494', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '93939393-9393-9393-9393-939393939393', '84848484-8484-8484-8484-a00000000001', 65, '11111111-1111-1111-1111-111111111111', timezone('utc'::text, now()) - interval '18 days', 'Bulk order received complete'),
  ('b5959595-b595-b595-b595-b59595959595', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '94949494-9494-9494-9494-949494949494', '84848484-8484-8484-8484-a00000000008', 36, '33333333-3333-3333-3333-333333333333', timezone('utc'::text, now()) - interval '4 days', 'Partial receipt from supplier')
ON CONFLICT (id) DO UPDATE
SET
  company_id = EXCLUDED.company_id,
  po_id = EXCLUDED.po_id,
  product_id = EXCLUDED.product_id,
  quantity_received = EXCLUDED.quantity_received,
  received_by = EXCLUDED.received_by,
  received_at = EXCLUDED.received_at,
  notes = EXCLUDED.notes;

INSERT INTO stoqr.inventory_transactions (
  id,
  company_id,
  product_id,
  performed_by,
  transaction_type,
  source,
  quantity_change,
  stock_after,
  notes,
  created_at
)
VALUES
  ('c1919191-c191-c191-c191-c19191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '11111111-1111-1111-1111-111111111111', 'purchase', 'receiving', 40, 100, 'Initial replenishment', timezone('utc'::text, now()) - interval '25 days'),
  ('c2929292-c292-c292-c292-c29292929292', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '11111111-1111-1111-1111-111111111111', 'sale', 'manual', -12, 88, 'Outbound shipment', timezone('utc'::text, now()) - interval '18 days'),
  ('c3939393-c393-c393-c393-c39393939393', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '33333333-3333-3333-3333-333333333333', 'return', 'manual', 2, 90, 'Customer return', timezone('utc'::text, now()) - interval '14 days'),
  ('c4949494-c494-c494-c494-c49494949494', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '33333333-3333-3333-3333-333333333333', 'purchase', 'receiving', 30, 120, 'Weekly inbound pallet', timezone('utc'::text, now()) - interval '6 days'),
  ('c5959595-c595-c595-c595-c59595959595', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '33333333-3333-3333-3333-333333333333', 'sale', 'manual', -9, 111, 'Rush dispatch', timezone('utc'::text, now()) - interval '2 days'),
  ('c6969696-c696-c696-c696-c69696969696', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '11111111-1111-1111-1111-111111111111', 'purchase', 'receiving', 20, 70, 'Restock East Coast', timezone('utc'::text, now()) - interval '20 days'),
  ('c7979797-c797-c797-c797-c79797979797', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '33333333-3333-3333-3333-333333333333', 'sale', 'manual', -15, 55, 'Routine outbound', timezone('utc'::text, now()) - interval '10 days'),
  ('c8989898-c898-c898-c898-c89898989898', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '33333333-3333-3333-3333-333333333333', 'adjustment', 'manual', -15, 40, 'Expired reagent batch', timezone('utc'::text, now()) - interval '5 days'),
  ('ca999999-ca99-ca99-ca99-ca9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000008', '11111111-1111-1111-1111-111111111111', 'scan_in', 'scan', 18, 32, 'Transfer from staging', timezone('utc'::text, now()) - interval '7 days'),
  ('cb999999-cb99-cb99-cb99-cb9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000008', '33333333-3333-3333-3333-333333333333', 'sale', 'manual', -6, 26, 'Project allocation', timezone('utc'::text, now()) - interval '3 days'),
  ('cc999999-cc99-cc99-cc99-cc9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000017', '33333333-3333-3333-3333-333333333333', 'loss', 'receiving', -3, 12, 'Damaged in transit during receiving', timezone('utc'::text, now()) - interval '2 days'),
  ('cd999999-cd99-cd99-cd99-cd9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000017', '33333333-3333-3333-3333-333333333333', 'adjustment', 'manual', 1, 13, 'Counting error correction', timezone('utc'::text, now()) - interval '1 day'),
  ('ce999999-ce99-ce99-ce99-ce9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000029', '11111111-1111-1111-1111-111111111111', 'sale', 'manual', -20, 80, 'Bulk issue to production', timezone('utc'::text, now()) - interval '4 days'),
  ('cf999999-cf99-cf99-cf99-cf9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000039', '33333333-3333-3333-3333-333333333333', 'purchase', 'receiving', 8, 18, 'Safety stock top-up', timezone('utc'::text, now()) - interval '9 days'),
  ('d0919191-d091-d091-d091-d09191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000039', '33333333-3333-3333-3333-333333333333', 'loss', 'manual', -4, 14, 'Missing item after shelf audit', timezone('utc'::text, now()) - interval '8 days')
ON CONFLICT (id) DO UPDATE
SET
  company_id = EXCLUDED.company_id,
  product_id = EXCLUDED.product_id,
  performed_by = EXCLUDED.performed_by,
  transaction_type = EXCLUDED.transaction_type,
  source = EXCLUDED.source,
  quantity_change = EXCLUDED.quantity_change,
  stock_after = EXCLUDED.stock_after,
  notes = EXCLUDED.notes,
  created_at = EXCLUDED.created_at;

INSERT INTO stoqr.report_schedules (
  id,
  company_id,
  report_type,
  cadence,
  day_of_week,
  day_of_month,
  time_of_day,
  recipients,
  created_by,
  created_at
)
VALUES
  ('e1919191-e191-e191-e191-e19191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'weekly_stockout_warning', 'weekly', 1, NULL, '08:00:00'::time, ARRAY['operations@company.com'], '11111111-1111-1111-1111-111111111111', timezone('utc'::text, now()) - interval '14 days')
ON CONFLICT (id) DO UPDATE
SET
  report_type = EXCLUDED.report_type,
  cadence = EXCLUDED.cadence,
  day_of_week = EXCLUDED.day_of_week,
  day_of_month = EXCLUDED.day_of_month,
  time_of_day = EXCLUDED.time_of_day,
  recipients = EXCLUDED.recipients,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at;