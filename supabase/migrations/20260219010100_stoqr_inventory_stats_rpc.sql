-- ============================================================
-- StoQR RPC: Inventory stats aggregation
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_inventory_stats(target_company_id UUID)
RETURNS TABLE(total_items BIGINT, low_stock_items BIGINT, total_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'products.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    count(*)::BIGINT AS total_items,
    count(*) FILTER (WHERE coalesce(p.quantity_on_hand, 0) <= coalesce(p.reorder_point, 0))::BIGINT AS low_stock_items,
    coalesce(sum(coalesce(p.quantity_on_hand, 0) * coalesce(p.cost_price, 0)), 0)::NUMERIC AS total_value
  FROM stoqr.products p
  WHERE p.company_id = target_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_inventory_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_inventory_stats(UUID) TO authenticated;

-- ============================================================
-- StoQR RPC: Dashboard snapshot
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_stoqr_dashboard_snapshot(
  target_company_id UUID,
  p_days INTEGER DEFAULT 30,
  p_activity_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_activity_limit INTEGER := LEAST(GREATEST(COALESCE(p_activity_limit, 10), 1), 100);
  v_result JSONB;
BEGIN
  IF NOT (
    public.has_permission(target_company_id, 'dashboard.view')
    OR public.has_permission(target_company_id, 'products.view')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH
  product_stats AS (
    SELECT
      coalesce(sum(coalesce(p.quantity_on_hand, 0) * coalesce(p.cost_price, 0)), 0)::NUMERIC AS total_inventory_value,
      coalesce(sum(coalesce(p.quantity_on_hand, 0)), 0)::BIGINT AS total_stock_units,
      count(*) FILTER (
        WHERE coalesce(p.quantity_on_hand, 0) <= coalesce(NULLIF(p.min_stock_level, 0), p.reorder_point, 0)
      )::BIGINT AS low_stock_items,
      count(*) FILTER (WHERE coalesce(p.quantity_on_hand, 0) <= 0)::BIGINT AS out_of_stock_items
    FROM stoqr.products p
    WHERE p.company_id = target_company_id
      AND p.deleted_at IS NULL
  ),
  pending_orders AS (
    SELECT count(*)::BIGINT AS pending_orders
    FROM stoqr.purchase_orders po
    WHERE po.company_id = target_company_id
      AND po.status IN ('draft', 'sent', 'partial')
  ),
  alert_counts AS (
    SELECT
      count(*) FILTER (WHERE ae.status = 'open')::BIGINT AS open_alerts,
      count(*) FILTER (WHERE ae.status = 'open' AND ae.alert_type = 'low_stock')::BIGINT AS low_stock_alerts,
      count(*) FILTER (WHERE ae.status = 'open' AND ae.alert_type = 'reorder_point')::BIGINT AS reorder_alerts,
      count(*) FILTER (WHERE ae.status = 'open' AND ae.alert_type = 'expiration')::BIGINT AS expiration_alerts,
      count(*) FILTER (WHERE ae.status = 'open' AND ae.severity = 'critical')::BIGINT AS critical_alerts
    FROM stoqr.alert_events ae
    WHERE ae.company_id = target_company_id
  ),
  inventory_trend AS (
    SELECT
      date_trunc('day', it.created_at)::date AS day,
      sum(it.quantity_change)::NUMERIC AS delta
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
      AND it.created_at >= (timezone('utc'::text, now()) - make_interval(days => v_days))
    GROUP BY 1
    ORDER BY 1
  ),
  usage_trend AS (
    SELECT
      date_trunc('day', it.created_at)::date AS day,
      sum(abs(it.quantity_change))::NUMERIC AS usage
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
      AND it.transaction_type IN ('sale', 'loss', 'scan_out')
      AND it.created_at >= (timezone('utc'::text, now()) - make_interval(days => v_days))
    GROUP BY 1
    ORDER BY 1
  ),
  recent_activity AS (
    SELECT jsonb_build_object(
      'id', ae.id,
      'event_type', ae.event_type,
      'entity_type', ae.entity_type,
      'entity_id', ae.entity_id,
      'message', ae.message,
      'metadata', ae.metadata,
      'created_at', ae.created_at,
      'actor', jsonb_build_object(
        'id', prof.id,
        'full_name', prof.full_name,
        'username', prof.username,
        'email', prof.email
      )
    ) AS row_json
    FROM stoqr.activity_events ae
    LEFT JOIN public.profiles prof ON prof.id = ae.actor_user_id
    WHERE ae.company_id = target_company_id
    ORDER BY ae.created_at DESC
    LIMIT v_activity_limit
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_inventory_value', ps.total_inventory_value,
      'total_stock_units', ps.total_stock_units,
      'low_stock_items', ps.low_stock_items,
      'out_of_stock_items', ps.out_of_stock_items,
      'pending_orders', po.pending_orders,
      'open_alerts', ac.open_alerts
    ),
    'alerts_summary', jsonb_build_object(
      'open_alerts', ac.open_alerts,
      'critical_alerts', ac.critical_alerts,
      'low_stock_alerts', ac.low_stock_alerts,
      'reorder_alerts', ac.reorder_alerts,
      'expiration_alerts', ac.expiration_alerts
    ),
    'charts', jsonb_build_object(
      'inventory_trend', coalesce((SELECT jsonb_agg(jsonb_build_object('day', day, 'delta', delta) ORDER BY day) FROM inventory_trend), '[]'::jsonb),
      'usage_trend', coalesce((SELECT jsonb_agg(jsonb_build_object('day', day, 'usage', usage) ORDER BY day) FROM usage_trend), '[]'::jsonb)
    ),
    'recent_activity', coalesce((SELECT jsonb_agg(row_json) FROM recent_activity), '[]'::jsonb)
  )
  INTO v_result
  FROM product_stats ps
  CROSS JOIN pending_orders po
  CROSS JOIN alert_counts ac;

  RETURN coalesce(v_result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_stoqr_dashboard_snapshot(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stoqr_dashboard_snapshot(UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================
-- StoQR RPCs: Reports datasets + export request
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_stoqr_report_inventory_valuation(target_company_id UUID)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  name TEXT,
  category TEXT,
  location TEXT,
  quantity_on_hand INTEGER,
  min_stock_level INTEGER,
  reorder_point INTEGER,
  cost_price NUMERIC,
  selling_price NUMERIC,
  inventory_value NUMERIC,
  potential_revenue NUMERIC,
  margin_per_unit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    coalesce(pc.name, p.category) AS category,
    il.name AS location,
    coalesce(p.quantity_on_hand, 0) AS quantity_on_hand,
    coalesce(p.min_stock_level, 0) AS min_stock_level,
    coalesce(p.reorder_point, 0) AS reorder_point,
    coalesce(p.cost_price, 0)::NUMERIC AS cost_price,
    coalesce(p.selling_price, 0)::NUMERIC AS selling_price,
    (coalesce(p.quantity_on_hand, 0) * coalesce(p.cost_price, 0))::NUMERIC AS inventory_value,
    (coalesce(p.quantity_on_hand, 0) * coalesce(p.selling_price, 0))::NUMERIC AS potential_revenue,
    (coalesce(p.selling_price, 0) - coalesce(p.cost_price, 0))::NUMERIC AS margin_per_unit
  FROM stoqr.products p
  LEFT JOIN stoqr.product_categories pc ON pc.id = p.category_id
  LEFT JOIN stoqr.inventory_locations il ON il.id = p.location_id
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stoqr_report_stock_movements(
  target_company_id UUID,
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  created_at TIMESTAMPTZ,
  transaction_type TEXT,
  source TEXT,
  quantity_change INTEGER,
  stock_after INTEGER,
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  performed_by UUID,
  performer_name TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    it.id,
    it.created_at,
    it.transaction_type,
    it.source,
    it.quantity_change,
    it.stock_after,
    p.id,
    p.sku,
    p.name,
    it.performed_by,
    coalesce(pr.full_name, pr.username, pr.email) AS performer_name,
    it.notes
  FROM stoqr.inventory_transactions it
  JOIN stoqr.products p ON p.id = it.product_id
  LEFT JOIN public.profiles pr ON pr.id = it.performed_by
  WHERE it.company_id = target_company_id
    AND (p_start IS NULL OR it.created_at >= p_start)
    AND (p_end IS NULL OR it.created_at <= p_end)
  ORDER BY it.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stoqr_report_usage_depletion(
  target_company_id UUID,
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  opening_stock INTEGER,
  current_stock INTEGER,
  total_inbound INTEGER,
  total_outbound INTEGER,
  net_change INTEGER,
  avg_daily_usage NUMERIC,
  days_of_stock_remaining NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_start TIMESTAMPTZ := coalesce(p_start, timezone('utc'::text, now()) - interval '30 days');
  v_end TIMESTAMPTZ := coalesce(p_end, timezone('utc'::text, now()));
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH tx AS (
    SELECT
      it.product_id,
      sum(CASE WHEN it.quantity_change > 0 THEN it.quantity_change ELSE 0 END)::INTEGER AS total_inbound,
      sum(CASE WHEN it.quantity_change < 0 THEN abs(it.quantity_change) ELSE 0 END)::INTEGER AS total_outbound,
      sum(it.quantity_change)::INTEGER AS net_change
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
      AND it.created_at >= v_start
      AND it.created_at <= v_end
    GROUP BY it.product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    (coalesce(p.quantity_on_hand, 0) - coalesce(tx.net_change, 0))::INTEGER AS opening_stock,
    coalesce(p.quantity_on_hand, 0)::INTEGER AS current_stock,
    coalesce(tx.total_inbound, 0)::INTEGER AS total_inbound,
    coalesce(tx.total_outbound, 0)::INTEGER AS total_outbound,
    coalesce(tx.net_change, 0)::INTEGER AS net_change,
    CASE
      WHEN EXTRACT(EPOCH FROM (v_end - v_start)) <= 0 THEN 0
      ELSE round((coalesce(tx.total_outbound, 0)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (v_end - v_start)) / 86400.0, 1)), 2)
    END AS avg_daily_usage,
    CASE
      WHEN coalesce(tx.total_outbound, 0) <= 0 THEN NULL
      ELSE round(
        coalesce(p.quantity_on_hand, 0)::NUMERIC /
        GREATEST((coalesce(tx.total_outbound, 0)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (v_end - v_start)) / 86400.0, 1)), 0.000001),
        2
      )
    END AS days_of_stock_remaining
  FROM stoqr.products p
  LEFT JOIN tx ON tx.product_id = p.id
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stoqr_report_reorder_analysis(target_company_id UUID)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  quantity_on_hand INTEGER,
  min_stock_level INTEGER,
  reorder_point INTEGER,
  max_stock_level INTEGER,
  reorder_status TEXT,
  suggested_reorder_qty INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    coalesce(p.quantity_on_hand, 0)::INTEGER AS quantity_on_hand,
    coalesce(p.min_stock_level, 0)::INTEGER AS min_stock_level,
    coalesce(p.reorder_point, 0)::INTEGER AS reorder_point,
    coalesce(p.max_stock_level, coalesce(p.reorder_point, 0))::INTEGER AS max_stock_level,
    CASE
      WHEN coalesce(p.quantity_on_hand, 0) <= coalesce(p.min_stock_level, 0) THEN 'critical'
      WHEN coalesce(p.quantity_on_hand, 0) <= coalesce(p.reorder_point, 0) THEN 'reorder'
      ELSE 'ok'
    END AS reorder_status,
    GREATEST(
      coalesce(p.max_stock_level, coalesce(p.reorder_point, 0)) - coalesce(p.quantity_on_hand, 0),
      0
    )::INTEGER AS suggested_reorder_qty
  FROM stoqr.products p
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stoqr_report_dead_stock(
  target_company_id UUID,
  p_inactive_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  quantity_on_hand INTEGER,
  inventory_value NUMERIC,
  last_movement_at TIMESTAMPTZ,
  days_since_last_movement INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_inactive_days INTEGER := LEAST(GREATEST(COALESCE(p_inactive_days, 90), 1), 3650);
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH last_movement AS (
    SELECT
      it.product_id,
      max(it.created_at) AS last_movement_at
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
    GROUP BY it.product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    coalesce(p.quantity_on_hand, 0)::INTEGER AS quantity_on_hand,
    (coalesce(p.quantity_on_hand, 0) * coalesce(p.cost_price, 0))::NUMERIC AS inventory_value,
    lm.last_movement_at,
    coalesce((EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - lm.last_movement_at)) / 86400)::INTEGER, 999999) AS days_since_last_movement
  FROM stoqr.products p
  LEFT JOIN last_movement lm ON lm.product_id = p.id
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
    AND coalesce(p.quantity_on_hand, 0) > 0
    AND (
      lm.last_movement_at IS NULL
      OR lm.last_movement_at <= timezone('utc'::text, now()) - make_interval(days => v_inactive_days)
    )
  ORDER BY days_since_last_movement DESC, p.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_stoqr_report_export(
  target_company_id UUID,
  p_report_type TEXT,
  p_export_format TEXT,
  p_date_range_start DATE DEFAULT NULL,
  p_date_range_end DATE DEFAULT NULL,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_export_id UUID;
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.export') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO stoqr.report_exports (
    company_id,
    report_type,
    export_format,
    date_range_start,
    date_range_end,
    filters,
    status,
    requested_by
  )
  VALUES (
    target_company_id,
    p_report_type,
    lower(p_export_format),
    p_date_range_start,
    p_date_range_end,
    coalesce(p_filters, '{}'::jsonb),
    'pending',
    auth.uid()
  )
  RETURNING id INTO v_export_id;

  RETURN v_export_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_stoqr_report_inventory_valuation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_usage_depletion(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_reorder_analysis(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_dead_stock(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_stoqr_report_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_stoqr_report_inventory_valuation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_usage_depletion(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_reorder_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_dead_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stoqr_report_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) TO authenticated;

-- ============================================================
-- StoQR RPC: Alerts product dataset
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_stoqr_alert_products(target_company_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  quantity_on_hand INTEGER,
  reorder_point INTEGER,
  expiry_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT (
    public.has_permission(target_company_id, 'alerts.view')
    OR public.has_permission(target_company_id, 'products.view')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    coalesce(p.quantity_on_hand, 0)::INTEGER,
    coalesce(p.reorder_point, 0)::INTEGER,
    p.expiry_date
  FROM stoqr.products p
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_stoqr_alert_products(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_stoqr_alert_products(UUID) TO authenticated;
