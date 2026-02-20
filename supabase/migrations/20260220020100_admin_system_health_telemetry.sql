-- ============================================================
-- Admin System Health Telemetry
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_app_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  uptime_percent NUMERIC(5,2) NOT NULL CHECK (uptime_percent >= 0 AND uptime_percent <= 100),
  error_spike_level TEXT NOT NULL CHECK (error_spike_level IN ('stable', 'low', 'medium', 'high')),
  active_alert_count INTEGER NOT NULL DEFAULT 0 CHECK (active_alert_count >= 0),
  incident_summary TEXT,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS admin_app_health_snapshots_app_code_measured_at_idx
  ON public.admin_app_health_snapshots(app_code, measured_at DESC);

ALTER TABLE public.admin_app_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_app_health_snapshots_select ON public.admin_app_health_snapshots;
CREATE POLICY admin_app_health_snapshots_select ON public.admin_app_health_snapshots
  FOR SELECT USING (public.is_app_super_admin());

GRANT SELECT ON public.admin_app_health_snapshots TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_system_health()
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

REVOKE ALL ON FUNCTION public.admin_list_system_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_system_health() TO authenticated;
