-- Admin domain baseline.
--
-- Admin remains a logical public-schema domain. Direct table mutations are intentionally
-- denied; changes flow through explicit SECURITY DEFINER admin RPCs or service workflows.

CREATE TABLE public.admin_app_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  uptime_percent NUMERIC(5, 2) NOT NULL CHECK (uptime_percent >= 0 AND uptime_percent <= 100),
  error_spike_level TEXT NOT NULL CHECK (error_spike_level IN ('stable', 'low', 'medium', 'high')),
  active_alert_count INTEGER NOT NULL DEFAULT 0 CHECK (active_alert_count >= 0),
  incident_summary TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX admin_app_health_snapshots_app_code_measured_at_idx
  ON public.admin_app_health_snapshots (app_code, measured_at DESC);

CREATE TABLE public.admin_pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  plan_name TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
  seat_price_cents INTEGER NOT NULL CHECK (seat_price_cents >= 0),
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX admin_pricing_plans_active_idx
  ON public.admin_pricing_plans (is_active, app_code, created_at DESC);

CREATE TABLE public.admin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  duration TEXT NOT NULL DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER,
  stripe_coupon_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX admin_coupons_active_idx
  ON public.admin_coupons (is_active, created_at DESC);

CREATE TABLE public.platform_admin_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX platform_admin_audit_events_created_at_idx
  ON public.platform_admin_audit_events (created_at DESC);

CREATE TABLE public.admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  flag_key TEXT NOT NULL UNIQUE,
  rollout_status TEXT NOT NULL CHECK (rollout_status IN ('enabled', 'disabled', 'beta')),
  audience TEXT NOT NULL DEFAULT 'All organisations',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX admin_feature_flags_app_code_idx
  ON public.admin_feature_flags (app_code, updated_at DESC);

CREATE TABLE public.admin_default_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (app_code, config_key)
);

CREATE INDEX admin_default_configurations_app_code_idx
  ON public.admin_default_configurations (app_code, updated_at DESC);

CREATE TABLE public.admin_release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  version TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX admin_release_notes_app_code_idx
  ON public.admin_release_notes (app_code, published_at DESC);

ALTER TABLE public.admin_app_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admin_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_default_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_release_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_app_health_snapshots_select ON public.admin_app_health_snapshots
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY admin_pricing_plans_select ON public.admin_pricing_plans
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY admin_coupons_select ON public.admin_coupons
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY platform_admin_audit_events_select ON public.platform_admin_audit_events
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY admin_feature_flags_select ON public.admin_feature_flags
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY admin_default_configurations_select ON public.admin_default_configurations
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY admin_release_notes_select ON public.admin_release_notes
  FOR SELECT USING (public.is_app_super_admin());

