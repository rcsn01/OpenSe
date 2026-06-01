-- Platform administration baseline.
--
-- Platform-owned data remains in the public schema so local service-role
-- tooling can manage it. Browser roles receive no table grants or RPC access.

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


-- Squashed from 20260601041817_move_security_definer_helpers_private.sql.

-- Keep privileged predicate implementations out of exposed API schemas.
-- Public facades are SECURITY INVOKER and only remain executable where the app
-- or Edge Functions intentionally use the existing RPC name.
CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_users() SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.has_users()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.has_users();
$$;

ALTER FUNCTION public.is_org_owner(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_owner(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.is_org_member(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_member(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.is_org_admin(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_admin(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.is_org_owner_strictly(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.is_org_owner_strictly(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.is_org_owner_strictly(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.can_manage_org_app_seat_limits(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.can_manage_org_member_app_seats(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.can_manage_org_member_app_seats(p_org_id, p_user_id);
$$;

ALTER FUNCTION public.get_primary_org_for_user(UUID) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.get_primary_org_for_user(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.get_primary_org_for_user(p_user_id);
$$;

ALTER FUNCTION public.has_etl_permission(UUID, TEXT) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.has_etl_permission(_org_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.has_etl_permission(_org_id, _permission_code);
$$;

ALTER FUNCTION public.has_permission(UUID, TEXT) SET SCHEMA app_private;
CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT app_private.has_permission(_company_id, _permission_code);
$$;

REVOKE ALL ON FUNCTION public.has_users() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_owner(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_org_owner_strictly(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_primary_org_for_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_etl_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_users() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_org_owner_strictly(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_primary_org_for_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_etl_permission(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION app_private.has_users() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner_strictly(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_manage_org_app_seat_limits(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.can_manage_org_member_app_seats(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.get_primary_org_for_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_etl_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_private.has_permission(UUID, TEXT) TO authenticated, service_role;


-- Squashed from 20260601044151_facade_remaining_security_definer_rpcs.sql.

-- The remaining authenticated SECURITY DEFINER warnings are app-facing RPCs.
-- Preserve their public RPC names, but move privileged implementations out of
-- exposed schemas and replace them with SECURITY INVOKER facades.
CREATE SCHEMA IF NOT EXISTS app_private;

REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;

DO $$
DECLARE
  target_fn RECORD;
  call_args TEXT;
  body_sql TEXT;
  volatility_sql TEXT;
BEGIN
  FOR target_fn IN
    SELECT
      p.oid,
      p.proname,
      p.pronargs,
      p.proretset,
      p.provolatile,
      pg_get_function_arguments(p.oid) AS function_args,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_function_result(p.oid) AS result_type
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)
  LOOP
    SELECT COALESCE(string_agg('$' || arg_index::text, ', ' ORDER BY arg_index), '')
    INTO call_args
    FROM generate_series(1, target_fn.pronargs) AS arg_index;

    volatility_sql := CASE target_fn.provolatile
      WHEN 'i' THEN 'IMMUTABLE'
      WHEN 's' THEN 'STABLE'
      ELSE 'VOLATILE'
    END;

    IF target_fn.proretset OR target_fn.result_type LIKE 'TABLE(%' THEN
      body_sql := format(
        'SELECT * FROM app_private.%I(%s)',
        target_fn.proname,
        call_args
      );
    ELSE
      body_sql := format(
        'SELECT app_private.%I(%s)',
        target_fn.proname,
        call_args
      );
    END IF;

    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET SCHEMA app_private',
      target_fn.proname,
      target_fn.identity_args
    );

    EXECUTE format(
      $wrapper$
      CREATE OR REPLACE FUNCTION public.%I(%s)
      RETURNS %s
      LANGUAGE sql
      SECURITY INVOKER
      %s
      SET search_path = ''
      AS $function$
        %s;
      $function$;
      $wrapper$,
      target_fn.proname,
      target_fn.function_args,
      target_fn.result_type,
      volatility_sql,
      body_sql
    );

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      target_fn.proname,
      target_fn.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
      target_fn.proname,
      target_fn.identity_args
    );

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION app_private.%I(%s) TO authenticated, service_role',
      target_fn.proname,
      target_fn.identity_args
    );
  END LOOP;
END;
$$;


-- Squashed from 20260601045906_move_relocatable_extensions_and_harden_pg_net.sql.

-- Move relocatable extensions out of the exposed public schema.
-- The API extra_search_path already includes extensions, and existing columns,
-- indexes, and triggers keep OID references to extension objects.
CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION citext SET SCHEMA extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION moddatetime SET SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- pg_net is not relocatable on the linked Supabase project. Its extension
-- record remains in public, but its SQL API is in the net schema; block direct
-- client execution and keep database-owned/service workflows available.
REVOKE ALL ON SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA net TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA net TO service_role;


-- Squashed from 20260601053000_replace_read_rpcs_with_rls_views.sql.

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




-- Squashed from 20260601054500_document_internal_table_deny_all_policies.sql.

-- These tables are service-role/internal only. Explicit deny-all policies keep
-- RLS intent visible to Supabase's linter while preserving client lockout.

CREATE POLICY platform_app_health_snapshots_deny_client_access
ON public.platform_app_health_snapshots
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_audit_events_deny_client_access
ON public.platform_audit_events
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_coupons_deny_client_access
ON public.platform_coupons
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_default_configurations_deny_client_access
ON public.platform_default_configurations
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_feature_flags_deny_client_access
ON public.platform_feature_flags
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_instance_settings_deny_client_access
ON public.platform_instance_settings
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_pricing_plans_deny_client_access
ON public.platform_pricing_plans
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY platform_release_notes_deny_client_access
ON public.platform_release_notes
FOR ALL
USING (false)
WITH CHECK (false);

CREATE POLICY alert_dispatch_config_deny_client_access
ON stoqr.alert_dispatch_config
FOR ALL
USING (false)
WITH CHECK (false);
