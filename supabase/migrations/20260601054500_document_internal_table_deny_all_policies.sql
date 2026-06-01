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