CREATE FUNCTION public.log_platform_admin_event(
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
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

  INSERT INTO public.platform_admin_audit_events (
    actor_user_id,
    action,
    metadata
  )
  VALUES (
    auth.uid(),
    p_action,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE FUNCTION public.admin_list_platform_audit_events(p_limit INTEGER DEFAULT 100)
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

CREATE FUNCTION public.admin_list_organisations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  owner_email TEXT,
  owner_full_name TEXT,
  member_count BIGINT,
  status TEXT
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
    o.id,
    o.name,
    o.created_at,
    p.email,
    p.full_name,
    COUNT(om.id) AS member_count,
    o.status
  FROM public.organisations o
  LEFT JOIN public.profiles p ON p.id = o.owner_id
  LEFT JOIN public.organisation_members om ON om.org_id = o.id
  GROUP BY o.id, o.name, o.created_at, p.email, p.full_name, o.status
  ORDER BY o.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  is_super_admin BOOLEAN,
  memberships JSONB
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
    p.id,
    p.email,
    p.full_name,
    p.created_at,
    EXISTS (
      SELECT 1
      FROM public.super_admin_members sam
      WHERE sam.user_id = p.id
    ) AS is_super_admin,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'org_id', om.org_id,
            'org_name', o.name,
            'role', om.role
          )
          ORDER BY o.name
        )
        FROM public.organisation_members om
        JOIN public.organisations o ON o.id = om.org_id
        WHERE om.user_id = p.id
      ),
      '[]'::jsonb
    ) AS memberships
  FROM public.profiles p
  ORDER BY p.email NULLS LAST, p.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_list_organisation_members(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  email TEXT,
  full_name TEXT
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
    om.id,
    om.user_id,
    om.role,
    p.email,
    p.full_name
  FROM public.organisation_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.org_id = p_org_id
  ORDER BY om.created_at;
END;
$$;

CREATE FUNCTION public.admin_list_stoqr_organisations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.created_at,
    COUNT(cm.id) AS member_count
  FROM public.organisations o
  LEFT JOIN stoqr.organisation_member_roles cm ON cm.company_id = o.id
  GROUP BY o.id, o.name, o.created_at
  ORDER BY o.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_list_stoqr_company_members(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  joined_at TIMESTAMPTZ,
  role_name TEXT,
  full_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    cm.id,
    cm.user_id,
    cm.joined_at,
    r.name,
    p.full_name,
    p.email
  FROM stoqr.organisation_member_roles cm
  LEFT JOIN stoqr.roles r ON r.id = cm.role_id
  LEFT JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.company_id = p_company_id
  ORDER BY cm.joined_at;
END;
$$;

CREATE FUNCTION public.admin_list_audit_events(p_org_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  actor_user_id UUID,
  actor_email TEXT,
  actor_full_name TEXT,
  action TEXT,
  app_code TEXT,
  target_org_member_id UUID,
  target_user_email TEXT,
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
    e.org_id,
    o.name,
    e.actor_user_id,
    actor_profile.email,
    actor_profile.full_name,
    e.action,
    e.app_code,
    e.target_org_member_id,
    target_profile.email,
    e.metadata,
    e.created_at
  FROM public.organisation_audit_events e
  JOIN public.organisations o ON o.id = e.org_id
  LEFT JOIN public.profiles actor_profile ON actor_profile.id = e.actor_user_id
  LEFT JOIN public.organisation_members target_member ON target_member.id = e.target_org_member_id
  LEFT JOIN public.profiles target_profile ON target_profile.id = target_member.user_id
  WHERE p_org_id IS NULL OR e.org_id = p_org_id
  ORDER BY e.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE FUNCTION public.admin_list_etl_workflows(p_only_templates BOOLEAN DEFAULT false)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  owner_id UUID,
  org_id UUID,
  is_template BOOLEAN,
  node_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    w.created_at,
    w.owner_id,
    w.org_id,
    w.is_template,
    COALESCE(jsonb_array_length(COALESCE(w.graph_data->'nodes', '[]'::jsonb)), 0)::INTEGER
  FROM etl.workflows w
  WHERE (NOT p_only_templates) OR w.is_template = true
  ORDER BY w.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_set_etl_workflow_template_status(
  p_workflow_id UUID,
  p_is_template BOOLEAN
)
RETURNS TABLE (
  id UUID,
  is_template BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
DECLARE
  v_id UUID;
  v_is_template BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  UPDATE etl.workflows w
  SET is_template = p_is_template
  WHERE w.id = p_workflow_id
  RETURNING w.id, w.is_template
  INTO v_id, v_is_template;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow not found';
  END IF;

  PERFORM public.log_platform_admin_event(
    'etl_workflow_template_status_updated',
    jsonb_build_object(
      'workflow_id', v_id,
      'is_template', v_is_template
    )
  );

  RETURN QUERY
  SELECT v_id, v_is_template;
END;
$$;

CREATE FUNCTION public.admin_list_system_health()
RETURNS TABLE (
  app_code TEXT,
  uptime_percent NUMERIC,
  error_spike_level TEXT,
  active_alert_count INTEGER,
  incident_summary TEXT,
  measured_at TIMESTAMPTZ
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
    latest.app_code,
    latest.uptime_percent,
    latest.error_spike_level,
    latest.active_alert_count,
    latest.incident_summary,
    latest.measured_at
  FROM (
    SELECT DISTINCT ON (s.app_code)
      s.app_code,
      s.uptime_percent,
      s.error_spike_level,
      s.active_alert_count,
      s.incident_summary,
      s.measured_at
    FROM public.admin_app_health_snapshots s
    ORDER BY s.app_code, s.measured_at DESC
  ) AS latest
  ORDER BY latest.app_code;
END;
$$;

CREATE FUNCTION public.admin_list_pricing_plans()
RETURNS TABLE (
  id UUID,
  app_code TEXT,
  plan_name TEXT,
  billing_interval TEXT,
  seat_price_cents INTEGER,
  is_bundle BOOLEAN,
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
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
    p.id,
    p.app_code,
    p.plan_name,
    p.billing_interval,
    p.seat_price_cents,
    p.is_bundle,
    p.stripe_product_id,
    p.stripe_price_id,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM public.admin_pricing_plans p
  ORDER BY p.is_active DESC, p.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_list_coupons()
RETURNS TABLE (
  id UUID,
  code TEXT,
  discount_percent NUMERIC,
  duration TEXT,
  duration_in_months INTEGER,
  stripe_coupon_id TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
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
    c.id,
    c.code,
    c.discount_percent,
    c.duration,
    c.duration_in_months,
    c.stripe_coupon_id,
    c.is_active,
    c.created_at
  FROM public.admin_coupons c
  ORDER BY c.is_active DESC, c.created_at DESC;
END;
$$;

CREATE FUNCTION public.admin_update_pricing_plan(
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

CREATE FUNCTION public.admin_create_coupon(
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

CREATE FUNCTION public.admin_set_coupon_active(
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

CREATE FUNCTION public.admin_list_org_app_seat_summary(p_org_id UUID)
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
  ) AS assigned ON assigned.app_code = a.code
  ORDER BY a.code;
END;
$$;

CREATE FUNCTION public.admin_update_org_seat_limit(
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

  SELECT seat_limit
  INTO v_previous_limit
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

  PERFORM public.log_platform_admin_event(
    'org_seat_limit_updated',
    jsonb_build_object(
      'org_id', p_org_id,
      'app_code', p_app_code,
      'from', v_previous_limit,
      'to', p_seat_limit
    )
  );
END;
$$;

CREATE FUNCTION public.admin_update_org_seat_limits(
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

CREATE FUNCTION public.admin_get_revenue_report_summary()
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
    a.code,
    a.name,
    COALESCE(SUM(oas.seat_limit), 0)::INTEGER,
    COALESCE(SUM(oas.seat_limit * COALESCE(lmp.seat_price_cents, 0)), 0)::BIGINT
  FROM public.apps a
  LEFT JOIN public.organisation_app_seats oas ON oas.app_code = a.code
  LEFT JOIN latest_monthly_pricing lmp ON lmp.app_code = a.code
  GROUP BY a.code, a.name
  ORDER BY a.code;
END;
$$;

CREATE FUNCTION public.admin_list_feature_flags(p_app_code TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  app_code TEXT,
  flag_key TEXT,
  rollout_status TEXT,
  audience TEXT,
  updated_at TIMESTAMPTZ
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
    f.id,
    f.app_code,
    f.flag_key,
    f.rollout_status,
    f.audience,
    f.updated_at
  FROM public.admin_feature_flags f
  WHERE p_app_code IS NULL OR f.app_code = p_app_code
  ORDER BY f.updated_at DESC;
END;
$$;

CREATE FUNCTION public.admin_update_feature_flag(
  p_flag_id UUID,
  p_rollout_status TEXT,
  p_audience TEXT DEFAULT NULL
)
RETURNS public.admin_feature_flags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_feature_flags%ROWTYPE;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  UPDATE public.admin_feature_flags
  SET
    rollout_status = p_rollout_status,
    audience = COALESCE(p_audience, audience),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_flag_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature flag not found';
  END IF;

  PERFORM public.log_platform_admin_event(
    'feature_flag_updated',
    jsonb_build_object(
      'flag_id', v_row.id,
      'flag_key', v_row.flag_key,
      'rollout_status', v_row.rollout_status,
      'audience', v_row.audience
    )
  );

  RETURN v_row;
END;
$$;

CREATE FUNCTION public.admin_list_default_configurations(p_app_code TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  app_code TEXT,
  config_key TEXT,
  config_value TEXT,
  updated_at TIMESTAMPTZ
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
    c.id,
    c.app_code,
    c.config_key,
    c.config_value,
    c.updated_at
  FROM public.admin_default_configurations c
  WHERE p_app_code IS NULL OR c.app_code = p_app_code
  ORDER BY c.updated_at DESC;
END;
$$;

CREATE FUNCTION public.admin_upsert_default_configuration(
  p_app_code TEXT,
  p_config_key TEXT,
  p_config_value TEXT
)
RETURNS public.admin_default_configurations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.admin_default_configurations%ROWTYPE;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  INSERT INTO public.admin_default_configurations (
    app_code,
    config_key,
    config_value,
    updated_at
  )
  VALUES (
    p_app_code,
    p_config_key,
    p_config_value,
    timezone('utc'::text, now())
  )
  ON CONFLICT (app_code, config_key)
  DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_row;

  PERFORM public.log_platform_admin_event(
    'default_configuration_upserted',
    jsonb_build_object(
      'app_code', v_row.app_code,
      'config_key', v_row.config_key,
      'config_value', v_row.config_value
    )
  );

  RETURN v_row;
END;
$$;

CREATE FUNCTION public.admin_list_release_notes(p_app_code TEXT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  app_code TEXT,
  version TEXT,
  summary TEXT,
  published_at TIMESTAMPTZ
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
    r.id,
    r.app_code,
    r.version,
    r.summary,
    r.published_at
  FROM public.admin_release_notes r
  WHERE p_app_code IS NULL OR r.app_code = p_app_code
  ORDER BY r.published_at DESC;
END;
$$;

CREATE FUNCTION public.admin_list_org_member_seat_assignments(p_org_id UUID)
RETURNS TABLE (
  org_member_id UUID,
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  app_codes TEXT[]
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
    om.id,
    om.user_id,
    p.email,
    p.full_name,
    om.role,
    COALESCE(array_agg(omas.app_code ORDER BY omas.app_code) FILTER (WHERE omas.app_code IS NOT NULL), ARRAY[]::TEXT[])
  FROM public.organisation_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.organisation_member_app_seats omas ON omas.org_member_id = om.id
  WHERE om.org_id = p_org_id
  GROUP BY om.id, om.user_id, p.email, p.full_name, om.role
  ORDER BY COALESCE(p.full_name, p.email, om.user_id::TEXT);
END;
$$;

GRANT SELECT ON TABLE public.admin_app_health_snapshots TO authenticated;
GRANT SELECT ON TABLE public.admin_pricing_plans TO authenticated;
GRANT SELECT ON TABLE public.admin_coupons TO authenticated;
GRANT SELECT ON TABLE public.platform_admin_audit_events TO authenticated;
GRANT SELECT ON TABLE public.admin_feature_flags TO authenticated;
GRANT SELECT ON TABLE public.admin_default_configurations TO authenticated;
GRANT SELECT ON TABLE public.admin_release_notes TO authenticated;

GRANT ALL PRIVILEGES ON TABLE public.admin_app_health_snapshots TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_pricing_plans TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_coupons TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_admin_audit_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_feature_flags TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_default_configurations TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_release_notes TO service_role;

REVOKE ALL ON FUNCTION public.log_platform_admin_event(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_platform_audit_events(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_organisations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_organisation_members(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_stoqr_organisations() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_stoqr_company_members(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_audit_events(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_etl_workflows(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_etl_workflow_template_status(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_system_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_pricing_plans() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_coupons() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_pricing_plan(UUID, INTEGER, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_coupon(TEXT, NUMERIC, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_coupon_active(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_org_app_seat_summary(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_org_seat_limit(UUID, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_org_seat_limits(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_revenue_report_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_feature_flags(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_feature_flag(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_default_configurations(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_upsert_default_configuration(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_release_notes(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_org_member_seat_assignments(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.log_platform_admin_event(TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_platform_audit_events(INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_organisations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_organisation_members(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_stoqr_organisations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_stoqr_company_members(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_events(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_etl_workflows(BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_etl_workflow_template_status(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_system_health() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_pricing_plans() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_coupons() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_pricing_plan(UUID, INTEGER, BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_coupon(TEXT, NUMERIC, TEXT, INTEGER, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_coupon_active(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_org_app_seat_summary(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_org_seat_limit(UUID, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_org_seat_limits(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_revenue_report_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_feature_flags(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_feature_flag(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_default_configurations(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_default_configuration(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_release_notes(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_org_member_seat_assignments(UUID) TO authenticated, service_role;