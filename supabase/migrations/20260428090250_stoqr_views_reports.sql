-- StoQR report and permission views.

CREATE OR REPLACE VIEW stoqr.my_permissions
WITH (security_invoker = true)
AS
WITH current_membership AS (
  SELECT om.org_id, om.user_id, om.role AS org_role, cm.role_id
  FROM public.organisation_members om
  LEFT JOIN stoqr.organisation_member_roles cm
    ON cm.company_id = om.org_id
   AND cm.user_id = om.user_id
  WHERE om.user_id = auth.uid()
),
assigned_permissions AS (
  SELECT cm.org_id AS company_id, ap.code AS permission_code
  FROM current_membership cm
  JOIN stoqr.app_permissions ap ON TRUE
  WHERE cm.org_role = 'owner'
  UNION
  SELECT cm.org_id AS company_id, rp.permission_code
  FROM current_membership cm
  JOIN stoqr.role_permissions rp ON rp.role_id = cm.role_id
  WHERE cm.org_role <> 'owner'
),
permission_edges(source_code, implied_code) AS (
  VALUES
    ('inventory.use', 'inventory.view'),
    ('inventory.create', 'inventory.view'),
    ('inventory.create', 'inventory.use'),
    ('inventory.edit', 'inventory.view'),
    ('inventory.edit', 'inventory.use'),
    ('inventory.adjust', 'inventory.view'),
    ('inventory.adjust', 'inventory.use'),
    ('inventory.delete', 'inventory.view'),
    ('inventory.delete', 'inventory.use'),
    ('inventory.import_export', 'inventory.view'),
    ('inventory.import_export', 'inventory.use'),
    ('scanner.use', 'scanner.view'),
    ('labels.use', 'labels.view'),
    ('labels.manage', 'labels.view'),
    ('labels.manage', 'labels.use'),
    ('reports.export', 'reports.view'),
    ('procurement.create', 'procurement.view'),
    ('procurement.receive', 'procurement.view'),
    ('procurement.manage', 'procurement.view'),
    ('procurement.manage', 'procurement.create'),
    ('procurement.manage', 'procurement.receive'),
    ('alerts.use', 'alerts.view'),
    ('alerts.manage', 'alerts.view'),
    ('alerts.manage', 'alerts.use'),
    ('organisation.members.manage', 'organisation.view'),
    ('organisation.roles.manage', 'organisation.view'),
    ('organisation.pages.manage', 'organisation.view'),
    ('organisation.activity.view', 'organisation.view'),
    ('organisation.company.manage', 'organisation.view'),
    ('organisation.billing.manage', 'organisation.view'),
    ('products.view', 'inventory.view'),
    ('products.view', 'inventory.use'),
    ('products.manage', 'inventory.create'),
    ('products.manage', 'inventory.edit'),
    ('products.manage', 'inventory.adjust'),
    ('products.manage', 'inventory.delete'),
    ('products.manage', 'inventory.view'),
    ('products.manage', 'inventory.use'),
    ('inventory.bulk_manage', 'inventory.import_export'),
    ('inventory.bulk_manage', 'inventory.view'),
    ('inventory.bulk_manage', 'inventory.use'),
    ('transactions.view', 'inventory.use'),
    ('transactions.view', 'inventory.view'),
    ('transactions.create', 'inventory.adjust'),
    ('transactions.create', 'scanner.use'),
    ('transactions.create', 'inventory.use'),
    ('transactions.create', 'inventory.view'),
    ('transactions.create', 'scanner.view'),
    ('company.manage', 'organisation.company.manage'),
    ('billing.manage', 'organisation.billing.manage'),
    ('members.view', 'organisation.view'),
    ('members.manage', 'organisation.members.manage'),
    ('roles.manage', 'organisation.roles.manage'),
    ('activity.view', 'organisation.activity.view')
),
expanded_permissions AS (
  SELECT company_id, permission_code AS code
  FROM assigned_permissions
  UNION
  SELECT ap.company_id, pe.implied_code
  FROM assigned_permissions ap
  JOIN permission_edges pe ON pe.source_code = ap.permission_code
  UNION
  SELECT ap.company_id, pe2.implied_code
  FROM assigned_permissions ap
  JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
  JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
)
SELECT DISTINCT ep.company_id, ep.code
FROM expanded_permissions ep
JOIN stoqr.app_permissions ap ON ap.code = ep.code
WHERE ap.hidden = false;

