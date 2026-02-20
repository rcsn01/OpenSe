-- ============================================================
-- Admin Financial Catalog (Pricing + Coupons)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_pricing_plans (
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

CREATE INDEX IF NOT EXISTS admin_pricing_plans_active_idx
  ON public.admin_pricing_plans(is_active, app_code, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  duration TEXT NOT NULL DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER,
  stripe_coupon_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS admin_coupons_active_idx
  ON public.admin_coupons(is_active, created_at DESC);

ALTER TABLE public.admin_pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_pricing_plans_select ON public.admin_pricing_plans;
CREATE POLICY admin_pricing_plans_select ON public.admin_pricing_plans
  FOR SELECT USING (public.is_app_super_admin());

DROP POLICY IF EXISTS admin_coupons_select ON public.admin_coupons;
CREATE POLICY admin_coupons_select ON public.admin_coupons
  FOR SELECT USING (public.is_app_super_admin());

GRANT SELECT ON public.admin_pricing_plans TO authenticated;
GRANT SELECT ON public.admin_coupons TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_pricing_plans()
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

CREATE OR REPLACE FUNCTION public.admin_list_coupons()
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

REVOKE ALL ON FUNCTION public.admin_list_pricing_plans() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_coupons() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_pricing_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_coupons() TO authenticated;
