-- ============================================================
-- Platform Admin Audit + Global Mutation RPCs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS platform_admin_audit_events_created_at_idx
  ON public.platform_admin_audit_events(created_at DESC);

ALTER TABLE public.platform_admin_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admin_audit_events_select ON public.platform_admin_audit_events;
CREATE POLICY platform_admin_audit_events_select ON public.platform_admin_audit_events
  FOR SELECT USING (public.is_app_super_admin());

GRANT SELECT ON public.platform_admin_audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_platform_admin_event(
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  v_actor_id := auth.uid();

  INSERT INTO public.platform_admin_audit_events (
    actor_user_id,
    action,
    metadata
  )
  VALUES (
    v_actor_id,
    p_action,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_platform_audit_events(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  actor_user_id UUID,
  actor_email TEXT,
  actor_full_name TEXT,
  action TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);

  RETURN QUERY
  SELECT
    e.id,
    e.actor_user_id,
    p.email,
    p.full_name,
    e.action,
    e.metadata,
    e.created_at
  FROM public.platform_admin_audit_events e
  LEFT JOIN public.profiles p ON p.id = e.actor_user_id
  ORDER BY e.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_pricing_plan(
  p_plan_id UUID,
  p_seat_price_cents INTEGER,
  p_is_active BOOLEAN DEFAULT NULL,
  p_stripe_price_id TEXT DEFAULT NULL
)
RETURNS public.admin_pricing_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_pricing_plans%ROWTYPE;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  IF p_seat_price_cents < 0 THEN
    RAISE EXCEPTION 'Seat price must be non-negative';
  END IF;

  UPDATE public.admin_pricing_plans
  SET
    seat_price_cents = p_seat_price_cents,
    is_active = COALESCE(p_is_active, is_active),
    stripe_price_id = COALESCE(p_stripe_price_id, stripe_price_id),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_plan_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pricing plan not found';
  END IF;

  PERFORM public.log_platform_admin_event(
    'pricing_plan_updated',
    jsonb_build_object(
      'plan_id', v_row.id,
      'plan_name', v_row.plan_name,
      'seat_price_cents', v_row.seat_price_cents,
      'is_active', v_row.is_active
    )
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_coupon(
  p_code TEXT,
  p_discount_percent NUMERIC,
  p_duration TEXT DEFAULT 'once',
  p_duration_in_months INTEGER DEFAULT NULL,
  p_stripe_coupon_id TEXT DEFAULT NULL
)
RETURNS public.admin_coupons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_coupons%ROWTYPE;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  IF p_discount_percent <= 0 OR p_discount_percent > 100 THEN
    RAISE EXCEPTION 'Discount percent must be between 0 and 100';
  END IF;

  INSERT INTO public.admin_coupons (
    code,
    discount_percent,
    duration,
    duration_in_months,
    stripe_coupon_id,
    is_active
  )
  VALUES (
    upper(trim(p_code)),
    p_discount_percent,
    p_duration,
    p_duration_in_months,
    p_stripe_coupon_id,
    true
  )
  RETURNING * INTO v_row;

  PERFORM public.log_platform_admin_event(
    'coupon_created',
    jsonb_build_object(
      'coupon_id', v_row.id,
      'code', v_row.code,
      'discount_percent', v_row.discount_percent
    )
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_coupon_active(
  p_coupon_id UUID,
  p_is_active BOOLEAN
)
RETURNS public.admin_coupons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_coupons%ROWTYPE;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  UPDATE public.admin_coupons
  SET is_active = p_is_active
  WHERE id = p_coupon_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon not found';
  END IF;

  PERFORM public.log_platform_admin_event(
    'coupon_status_updated',
    jsonb_build_object(
      'coupon_id', v_row.id,
      'code', v_row.code,
      'is_active', v_row.is_active
    )
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_org_app_seat_summary(p_org_id UUID)
RETURNS TABLE (
  app_code TEXT,
  app_name TEXT,
  seat_limit INTEGER,
  assigned_seats INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    a.code,
    a.name,
    COALESCE(oas.seat_limit, 0),
    COALESCE(assigned.assigned_count, 0)::INTEGER
  FROM public.apps a
  LEFT JOIN public.organisation_app_seats oas
    ON oas.app_code = a.code
   AND oas.org_id = p_org_id
  LEFT JOIN (
    SELECT mas.app_code, COUNT(*) AS assigned_count
    FROM public.organisation_member_app_seats mas
    JOIN public.organisation_members om ON om.id = mas.org_member_id
    WHERE om.org_id = p_org_id
    GROUP BY mas.app_code
  ) assigned ON assigned.app_code = a.code
  ORDER BY a.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_org_seat_limit(
  p_org_id UUID,
  p_app_code TEXT,
  p_seat_limit INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_limit INTEGER;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  IF p_seat_limit < 0 THEN
    RAISE EXCEPTION 'Seat limit must be non-negative';
  END IF;

  SELECT seat_limit INTO v_previous_limit
  FROM public.organisation_app_seats
  WHERE org_id = p_org_id
    AND app_code = p_app_code;

  INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
  VALUES (p_org_id, p_app_code, p_seat_limit)
  ON CONFLICT (org_id, app_code)
  DO UPDATE SET
    seat_limit = EXCLUDED.seat_limit,
    updated_at = timezone('utc'::text, now());

  PERFORM public.log_org_audit_event(
    p_org_id,
    'seat_limit_updated',
    p_app_code,
    NULL,
    jsonb_build_object('from', v_previous_limit, 'to', p_seat_limit, 'source', 'admin')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_revenue_report_summary()
RETURNS TABLE (
  app_code TEXT,
  app_name TEXT,
  seat_limit_total INTEGER,
  estimated_mrr_cents BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  WITH latest_monthly_pricing AS (
    SELECT DISTINCT ON (p.app_code)
      p.app_code,
      p.seat_price_cents
    FROM public.admin_pricing_plans p
    WHERE p.is_active = true
      AND p.billing_interval = 'monthly'
      AND p.app_code IS NOT NULL
    ORDER BY p.app_code, p.updated_at DESC
  )
  SELECT
    a.code AS app_code,
    a.name AS app_name,
    COALESCE(SUM(oas.seat_limit), 0)::INTEGER AS seat_limit_total,
    COALESCE(SUM(oas.seat_limit * COALESCE(lmp.seat_price_cents, 0)), 0)::BIGINT AS estimated_mrr_cents
  FROM public.apps a
  LEFT JOIN public.organisation_app_seats oas ON oas.app_code = a.code
  LEFT JOIN latest_monthly_pricing lmp ON lmp.app_code = a.code
  GROUP BY a.code, a.name
  ORDER BY a.code;
END;
$$;

REVOKE ALL ON FUNCTION public.log_platform_admin_event(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_platform_audit_events(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_pricing_plan(UUID, INTEGER, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_coupon(TEXT, NUMERIC, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_coupon_active(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_org_app_seat_summary(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_org_seat_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_revenue_report_summary() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.log_platform_admin_event(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_platform_audit_events(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_plan(UUID, INTEGER, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_coupon(TEXT, NUMERIC, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_coupon_active(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_org_app_seat_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_org_seat_limit(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_report_summary() TO authenticated;