CREATE OR REPLACE VIEW stoqr.inventory_stats
WITH (security_invoker = true)
AS
SELECT
  p.company_id,
  COUNT(*)::BIGINT AS total_items,
  COUNT(*) FILTER (WHERE COALESCE(p.quantity_on_hand, 0) <= COALESCE(p.reorder_point, 0))::BIGINT AS low_stock_items,
  COALESCE(SUM(COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0)), 0)::NUMERIC AS total_value
FROM stoqr.products p
WHERE p.deleted_at IS NULL
GROUP BY p.company_id;

CREATE OR REPLACE VIEW stoqr.report_inventory_valuation
WITH (security_invoker = true)
AS
SELECT
  p.company_id,
  p.id AS product_id,
  p.sku,
  p.name,
  COALESCE(p.quantity_on_hand, 0)::INTEGER AS quantity_on_hand,
  COALESCE(p.min_stock_level, 0)::INTEGER AS min_stock_level,
  COALESCE(p.reorder_point, 0)::INTEGER AS reorder_point,
  COALESCE(p.cost_price, 0)::NUMERIC AS cost_price,
  COALESCE(p.selling_price, 0)::NUMERIC AS selling_price,
  (COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0))::NUMERIC AS inventory_value,
  (COALESCE(p.quantity_on_hand, 0) * COALESCE(p.selling_price, 0))::NUMERIC AS potential_revenue,
  (COALESCE(p.selling_price, 0) - COALESCE(p.cost_price, 0))::NUMERIC AS margin_per_unit
FROM stoqr.products p
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW stoqr.report_stock_movements
WITH (security_invoker = true)
AS
SELECT
  it.company_id,
  it.id AS transaction_id,
  it.created_at,
  it.transaction_type,
  it.source,
  it.quantity_change,
  it.stock_after,
  p.id AS product_id,
  p.sku,
  p.name AS product_name,
  it.performed_by,
  COALESCE(pr.full_name, pr.username::TEXT, pr.email) AS performer_name,
  it.notes
FROM stoqr.inventory_transactions it
JOIN stoqr.products p ON p.id = it.product_id
LEFT JOIN public.profiles pr ON pr.id = it.performed_by;

CREATE OR REPLACE VIEW stoqr.alert_products
WITH (security_invoker = true)
AS
SELECT
  p.company_id,
  p.id,
  p.name,
  p.sku,
  COALESCE(pfs.quantity_on_hand, p.quantity_on_hand, 0)::INTEGER AS quantity_on_hand,
  COALESCE(NULLIF(pfs.reorder_point, 0), p.reorder_point, 0)::INTEGER AS reorder_point,
  p.expiry_date,
  pfs.folder_id,
  stoqr.folder_path_name(pfs.folder_id) AS folder_name
FROM stoqr.products p
LEFT JOIN stoqr.product_folder_stocks pfs
  ON pfs.product_id = p.id
 AND pfs.company_id = p.company_id
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW stoqr.delivered_alert_events
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (ae.id)
  ae.id,
  ae.company_id,
  ae.rule_id,
  ae.product_id,
  ae.alert_type,
  ae.severity,
  ae.status,
  ae.message,
  ae.triggered_at,
  adl.id AS delivery_id,
  p.name AS product_name,
  p.sku AS product_sku,
  ae.folder_id,
  stoqr.folder_path_name(ae.folder_id) AS folder_name
FROM stoqr.alert_events ae
LEFT JOIN stoqr.alert_delivery_logs adl
  ON adl.alert_event_id = ae.id
 AND adl.channel = 'in_app'
LEFT JOIN stoqr.products p ON p.id = ae.product_id
WHERE
  public.has_permission(ae.company_id, 'alerts.manage')
  OR public.has_permission(ae.company_id, 'alerts.use')
  OR adl.recipient = auth.uid()::TEXT
ORDER BY ae.id, ae.triggered_at DESC;

GRANT SELECT ON stoqr.my_permissions TO authenticated, service_role;
GRANT SELECT ON stoqr.inventory_stats TO authenticated, service_role;
GRANT SELECT ON stoqr.report_inventory_valuation TO authenticated, service_role;
GRANT SELECT ON stoqr.report_stock_movements TO authenticated, service_role;
GRANT SELECT ON stoqr.alert_products TO authenticated, service_role;
GRANT SELECT ON stoqr.delivered_alert_events TO authenticated, service_role;
