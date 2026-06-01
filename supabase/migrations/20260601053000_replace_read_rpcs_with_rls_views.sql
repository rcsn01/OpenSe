-- Replace read-oriented app RPCs with direct table/view access protected by RLS.

CREATE OR REPLACE VIEW public.account_org_context
WITH (security_invoker = true)
AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  om.role AS member_role,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.billing_name,
  o.billing_email,
  o.billing_phone,
  om.created_at AS member_created_at
FROM public.organisation_members om
JOIN public.organisations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();

CREATE OR REPLACE VIEW public.account_organisation_profile
WITH (security_invoker = true)
AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.status,
  om.role AS member_role,
  o.owner_id AS owner_user_id,
  owner_profile.full_name AS owner_full_name,
  owner_profile.email AS owner_email,
  o.primary_contact_name,
  o.primary_contact_email,
  o.billing_name,
  o.billing_email,
  o.billing_phone,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  om.created_at AS member_created_at
FROM public.organisation_members om
JOIN public.organisations o ON o.id = om.org_id
LEFT JOIN public.profiles owner_profile ON owner_profile.id = o.owner_id
WHERE om.user_id = auth.uid();

CREATE OR REPLACE VIEW public.account_org_member_app_assignments
WITH (security_invoker = true)
AS
WITH primary_org AS (
  SELECT om.org_id
  FROM public.organisation_members om
  WHERE om.user_id = auth.uid()
  ORDER BY
    CASE om.role
      WHEN 'owner' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'editor' THEN 2
      ELSE 3
    END,
    om.created_at
  LIMIT 1
)
SELECT
  om.id AS org_member_id,
  om.org_id,
  om.user_id,
  p.full_name,
  p.email,
  om.role,
  COALESCE(
    ARRAY_REMOVE(ARRAY_AGG(mas.app_code ORDER BY mas.app_code), NULL),
    ARRAY[]::TEXT[]
  ) AS assigned_apps,
  om.created_at
FROM primary_org po
JOIN public.organisation_members om ON om.org_id = po.org_id
LEFT JOIN public.profiles p ON p.id = om.user_id
LEFT JOIN public.organisation_member_app_seats mas ON mas.org_member_id = om.id
GROUP BY om.id, om.org_id, om.user_id, p.full_name, p.email, om.role, om.created_at;

CREATE OR REPLACE VIEW public.account_org_app_seat_summary
WITH (security_invoker = true)
AS
WITH primary_org AS (
  SELECT om.org_id
  FROM public.organisation_members om
  WHERE om.user_id = auth.uid()
  ORDER BY
    CASE om.role
      WHEN 'owner' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'editor' THEN 2
      ELSE 3
    END,
    om.created_at
  LIMIT 1
),
assigned AS (
  SELECT om.org_id, mas.app_code, COUNT(*) AS assigned_count
  FROM public.organisation_member_app_seats mas
  JOIN public.organisation_members om ON om.id = mas.org_member_id
  JOIN primary_org po ON po.org_id = om.org_id
  GROUP BY om.org_id, mas.app_code
),
pending AS (
  SELECT oi.org_id, ias.app_code, COUNT(*) AS pending_count
  FROM public.organisation_invite_app_seats ias
  JOIN public.organisation_invites oi ON oi.id = ias.invite_id
  JOIN primary_org po ON po.org_id = oi.org_id
  WHERE oi.accepted_at IS NULL
  GROUP BY oi.org_id, ias.app_code
)
SELECT
  po.org_id,
  a.code AS app_code,
  a.name AS app_name,
  oas.seat_limit,
  (
    COALESCE(assigned.assigned_count, 0)
    + COALESCE(pending.pending_count, 0)
  )::INTEGER AS assigned_seats
FROM primary_org po
JOIN public.apps a ON TRUE
LEFT JOIN public.organisation_app_seats oas
  ON oas.org_id = po.org_id
 AND oas.app_code = a.code
LEFT JOIN assigned
  ON assigned.org_id = po.org_id
 AND assigned.app_code = a.code
LEFT JOIN pending
  ON pending.org_id = po.org_id
 AND pending.app_code = a.code;

