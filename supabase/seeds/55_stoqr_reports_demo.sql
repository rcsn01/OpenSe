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
  ('71717171-7171-7171-7171-717171717171', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Warehouse Network', 'Main storage hierarchy for shared StoQR inventory.', timezone('utc'::text, now()) - interval '90 days', 1),
  ('72727272-7272-7272-7272-727272727272', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', NULL, 'Dispatch & Returns', 'Outbound staging, finished goods, and returns triage.', timezone('utc'::text, now()) - interval '90 days', 2),
  ('73737373-7373-7373-7373-737373737373', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '71717171-7171-7171-7171-717171717171', 'PCR Consumables', 'Tips, plates, and core assay consumables.', timezone('utc'::text, now()) - interval '90 days', 1),
  ('74747474-7474-7474-7474-747474747474', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '71717171-7171-7171-7171-717171717171', 'Safety & Sanitation', 'PPE, disinfectants, and facility support stock.', timezone('utc'::text, now()) - interval '90 days', 2)
ON CONFLICT (id) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
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
  ('91919191-9191-9191-9191-919191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '81818181-8181-8181-8181-818181818181', 1201, 'received', (date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '16 days')::date, 'January replenishment', '11111111-1111-1111-1111-111111111111', date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '7 days', date_trunc('month', timezone('utc'::text, now())) - interval '3 months' + interval '14 days'),
  ('92929292-9292-9292-9292-929292929292', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82828282-8282-8282-8282-828282828282', 1202, 'received', (date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '15 days')::date, 'February reagents top-up', '11111111-1111-1111-1111-111111111111', date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '6 days', date_trunc('month', timezone('utc'::text, now())) - interval '2 months' + interval '13 days'),
  ('93939393-9393-9393-9393-939393939393', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84818181-8481-8481-8481-848181818181', 1203, 'received', (date_trunc('month', timezone('utc'::text, now())) - interval '20 days')::date, 'Quarterly bulk replenishment', '33333333-3333-3333-3333-333333333333', timezone('utc'::text, now()) - interval '24 days', timezone('utc'::text, now()) - interval '18 days'),
  ('94949494-9494-9494-9494-949494949494', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '83838383-8383-8383-8383-838383838383', 1204, 'partial_receipt', (timezone('utc'::text, now()) + interval '4 days')::date, 'Partial PPE restock', '33333333-3333-3333-3333-333333333333', timezone('utc'::text, now()) - interval '12 days', timezone('utc'::text, now()) - interval '4 days'),
  ('95959595-9595-9595-9595-959595959595', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '82828282-8282-8282-8282-828282828282', 1205, 'in_transit', (timezone('utc'::text, now()) + interval '9 days')::date, 'April fast follow order', '11111111-1111-1111-1111-111111111111', timezone('utc'::text, now()) - interval '7 days', timezone('utc'::text, now()) - interval '7 days'),
  ('96969696-9696-9696-9696-969696969696', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '81818181-8181-8181-8181-818181818181', 1206, 'pending_approval', (timezone('utc'::text, now()) + interval '12 days')::date, 'Template-driven replenishment draft', '11111111-1111-1111-1111-111111111111', timezone('utc'::text, now()) - interval '3 days', timezone('utc'::text, now()) - interval '3 days')
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

INSERT INTO stoqr.product_folder_stocks (
  company_id,
  product_id,
  folder_id,
  quantity_on_hand,
  min_stock_level,
  reorder_point,
  max_stock_level,
  updated_at
)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '72727272-7272-7272-7272-727272727272', 20, 8, 12, 40, timezone('utc'::text, now())),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '72727272-7272-7272-7272-727272727272', 20, 18, 20, 90, timezone('utc'::text, now())),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000017', '74747474-7474-7474-7474-747474747474', 15, 6, 8, 24, timezone('utc'::text, now())),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000029', '73737373-7373-7373-7373-737373737373', 100, 20, 25, 140, timezone('utc'::text, now()))
ON CONFLICT (company_id, product_id, folder_id) DO UPDATE
SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  min_stock_level = EXCLUDED.min_stock_level,
  reorder_point = EXCLUDED.reorder_point,
  max_stock_level = EXCLUDED.max_stock_level,
  updated_at = EXCLUDED.updated_at;

INSERT INTO stoqr.inventory_transactions (
  id,
  company_id,
  product_id,
  folder_id,
  performed_by,
  transaction_type,
  source,
  quantity_change,
  stock_after,
  notes,
  created_at
)
VALUES
  ('c1919191-c191-c191-c191-c19191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '71717171-7171-7171-7171-717171717171', '11111111-1111-1111-1111-111111111111', 'purchase', 'receiving', 40, 100, 'Initial replenishment', timezone('utc'::text, now()) - interval '25 days'),
  ('c2929292-c292-c292-c292-c29292929292', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '71717171-7171-7171-7171-717171717171', '11111111-1111-1111-1111-111111111111', 'sale', 'manual', -12, 88, 'Outbound shipment', timezone('utc'::text, now()) - interval '18 days'),
  ('c3939393-c393-c393-c393-c39393939393', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '72727272-7272-7272-7272-727272727272', '33333333-3333-3333-3333-333333333333', 'return', 'manual', 2, 90, 'Customer return', timezone('utc'::text, now()) - interval '14 days'),
  ('c4949494-c494-c494-c494-c49494949494', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '71717171-7171-7171-7171-717171717171', '33333333-3333-3333-3333-333333333333', 'purchase', 'receiving', 30, 120, 'Weekly inbound pallet', timezone('utc'::text, now()) - interval '6 days'),
  ('c5959595-c595-c595-c595-c59595959595', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000001', '72727272-7272-7272-7272-727272727272', '33333333-3333-3333-3333-333333333333', 'sale', 'manual', -9, 111, 'Rush dispatch', timezone('utc'::text, now()) - interval '2 days'),
  ('c6969696-c696-c696-c696-c69696969696', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '72727272-7272-7272-7272-727272727272', '11111111-1111-1111-1111-111111111111', 'purchase', 'receiving', 20, 70, 'Restock East Coast', timezone('utc'::text, now()) - interval '20 days'),
  ('c7979797-c797-c797-c797-c79797979797', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '72727272-7272-7272-7272-727272727272', '33333333-3333-3333-3333-333333333333', 'sale', 'manual', -15, 55, 'Routine outbound', timezone('utc'::text, now()) - interval '10 days'),
  ('c8989898-c898-c898-c898-c89898989898', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000004', '72727272-7272-7272-7272-727272727272', '33333333-3333-3333-3333-333333333333', 'adjustment', 'manual', -15, 40, 'Expired reagent batch', timezone('utc'::text, now()) - interval '5 days'),
  ('ca999999-ca99-ca99-ca99-ca9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000008', '73737373-7373-7373-7373-737373737373', '11111111-1111-1111-1111-111111111111', 'scan_in', 'scan', 18, 32, 'Transfer from staging', timezone('utc'::text, now()) - interval '7 days'),
  ('cb999999-cb99-cb99-cb99-cb9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000008', '73737373-7373-7373-7373-737373737373', '33333333-3333-3333-3333-333333333333', 'sale', 'manual', -6, 26, 'Project allocation', timezone('utc'::text, now()) - interval '3 days'),
  ('cc999999-cc99-cc99-cc99-cc9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000017', '74747474-7474-7474-7474-747474747474', '33333333-3333-3333-3333-333333333333', 'loss', 'receiving', -3, 12, 'Damaged in transit during receiving', timezone('utc'::text, now()) - interval '2 days'),
  ('cd999999-cd99-cd99-cd99-cd9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000017', '74747474-7474-7474-7474-747474747474', '33333333-3333-3333-3333-333333333333', 'adjustment', 'manual', 1, 13, 'Counting error correction', timezone('utc'::text, now()) - interval '1 day'),
  ('ce999999-ce99-ce99-ce99-ce9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000029', '73737373-7373-7373-7373-737373737373', '11111111-1111-1111-1111-111111111111', 'sale', 'manual', -20, 80, 'Bulk issue to production', timezone('utc'::text, now()) - interval '4 days'),
  ('cf999999-cf99-cf99-cf99-cf9999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000039', '74747474-7474-7474-7474-747474747474', '33333333-3333-3333-3333-333333333333', 'purchase', 'receiving', 8, 18, 'Safety stock top-up', timezone('utc'::text, now()) - interval '9 days'),
  ('d0919191-d091-d091-d091-d09191919191', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '84848484-8484-8484-8484-a00000000039', '74747474-7474-7474-7474-747474747474', '33333333-3333-3333-3333-333333333333', 'loss', 'manual', -4, 14, 'Missing item after shelf audit', timezone('utc'::text, now()) - interval '8 days')
ON CONFLICT (id) DO UPDATE
SET
  company_id = EXCLUDED.company_id,
  product_id = EXCLUDED.product_id,
  folder_id = EXCLUDED.folder_id,
  performed_by = EXCLUDED.performed_by,
  transaction_type = EXCLUDED.transaction_type,
  source = EXCLUDED.source,
  quantity_change = EXCLUDED.quantity_change,
  stock_after = EXCLUDED.stock_after,
  notes = EXCLUDED.notes,
  created_at = EXCLUDED.created_at;

WITH ranked_products AS (
  SELECT
    p.id,
    p.custom_fields,
    CAST(row_number() OVER (ORDER BY p.id) AS integer) AS product_number,
    18 + ((CAST(row_number() OVER (ORDER BY p.id) AS integer) - 1) % 7) * 7 AS received_quantity,
    2 + ((CAST(row_number() OVER (ORDER BY p.id) AS integer) - 1) % 5) * 2 AS sale_quantity,
    round((5.50 + CAST(row_number() OVER (ORDER BY p.id) AS integer) * 1.35)::numeric, 2) AS seeded_cost_price
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
UPDATE stoqr.products p
SET
  folder_id = CASE
    WHEN ranked_products.product_number % 6 = 0 THEN '72727272-7272-7272-7272-727272727272'::uuid
    WHEN lower(COALESCE(ranked_products.custom_fields->>'SUPPLIER', '')) IN (
      'eppendorf',
      'thermofisher',
      'roche',
      'bio-rad',
      'idt',
      'qiagen',
      'millennium science',
      'mektronics'
    ) THEN '73737373-7373-7373-7373-737373737373'::uuid
    ELSE '74747474-7474-7474-7474-747474747474'::uuid
  END,
  quantity_on_hand = ranked_products.received_quantity - ranked_products.sale_quantity,
  min_stock_level = 4 + (ranked_products.product_number % 6),
  max_stock_level = GREATEST(30, ranked_products.received_quantity + 18),
  reorder_point = 6 + (ranked_products.product_number % 8),
  cost_price = ranked_products.seeded_cost_price,
  selling_price = round((ranked_products.seeded_cost_price * 1.82)::numeric, 2),
  updated_at = timezone('utc'::text, now())
FROM ranked_products
WHERE p.id = ranked_products.id;

INSERT INTO stoqr.product_folder_stocks (
  company_id,
  product_id,
  folder_id,
  quantity_on_hand,
  min_stock_level,
  reorder_point,
  max_stock_level,
  updated_at
)
SELECT
  p.company_id,
  p.id,
  p.folder_id,
  CASE
    WHEN p.id = '84848484-8484-8484-8484-a00000000017' THEN 5
    WHEN p.id = '84848484-8484-8484-8484-a00000000001' THEN GREATEST(COALESCE(p.quantity_on_hand, 0) - 18, 0)
    ELSE COALESCE(p.quantity_on_hand, 0)
  END,
  COALESCE(p.min_stock_level, 0),
  COALESCE(p.reorder_point, 0),
  p.max_stock_level,
  timezone('utc'::text, now())
FROM stoqr.products p
WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND p.folder_id IS NOT NULL
ON CONFLICT (company_id, product_id, folder_id) DO UPDATE
SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  min_stock_level = EXCLUDED.min_stock_level,
  reorder_point = EXCLUDED.reorder_point,
  max_stock_level = EXCLUDED.max_stock_level,
  updated_at = EXCLUDED.updated_at;

INSERT INTO stoqr.product_folder_stocks (
  company_id,
  product_id,
  folder_id,
  quantity_on_hand,
  min_stock_level,
  reorder_point,
  max_stock_level,
  updated_at
)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '84848484-8484-8484-8484-a00000000001',
    '72727272-7272-7272-7272-727272727272',
    18,
    8,
    12,
    40,
    timezone('utc'::text, now())
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '84848484-8484-8484-8484-a00000000008',
    '73737373-7373-7373-7373-737373737373',
    4,
    10,
    12,
    60,
    timezone('utc'::text, now())
  )
ON CONFLICT (company_id, product_id, folder_id) DO UPDATE
SET
  quantity_on_hand = EXCLUDED.quantity_on_hand,
  min_stock_level = EXCLUDED.min_stock_level,
  reorder_point = EXCLUDED.reorder_point,
  max_stock_level = EXCLUDED.max_stock_level,
  updated_at = EXCLUDED.updated_at;

UPDATE stoqr.products p
SET
  quantity_on_hand = COALESCE(stock_totals.total_quantity, 0),
  updated_at = timezone('utc'::text, now())
FROM (
  SELECT
    product_id,
    SUM(quantity_on_hand)::integer AS total_quantity
  FROM stoqr.product_folder_stocks
  WHERE company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  GROUP BY product_id
) stock_totals
WHERE p.id = stock_totals.product_id
  AND p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

WITH supplier_names AS (
  SELECT DISTINCT
    NULLIF(btrim(COALESCE(p.custom_fields->>'SUPPLIER', '')), '') AS supplier_name
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
supplier_seed AS (
  SELECT
    (
      substr(hash, 1, 8) || '-' ||
      substr(hash, 9, 4) || '-' ||
      substr(hash, 13, 4) || '-' ||
      substr(hash, 17, 4) || '-' ||
      substr(hash, 21, 12)
    )::uuid AS id,
    supplier_name,
    lower(regexp_replace(supplier_name, '[^a-zA-Z0-9]+', '', 'g')) AS supplier_slug,
    CAST(row_number() OVER (ORDER BY supplier_name) AS integer) AS supplier_number
  FROM (
    SELECT supplier_name, md5('stoqr-supplier:' || supplier_name) AS hash
    FROM supplier_names
    WHERE supplier_name IS NOT NULL
  ) seeded_names
)
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
SELECT
  supplier_seed.id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  supplier_seed.supplier_name,
  supplier_seed.supplier_name || ' Account Desk',
  supplier_seed.supplier_slug || '@example.com',
  '+61 2 91' || lpad((supplier_seed.supplier_number + 40)::text, 2, '0') || ' ' || lpad((supplier_seed.supplier_number + 1000)::text, 4, '0'),
  supplier_seed.supplier_name || ' Distribution Centre',
  'https://' || supplier_seed.supplier_slug || '.example',
  timezone('utc'::text, now()) - interval '150 days' + make_interval(days => supplier_seed.supplier_number)
FROM supplier_seed
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  contact_name = EXCLUDED.contact_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  website = EXCLUDED.website,
  created_at = EXCLUDED.created_at;

WITH product_seed AS (
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    NULLIF(btrim(COALESCE(p.custom_fields->>'SUPPLIER', '')), '') AS supplier_name,
    CAST(row_number() OVER (ORDER BY p.id) AS integer) AS product_number
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
po_seed AS (
  SELECT
    product_seed.product_id,
    product_seed.product_name,
    product_seed.product_number,
    (
      substr(po_hash, 1, 8) || '-' ||
      substr(po_hash, 9, 4) || '-' ||
      substr(po_hash, 13, 4) || '-' ||
      substr(po_hash, 17, 4) || '-' ||
      substr(po_hash, 21, 12)
    )::uuid AS po_id,
    (
      substr(supplier_hash, 1, 8) || '-' ||
      substr(supplier_hash, 9, 4) || '-' ||
      substr(supplier_hash, 13, 4) || '-' ||
      substr(supplier_hash, 17, 4) || '-' ||
      substr(supplier_hash, 21, 12)
    )::uuid AS supplier_id,
    timezone('utc'::text, now()) - make_interval(days => 75 - product_seed.product_number) AS po_created_at
  FROM (
    SELECT
      product_seed.*,
      md5('stoqr-generated-po:' || product_seed.product_id::text) AS po_hash,
      md5('stoqr-supplier:' || product_seed.supplier_name) AS supplier_hash
    FROM product_seed
    WHERE product_seed.supplier_name IS NOT NULL
  ) product_seed
)
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
SELECT
  po_seed.po_id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  po_seed.supplier_id,
  3000 + po_seed.product_number,
  CASE WHEN po_seed.product_number % 9 = 0 THEN 'partial_receipt' ELSE 'received' END,
  (po_seed.po_created_at + interval '5 days')::date,
  'Seeded replenishment for ' || po_seed.product_name,
  CASE WHEN po_seed.product_number % 2 = 0 THEN '11111111-1111-1111-1111-111111111111'::uuid ELSE '33333333-3333-3333-3333-333333333333'::uuid END,
  po_seed.po_created_at,
  po_seed.po_created_at + interval '6 days'
FROM po_seed
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

WITH product_seed AS (
  SELECT
    p.id AS product_id,
    p.folder_id,
    CAST(row_number() OVER (ORDER BY p.id) AS integer) AS product_number,
    18 + ((CAST(row_number() OVER (ORDER BY p.id) AS integer) - 1) % 7) * 7 AS received_quantity,
    round((5.50 + CAST(row_number() OVER (ORDER BY p.id) AS integer) * 1.35)::numeric, 2) AS seeded_cost_price
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
item_seed AS (
  SELECT
    product_seed.product_id,
    product_seed.folder_id,
    product_seed.product_number,
    product_seed.received_quantity,
    product_seed.seeded_cost_price,
    (
      substr(item_hash, 1, 8) || '-' ||
      substr(item_hash, 9, 4) || '-' ||
      substr(item_hash, 13, 4) || '-' ||
      substr(item_hash, 17, 4) || '-' ||
      substr(item_hash, 21, 12)
    )::uuid AS item_id,
    (
      substr(po_hash, 1, 8) || '-' ||
      substr(po_hash, 9, 4) || '-' ||
      substr(po_hash, 13, 4) || '-' ||
      substr(po_hash, 17, 4) || '-' ||
      substr(po_hash, 21, 12)
    )::uuid AS po_id
  FROM (
    SELECT
      product_seed.*,
      md5('stoqr-generated-po-item:' || product_seed.product_id::text) AS item_hash,
      md5('stoqr-generated-po:' || product_seed.product_id::text) AS po_hash
    FROM product_seed
  ) product_seed
)
INSERT INTO stoqr.purchase_order_items (
  id,
  po_id,
  product_id,
  quantity_ordered,
  quantity_received,
  unit_cost
)
SELECT
  item_seed.item_id,
  item_seed.po_id,
  item_seed.product_id,
  item_seed.received_quantity + CASE WHEN item_seed.product_number % 9 = 0 THEN 6 ELSE 0 END,
  item_seed.received_quantity,
  item_seed.seeded_cost_price
FROM item_seed
ON CONFLICT (id) DO UPDATE
SET
  po_id = EXCLUDED.po_id,
  product_id = EXCLUDED.product_id,
  quantity_ordered = EXCLUDED.quantity_ordered,
  quantity_received = EXCLUDED.quantity_received,
  unit_cost = EXCLUDED.unit_cost;

WITH product_seed AS (
  SELECT
    p.id AS product_id,
    CAST(row_number() OVER (ORDER BY p.id) AS integer) AS product_number,
    18 + ((CAST(row_number() OVER (ORDER BY p.id) AS integer) - 1) % 7) * 7 AS received_quantity
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
receiving_seed AS (
  SELECT
    product_seed.product_id,
    product_seed.product_number,
    product_seed.received_quantity,
    (
      substr(log_hash, 1, 8) || '-' ||
      substr(log_hash, 9, 4) || '-' ||
      substr(log_hash, 13, 4) || '-' ||
      substr(log_hash, 17, 4) || '-' ||
      substr(log_hash, 21, 12)
    )::uuid AS log_id,
    (
      substr(po_hash, 1, 8) || '-' ||
      substr(po_hash, 9, 4) || '-' ||
      substr(po_hash, 13, 4) || '-' ||
      substr(po_hash, 17, 4) || '-' ||
      substr(po_hash, 21, 12)
    )::uuid AS po_id,
    timezone('utc'::text, now()) - make_interval(days => 28 - ((product_seed.product_number - 1) % 14)) AS received_at
  FROM (
    SELECT
      product_seed.*,
      md5('stoqr-generated-receiving:' || product_seed.product_id::text) AS log_hash,
      md5('stoqr-generated-po:' || product_seed.product_id::text) AS po_hash
    FROM product_seed
  ) product_seed
)
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
SELECT
  receiving_seed.log_id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  receiving_seed.po_id,
  receiving_seed.product_id,
  receiving_seed.received_quantity,
  CASE WHEN receiving_seed.product_number % 2 = 0 THEN '11111111-1111-1111-1111-111111111111'::uuid ELSE '33333333-3333-3333-3333-333333333333'::uuid END,
  receiving_seed.received_at,
  'Received seeded lot LOT-' || lpad(receiving_seed.product_number::text, 4, '0')
FROM receiving_seed
ON CONFLICT (id) DO UPDATE
SET
  company_id = EXCLUDED.company_id,
  po_id = EXCLUDED.po_id,
  product_id = EXCLUDED.product_id,
  quantity_received = EXCLUDED.quantity_received,
  received_by = EXCLUDED.received_by,
  received_at = EXCLUDED.received_at,
  notes = EXCLUDED.notes;

WITH product_seed AS (
  SELECT
    p.id AS product_id,
    p.folder_id,
    CAST(row_number() OVER (ORDER BY p.id) AS integer) AS product_number,
    18 + ((CAST(row_number() OVER (ORDER BY p.id) AS integer) - 1) % 7) * 7 AS received_quantity,
    2 + ((CAST(row_number() OVER (ORDER BY p.id) AS integer) - 1) % 5) * 2 AS sale_quantity
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
transaction_seed AS (
  SELECT
    product_seed.product_id,
    product_seed.folder_id,
    product_seed.product_number,
    product_seed.received_quantity,
    product_seed.sale_quantity,
    product_seed.received_quantity - product_seed.sale_quantity AS stock_after_sale,
    (
      substr(purchase_hash, 1, 8) || '-' ||
      substr(purchase_hash, 9, 4) || '-' ||
      substr(purchase_hash, 13, 4) || '-' ||
      substr(purchase_hash, 17, 4) || '-' ||
      substr(purchase_hash, 21, 12)
    )::uuid AS purchase_tx_id,
    (
      substr(sale_hash, 1, 8) || '-' ||
      substr(sale_hash, 9, 4) || '-' ||
      substr(sale_hash, 13, 4) || '-' ||
      substr(sale_hash, 17, 4) || '-' ||
      substr(sale_hash, 21, 12)
    )::uuid AS sale_tx_id,
    timezone('utc'::text, now()) - make_interval(days => 12 - ((product_seed.product_number - 1) % 5)) AS purchase_at,
    timezone('utc'::text, now()) - make_interval(mins => product_seed.product_number * 11) AS sale_at
  FROM (
    SELECT
      product_seed.*,
      md5('stoqr-generated-purchase-tx:' || product_seed.product_id::text) AS purchase_hash,
      md5('stoqr-generated-sale-tx:' || product_seed.product_id::text) AS sale_hash
    FROM product_seed
  ) product_seed
)
INSERT INTO stoqr.inventory_transactions (
  id,
  company_id,
  product_id,
  folder_id,
  performed_by,
  transaction_type,
  source,
  quantity_change,
  stock_after,
  notes,
  created_at
)
SELECT
  transaction_seed.purchase_tx_id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  transaction_seed.product_id,
  transaction_seed.folder_id,
  CASE WHEN transaction_seed.product_number % 2 = 0 THEN '11111111-1111-1111-1111-111111111111'::uuid ELSE '33333333-3333-3333-3333-333333333333'::uuid END,
  'purchase',
  'receiving',
  transaction_seed.received_quantity,
  transaction_seed.received_quantity,
  'LOT-' || lpad(transaction_seed.product_number::text, 4, '0') || ' inbound replenishment',
  transaction_seed.purchase_at
FROM transaction_seed
UNION ALL
SELECT
  transaction_seed.sale_tx_id,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  transaction_seed.product_id,
  transaction_seed.folder_id,
  CASE WHEN transaction_seed.product_number % 2 = 0 THEN '33333333-3333-3333-3333-333333333333'::uuid ELSE '11111111-1111-1111-1111-111111111111'::uuid END,
  'sale',
  'manual',
  -transaction_seed.sale_quantity,
  transaction_seed.stock_after_sale,
  'LOT-' || lpad(transaction_seed.product_number::text, 4, '0') || ' released to customer order',
  transaction_seed.sale_at
FROM transaction_seed
ON CONFLICT (id) DO UPDATE
SET
  company_id = EXCLUDED.company_id,
  product_id = EXCLUDED.product_id,
  folder_id = EXCLUDED.folder_id,
  performed_by = EXCLUDED.performed_by,
  transaction_type = EXCLUDED.transaction_type,
  source = EXCLUDED.source,
  quantity_change = EXCLUDED.quantity_change,
  stock_after = EXCLUDED.stock_after,
  notes = EXCLUDED.notes,
  created_at = EXCLUDED.created_at;

WITH product_seed AS (
  SELECT
    p.id AS product_id,
    CAST(row_number() OVER (ORDER BY p.id) AS integer) AS product_number
  FROM stoqr.products p
  WHERE p.company_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
),
attachment_seed AS (
  SELECT
    product_seed.product_id,
    product_seed.product_number,
    (
      substr(object_hash, 1, 8) || '-' ||
      substr(object_hash, 9, 4) || '-' ||
      substr(object_hash, 13, 4) || '-' ||
      substr(object_hash, 17, 4) || '-' ||
      substr(object_hash, 21, 12)
    )::uuid AS object_id,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/' || product_seed.product_id::text || '/' ||
      CASE product_seed.product_number % 3
        WHEN 0 THEN 'sds-' || lpad(product_seed.product_number::text, 3, '0') || '.pdf'
        WHEN 1 THEN 'coa-' || lpad(product_seed.product_number::text, 3, '0') || '.pdf'
        ELSE 'manual-' || lpad(product_seed.product_number::text, 3, '0') || '.pdf'
      END AS object_name,
    md5('stoqr-attachment-version:' || product_seed.product_id::text) AS object_version
  FROM (
    SELECT
      product_seed.*,
      md5('stoqr-attachment:' || product_seed.product_id::text) AS object_hash
    FROM product_seed
  ) product_seed
)
INSERT INTO storage.objects (
  id,
  bucket_id,
  name,
  owner,
  owner_id,
  metadata,
  user_metadata,
  version,
  created_at,
  updated_at,
  last_accessed_at
)
SELECT
  attachment_seed.object_id,
  'product-images',
  attachment_seed.object_name,
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'size', 15360 + attachment_seed.product_number * 512,
    'mimetype', 'application/pdf',
    'cacheControl', '3600'
  ),
  jsonb_build_object(
    'seeded', true,
    'label', 'Mock product attachment'
  ),
  attachment_seed.object_version,
  timezone('utc'::text, now()) - make_interval(days => attachment_seed.product_number),
  timezone('utc'::text, now()) - make_interval(days => attachment_seed.product_number),
  timezone('utc'::text, now()) - make_interval(days => attachment_seed.product_number)
FROM attachment_seed
ON CONFLICT (id) DO UPDATE
SET
  bucket_id = EXCLUDED.bucket_id,
  name = EXCLUDED.name,
  owner = EXCLUDED.owner,
  owner_id = EXCLUDED.owner_id,
  metadata = EXCLUDED.metadata,
  user_metadata = EXCLUDED.user_metadata,
  version = EXCLUDED.version,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  last_accessed_at = EXCLUDED.last_accessed_at;

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

INSERT INTO stoqr.alert_rules (
  id,
  company_id,
  name,
  alert_type,
  enabled,
  condition,
  delivery_channels,
  recipients,
  created_by,
  created_at
)
VALUES
  (
    'f1919191-f191-f191-f191-f19191919191',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Low stock alert',
    'low_stock',
    true,
    '{"thresholdSource":"product_reorder_point"}'::jsonb,
    ARRAY['in_app', 'email'],
    ARRAY['role:20202020-2020-2020-2020-202020202020'],
    '11111111-1111-1111-1111-111111111111',
    timezone('utc'::text, now()) - interval '3 days'
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  alert_type = EXCLUDED.alert_type,
  enabled = EXCLUDED.enabled,
  condition = EXCLUDED.condition,
  delivery_channels = EXCLUDED.delivery_channels,
  recipients = EXCLUDED.recipients,
  created_by = EXCLUDED.created_by,
  created_at = EXCLUDED.created_at;

INSERT INTO stoqr.alert_events (
  id,
  company_id,
  rule_id,
  product_id,
  folder_id,
  alert_type,
  severity,
  status,
  message,
  metadata,
  triggered_at
)
VALUES
  (
    'f2929292-f292-f292-f292-f29292929292',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'f1919191-f191-f191-f191-f19191919191',
    '84848484-8484-8484-8484-a00000000008',
    '73737373-7373-7373-7373-737373737373',
    'low_stock',
    'high',
    'open',
    'Gown Isolation Disposable in Warehouse Network / PCR Consumables is at 4 units, at or below its Low Stock Alert level of 12.',
    '{"folder_id":"73737373-7373-7373-7373-737373737373","folder_name":"Warehouse Network / PCR Consumables","quantity_on_hand":4,"reorder_point":12,"recipient_roles":["role:20202020-2020-2020-2020-202020202020"]}'::jsonb,
    timezone('utc'::text, now()) - interval '45 minutes'
  )
ON CONFLICT (id) DO UPDATE
SET
  rule_id = EXCLUDED.rule_id,
  product_id = EXCLUDED.product_id,
  folder_id = EXCLUDED.folder_id,
  alert_type = EXCLUDED.alert_type,
  severity = EXCLUDED.severity,
  status = EXCLUDED.status,
  message = EXCLUDED.message,
  metadata = EXCLUDED.metadata,
  triggered_at = EXCLUDED.triggered_at;

INSERT INTO stoqr.alert_delivery_logs (
  id,
  company_id,
  alert_event_id,
  channel,
  recipient,
  status,
  sent_at
)
VALUES
  ('f3939393-f393-f393-f393-f39393939393', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f2929292-f292-f292-f292-f29292929292', 'in_app', '33333333-3333-3333-3333-333333333333', 'sent', timezone('utc'::text, now()) - interval '45 minutes'),
  ('f4949494-f494-f494-f494-f49494949494', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f2929292-f292-f292-f292-f29292929292', 'in_app', '44444444-4444-4444-4444-444444444444', 'sent', timezone('utc'::text, now()) - interval '45 minutes'),
  ('f5959595-f595-f595-f595-f59595959595', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f2929292-f292-f292-f292-f29292929292', 'email', 'admin@acme.test', 'pending', NULL),
  ('f6969696-f696-f696-f696-f69696969696', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f2929292-f292-f292-f292-f29292929292', 'email', 'editor@acme.test', 'pending', NULL)
ON CONFLICT (id) DO UPDATE
SET
  alert_event_id = EXCLUDED.alert_event_id,
  channel = EXCLUDED.channel,
  recipient = EXCLUDED.recipient,
  status = EXCLUDED.status,
  sent_at = EXCLUDED.sent_at;
