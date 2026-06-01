CREATE TABLE public.platform_app_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  uptime_percent NUMERIC(5, 2) NOT NULL CHECK (uptime_percent >= 0 AND uptime_percent <= 100),
  error_spike_level TEXT NOT NULL CHECK (error_spike_level IN ('stable', 'low', 'medium', 'high')),
  active_alert_count INTEGER NOT NULL DEFAULT 0 CHECK (active_alert_count >= 0),
  incident_summary TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX platform_app_health_snapshots_app_code_measured_at_idx
  ON public.platform_app_health_snapshots (app_code, measured_at DESC);

CREATE TABLE public.platform_pricing_plans (
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

CREATE INDEX platform_pricing_plans_active_idx
  ON public.platform_pricing_plans (is_active, app_code, created_at DESC);

INSERT INTO public.platform_pricing_plans (
  id,
  app_code,
  plan_name,
  billing_interval,
  seat_price_cents,
  is_bundle,
  stripe_product_id,
  stripe_price_id,
  is_active
)
VALUES
  ('adadadad-adad-adad-adad-adadadadad01', 'etl', 'ETL Pro', 'monthly', 2900, false, NULL, NULL, true),
  ('adadadad-adad-adad-adad-adadadadad02', 'etl', 'ETL Pro', 'yearly', 2500, false, NULL, NULL, true),
  ('adadadad-adad-adad-adad-adadadadad03', 'stoqr', 'StoQR Growth', 'monthly', 1900, false, NULL, NULL, true),
  ('adadadad-adad-adad-adad-adadadadad04', NULL, 'OpenSe Bundle', 'yearly', 3900, true, NULL, NULL, true)
ON CONFLICT (id) DO UPDATE
SET
  app_code = EXCLUDED.app_code,
  plan_name = EXCLUDED.plan_name,
  billing_interval = EXCLUDED.billing_interval,
  seat_price_cents = EXCLUDED.seat_price_cents,
  is_bundle = EXCLUDED.is_bundle,
  is_active = EXCLUDED.is_active;

CREATE TABLE public.platform_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5, 2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  duration TEXT NOT NULL DEFAULT 'once' CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER,
  stripe_coupon_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX platform_coupons_active_idx
  ON public.platform_coupons (is_active, created_at DESC);

CREATE TABLE public.platform_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX platform_audit_events_created_at_idx
  ON public.platform_audit_events (created_at DESC);

CREATE TABLE public.platform_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  flag_key TEXT NOT NULL UNIQUE,
  rollout_status TEXT NOT NULL CHECK (rollout_status IN ('enabled', 'disabled', 'beta')),
  audience TEXT NOT NULL DEFAULT 'All organisations',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX platform_feature_flags_app_code_idx
  ON public.platform_feature_flags (app_code, updated_at DESC);

CREATE TABLE public.platform_default_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (app_code, config_key)
);

CREATE INDEX platform_default_configurations_app_code_idx
  ON public.platform_default_configurations (app_code, updated_at DESC);

CREATE TABLE public.platform_release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  version TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX platform_release_notes_app_code_idx
  ON public.platform_release_notes (app_code, published_at DESC);

ALTER TABLE public.platform_app_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_default_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_release_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_app_health_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_pricing_plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_coupons FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_audit_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_feature_flags FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_default_configurations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_release_notes FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.platform_app_health_snapshots TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_pricing_plans TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_coupons TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_audit_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_feature_flags TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_default_configurations TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_release_notes TO service_role;
