-- ============================================================
-- Admin Application Management Tables + RPCs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  flag_key TEXT NOT NULL UNIQUE,
  rollout_status TEXT NOT NULL CHECK (rollout_status IN ('enabled', 'disabled', 'beta')),
  audience TEXT NOT NULL DEFAULT 'All organisations',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.admin_default_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(app_code, config_key)
);

CREATE TABLE IF NOT EXISTS public.admin_release_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT REFERENCES public.apps(code) ON DELETE CASCADE,
  version TEXT NOT NULL,
  summary TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS admin_feature_flags_app_code_idx
  ON public.admin_feature_flags(app_code, updated_at DESC);

CREATE INDEX IF NOT EXISTS admin_default_configurations_app_code_idx
  ON public.admin_default_configurations(app_code, updated_at DESC);

CREATE INDEX IF NOT EXISTS admin_release_notes_app_code_idx
  ON public.admin_release_notes(app_code, published_at DESC);

ALTER TABLE public.admin_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_default_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_release_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_feature_flags_select ON public.admin_feature_flags;
CREATE POLICY admin_feature_flags_select ON public.admin_feature_flags
  FOR SELECT USING (public.is_app_super_admin());

DROP POLICY IF EXISTS admin_default_configurations_select ON public.admin_default_configurations;
CREATE POLICY admin_default_configurations_select ON public.admin_default_configurations
  FOR SELECT USING (public.is_app_super_admin());

DROP POLICY IF EXISTS admin_release_notes_select ON public.admin_release_notes;
CREATE POLICY admin_release_notes_select ON public.admin_release_notes
  FOR SELECT USING (public.is_app_super_admin());

GRANT SELECT ON public.admin_feature_flags TO authenticated;
GRANT SELECT ON public.admin_default_configurations TO authenticated;
GRANT SELECT ON public.admin_release_notes TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_feature_flags(p_app_code TEXT DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION public.admin_update_feature_flag(
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

CREATE OR REPLACE FUNCTION public.admin_list_default_configurations(p_app_code TEXT DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION public.admin_upsert_default_configuration(
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

CREATE OR REPLACE FUNCTION public.admin_list_release_notes(p_app_code TEXT DEFAULT NULL)
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

REVOKE ALL ON FUNCTION public.admin_list_feature_flags(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_feature_flag(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_default_configurations(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_upsert_default_configuration(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_release_notes(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_feature_flags(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_feature_flag(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_default_configurations(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_default_configuration(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_release_notes(TEXT) TO authenticated;

INSERT INTO public.admin_feature_flags (app_code, flag_key, rollout_status, audience)
VALUES
  ('etl', 'etl.ai-assisted-transformations', 'beta', 'Beta cohort'),
  ('etl', 'etl.bulk-template-publish', 'enabled', 'All organisations'),
  ('stoqr', 'stoqr.inventory-anomaly-alerts', 'disabled', 'Disabled globally')
ON CONFLICT (flag_key) DO NOTHING;

INSERT INTO public.admin_default_configurations (app_code, config_key, config_value)
SELECT NULL, 'default_sso_provider', 'google-workspace'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_default_configurations
  WHERE app_code IS NULL
    AND config_key = 'default_sso_provider'
);

INSERT INTO public.admin_default_configurations (app_code, config_key, config_value)
SELECT NULL, 'default_data_retention_days', '365'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_default_configurations
  WHERE app_code IS NULL
    AND config_key = 'default_data_retention_days'
);

INSERT INTO public.admin_release_notes (app_code, version, summary, published_at)
VALUES
  ('etl', 'ETL 1.14.0', 'Template guardrails, workflow audit enrichment, and bug fixes.', '2026-02-15T10:00:00.000Z'::timestamptz),
  ('stoqr', 'StoQR 1.9.2', 'Inventory report query performance improvements and pagination tuning.', '2026-02-12T08:30:00.000Z'::timestamptz)
ON CONFLICT DO NOTHING;
