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
