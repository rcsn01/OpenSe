-- Additional procurement workflow demo data

UPDATE stoqr.purchase_orders
SET
	status = CASE id
		WHEN '91919191-9191-9191-9191-919191919191' THEN 'received'
		WHEN '92929292-9292-9292-9292-929292929292' THEN 'return_resolved'
		WHEN '93939393-9393-9393-9393-939393939393' THEN 'received'
		WHEN '94949494-9494-9494-9494-949494949494' THEN 'awaiting_return'
		WHEN '95959595-9595-9595-9595-959595959595' THEN 'in_transit'
		WHEN '96969696-9696-9696-9696-969696969696' THEN 'pending_approval'
		ELSE status
	END
WHERE id IN (
	'91919191-9191-9191-9191-919191919191',
	'92929292-9292-9292-9292-929292929292',
	'93939393-9393-9393-9393-939393939393',
	'94949494-9494-9494-9494-949494949494',
	'95959595-9595-9595-9595-959595959595',
	'96969696-9696-9696-9696-969696969696'
);

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
	(
		'97979797-9797-9797-9797-979797979797',
		'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		'81818181-8181-8181-8181-818181818181',
		1207,
		'denied',
		(timezone('utc'::text, now()) + interval '6 days')::date,
		'Capsule buy request denied before market release.',
		'33333333-3333-3333-3333-333333333333',
		timezone('utc'::text, now()) - interval '3 days',
		timezone('utc'::text, now()) - interval '2 days'
	),
	(
		'98989898-9898-9898-9898-989898989898',
		'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		'82828282-8282-8282-8282-828282828282',
		1208,
		'shipped_to_vendor',
		(timezone('utc'::text, now()) - interval '5 days')::date,
		'Leather tote vendor return dispatched after boutique inspection.',
		'11111111-1111-1111-1111-111111111111',
		timezone('utc'::text, now()) - interval '11 days',
		timezone('utc'::text, now()) - interval '1 day'
	)
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
	('a8989898-a898-a898-a898-a89898989898', '98989898-9898-9898-9898-989898989898', '84848484-8484-8484-8484-a00000000017', 18, 18, 275.00)
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
	(
		'b8989898-b898-b898-b898-b89898989898',
		'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		'98989898-9898-9898-9898-989898989898',
		'84848484-8484-8484-8484-a00000000017',
		18,
		'11111111-1111-1111-1111-111111111111',
		timezone('utc'::text, now()) - interval '4 days',
		'Received before leather finish return was authorised.'
	)
ON CONFLICT (id) DO UPDATE
SET
	company_id = EXCLUDED.company_id,
	po_id = EXCLUDED.po_id,
	product_id = EXCLUDED.product_id,
	quantity_received = EXCLUDED.quantity_received,
	received_by = EXCLUDED.received_by,
	received_at = EXCLUDED.received_at,
	notes = EXCLUDED.notes;
