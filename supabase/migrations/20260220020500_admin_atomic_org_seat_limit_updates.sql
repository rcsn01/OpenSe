CREATE OR REPLACE FUNCTION public.admin_update_org_seat_limits(
  p_org_id UUID,
  p_etl_seat_limit INTEGER,
  p_stoqr_seat_limit INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  PERFORM public.admin_update_org_seat_limit(p_org_id, 'etl', p_etl_seat_limit);
  PERFORM public.admin_update_org_seat_limit(p_org_id, 'stoqr', p_stoqr_seat_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_org_seat_limits(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_org_seat_limits(UUID, INTEGER, INTEGER) TO authenticated;