CREATE OR REPLACE VIEW public.account_org_audit_events
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.org_id,
  e.actor_user_id,
  actor_profile.email AS actor_email,
  actor_profile.full_name AS actor_full_name,
  e.action,
  e.app_code,
  e.target_org_member_id,
  target_profile.email AS target_user_email,
  e.metadata,
  e.created_at
FROM public.organisation_audit_events e
LEFT JOIN public.profiles actor_profile ON actor_profile.id = e.actor_user_id
LEFT JOIN public.organisation_members target_member ON target_member.id = e.target_org_member_id
LEFT JOIN public.profiles target_profile ON target_profile.id = target_member.user_id;

GRANT SELECT ON public.account_org_context TO authenticated, service_role;
GRANT SELECT ON public.account_organisation_profile TO authenticated, service_role;
GRANT SELECT ON public.account_org_member_app_assignments TO authenticated, service_role;
GRANT SELECT ON public.account_org_app_seat_summary TO authenticated, service_role;
GRANT SELECT ON public.account_org_audit_events TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'stoqr'
      AND tablename = 'products'
      AND policyname = 'Report viewers can view products'
  ) THEN
    CREATE POLICY "Report viewers can view products" ON stoqr.products
      FOR SELECT USING (
        deleted_at IS NULL
        AND (
          public.has_permission(company_id, 'reports.view')
          OR public.has_permission(company_id, 'dashboard.view')
          OR public.has_permission(company_id, 'alerts.view')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'stoqr'
      AND tablename = 'product_folder_stocks'
      AND policyname = 'Report viewers can view product folder stocks'
  ) THEN
    CREATE POLICY "Report viewers can view product folder stocks" ON stoqr.product_folder_stocks
      FOR SELECT USING (
        public.has_permission(company_id, 'reports.view')
        OR public.has_permission(company_id, 'dashboard.view')
        OR public.has_permission(company_id, 'alerts.view')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'stoqr'
      AND tablename = 'inventory_transactions'
      AND policyname = 'Report viewers can view transactions'
  ) THEN
    CREATE POLICY "Report viewers can view transactions" ON stoqr.inventory_transactions
      FOR SELECT USING (
        public.has_permission(company_id, 'reports.view')
        OR public.has_permission(company_id, 'dashboard.view')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'stoqr'
      AND tablename = 'purchase_orders'
      AND policyname = 'Dashboard viewers can view purchase orders'
  ) THEN
    CREATE POLICY "Dashboard viewers can view purchase orders" ON stoqr.purchase_orders
      FOR SELECT USING (public.has_permission(company_id, 'dashboard.view'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'stoqr'
      AND tablename = 'alert_delivery_logs'
      AND policyname = 'Users can view own in-app alert deliveries'
  ) THEN
    CREATE POLICY "Users can view own in-app alert deliveries" ON stoqr.alert_delivery_logs
      FOR SELECT USING (
        channel = 'in_app'
        AND recipient = auth.uid()::TEXT
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'stoqr'
      AND tablename = 'alert_events'
      AND policyname = 'Alert users can view delivered alert events'
  ) THEN
    CREATE POLICY "Alert users can view delivered alert events" ON stoqr.alert_events
      FOR SELECT USING (
        public.has_permission(company_id, 'alerts.use')
        OR EXISTS (
          SELECT 1
          FROM stoqr.alert_delivery_logs adl
          WHERE adl.alert_event_id = alert_events.id
            AND adl.channel = 'in_app'
            AND adl.recipient = auth.uid()::TEXT
        )
      );
  END IF;
END;
$$;

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

CREATE OR REPLACE VIEW etl.personal_usage_stats
WITH (security_invoker = true)
AS
SELECT
  we.user_id,
  we.started_at::DATE AS daily_date,
  COUNT(*)::BIGINT AS daily_total,
  COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT AS daily_success,
  COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT AS daily_failed
FROM etl.workflow_executions we
JOIN etl.workflows w ON w.id = we.workflow_id
WHERE w.owner_id = auth.uid()
  AND w.org_id IS NULL
  AND we.started_at >= now() - INTERVAL '30 days'
GROUP BY we.user_id, we.started_at::DATE;

CREATE OR REPLACE VIEW etl.org_member_usage_stats
WITH (security_invoker = true)
AS
SELECT
  w.org_id,
  we.started_at::DATE AS daily_date,
  COUNT(*)::BIGINT AS daily_total,
  COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT AS daily_success,
  COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT AS daily_failed
FROM etl.workflow_executions we
JOIN etl.workflows w ON w.id = we.workflow_id
WHERE w.org_id IS NOT NULL
  AND we.started_at >= now() - INTERVAL '30 days'
GROUP BY w.org_id, we.started_at::DATE;

CREATE OR REPLACE VIEW etl.org_active_users
WITH (security_invoker = true)
AS
SELECT
  w.org_id,
  we.user_id,
  p.email,
  p.full_name,
  COUNT(*)::BIGINT AS execution_count,
  MAX(we.started_at) AS last_active
FROM etl.workflow_executions we
JOIN etl.workflows w ON w.id = we.workflow_id
JOIN public.profiles p ON p.id = we.user_id
WHERE w.org_id IS NOT NULL
  AND we.started_at >= now() - INTERVAL '30 days'
GROUP BY w.org_id, we.user_id, p.email, p.full_name;

GRANT SELECT ON etl.personal_usage_stats TO authenticated, service_role;
GRANT SELECT ON etl.org_member_usage_stats TO authenticated, service_role;
GRANT SELECT ON etl.org_active_users TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.accounts_update_profile(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.accounts_upsert_preferences(TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS public.accounts_get_profile();
DROP FUNCTION IF EXISTS public.accounts_update_recovery_email(TEXT);
DROP FUNCTION IF EXISTS public.accounts_get_preferences();
DROP FUNCTION IF EXISTS public.accounts_get_my_org_context();
DROP FUNCTION IF EXISTS public.accounts_get_organisation_profile();
DROP FUNCTION IF EXISTS public.accounts_get_org_member_app_assignments();
DROP FUNCTION IF EXISTS public.accounts_get_org_app_seat_summary();
DROP FUNCTION IF EXISTS public.accounts_list_org_audit_events(INTEGER);
DROP FUNCTION IF EXISTS public.get_inventory_stats(UUID);
DROP FUNCTION IF EXISTS public.get_stoqr_dashboard_snapshot(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_stoqr_report_inventory_valuation(UUID);
DROP FUNCTION IF EXISTS public.get_stoqr_report_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_stoqr_alert_products(UUID);
DROP FUNCTION IF EXISTS public.get_stoqr_delivered_alert_events(UUID);
DROP FUNCTION IF EXISTS public.get_stoqr_my_permissions(UUID);
DROP FUNCTION IF EXISTS public.get_org_member_usage_stats(UUID);
DROP FUNCTION IF EXISTS public.get_org_active_users(UUID);
DROP FUNCTION IF EXISTS public.get_personal_usage_stats();

DROP FUNCTION IF EXISTS app_private.accounts_update_profile(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS app_private.accounts_upsert_preferences(TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS app_private.accounts_get_profile();
DROP FUNCTION IF EXISTS app_private.accounts_update_recovery_email(TEXT);
DROP FUNCTION IF EXISTS app_private.accounts_get_preferences();
DROP FUNCTION IF EXISTS app_private.accounts_get_my_org_context();
DROP FUNCTION IF EXISTS app_private.accounts_get_organisation_profile();
DROP FUNCTION IF EXISTS app_private.accounts_get_org_member_app_assignments();
DROP FUNCTION IF EXISTS app_private.accounts_get_org_app_seat_summary();
DROP FUNCTION IF EXISTS app_private.accounts_list_org_audit_events(INTEGER);
DROP FUNCTION IF EXISTS app_private.get_inventory_stats(UUID);
DROP FUNCTION IF EXISTS app_private.get_stoqr_dashboard_snapshot(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS app_private.get_stoqr_report_inventory_valuation(UUID);
DROP FUNCTION IF EXISTS app_private.get_stoqr_report_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS app_private.get_stoqr_alert_products(UUID);
DROP FUNCTION IF EXISTS app_private.get_stoqr_delivered_alert_events(UUID);
DROP FUNCTION IF EXISTS app_private.get_stoqr_my_permissions(UUID);
DROP FUNCTION IF EXISTS app_private.get_org_member_usage_stats(UUID);
DROP FUNCTION IF EXISTS app_private.get_org_active_users(UUID);
DROP FUNCTION IF EXISTS app_private.get_personal_usage_stats();
