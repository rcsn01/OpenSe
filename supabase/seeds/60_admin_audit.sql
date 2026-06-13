-- 5) Audit + admin tables
-- ------------------------------------------------------------

INSERT INTO public.organisation_audit_events (
  id,
  org_id,
  actor_user_id,
  action,
  app_code,
  target_org_member_id,
  metadata,
  created_at
)
VALUES
  (
    'abababab-abab-abab-abab-ababababab01',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '33333333-3333-3333-3333-333333333333',
    'org_seat_limit_updated',
    'stoqr',
    NULL,
    '{"from":15,"to":20}'::jsonb,
    timezone('utc'::text, now()) - interval '3 days'
  ),
  (
    'abababab-abab-abab-abab-ababababab02',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '66666666-6666-6666-6666-666666666666',
    'org_member_app_seat_assigned',
    'etl',
    NULL,
    '{"app_code":"etl"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_app_health_snapshots (
  id,
  app_code,
  uptime_percent,
  error_spike_level,
  active_alert_count,
  incident_summary,
  measured_at
)
VALUES
  (
    'acacacac-acac-acac-acac-acacacacac01',
    'etl',
    99.75,
    'low',
    1,
    'Minor boutique sales webhook retry spikes observed.',
    timezone('utc'::text, now()) - interval '30 minutes'
  ),
  (
    'acacacac-acac-acac-acac-acacacacac02',
    'stoqr',
    98.90,
    'medium',
    4,
    'Boutique stock export queue slower than usual.',
    timezone('utc'::text, now()) - interval '30 minutes'
  )
ON CONFLICT (id) DO NOTHING;

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
  ('adadadad-adad-adad-adad-adadadadad01', 'etl', 'Retail Data Pro', 'monthly', 2900, false, NULL, NULL, true),
  ('adadadad-adad-adad-adad-adadadadad02', 'etl', 'Retail Data Pro', 'yearly', 2500, false, NULL, NULL, true),
  ('adadadad-adad-adad-adad-adadadadad03', 'stoqr', 'Luxury Stockroom Growth', 'monthly', 1900, false, NULL, NULL, true),
  ('adadadad-adad-adad-adad-adadadadad04', NULL, 'OpenSe Luxury Retail Bundle', 'yearly', 3900, true, NULL, NULL, true)
ON CONFLICT (id) DO UPDATE
SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  seat_price_cents = EXCLUDED.seat_price_cents,
  is_active = EXCLUDED.is_active;

INSERT INTO public.platform_coupons (
  id,
  code,
  discount_percent,
  duration,
  duration_in_months,
  stripe_coupon_id,
  is_active,
  created_at
)
VALUES
  (
    'aeaeaeae-aeae-aeae-aeae-aeaeaeaeae01',
    'WELCOME20',
    20.00,
    'once',
    NULL,
    'coupon_welcome20',
    true,
    timezone('utc'::text, now()) - interval '10 days'
  ),
  (
    'aeaeaeae-aeae-aeae-aeae-aeaeaeaeae02',
    'BETA50',
    50.00,
    'repeating',
    3,
    'coupon_beta50',
    false,
    timezone('utc'::text, now()) - interval '20 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_audit_events (id, actor_user_id, action, metadata, created_at)
VALUES
  (
    'afafafaf-afaf-afaf-afaf-afafafafaf01',
    '11111111-1111-1111-1111-111111111111',
    'luxury_stockroom_plan_updated',
    '{"plan_id":"adadadad-adad-adad-adad-adadadadad03","from":1700,"to":1900}'::jsonb,
    timezone('utc'::text, now()) - interval '2 days'
  ),
  (
    'afafafaf-afaf-afaf-afaf-afafafafaf02',
    '11111111-1111-1111-1111-111111111111',
    'retail_feature_flag_updated',
    '{"flag_key":"stoqr.boutique-inventory-anomaly-alerts","rollout_status":"beta"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_feature_flags (id, app_code, flag_key, rollout_status, audience)
VALUES
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b101', 'etl', 'etl.enhanced-retail-lineage', 'beta', 'Selected retail orgs'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b102', 'stoqr', 'stoqr.smart-boutique-reorder-assistant', 'enabled', 'All organisations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_feature_flags (id, app_code, flag_key, rollout_status, audience)
VALUES
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b103', 'etl', 'etl.ai-assisted-merchandising-transforms', 'beta', 'Beta cohort'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b104', 'etl', 'etl.bulk-retail-template-publish', 'enabled', 'All organisations'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b105', 'stoqr', 'stoqr.boutique-inventory-anomaly-alerts', 'disabled', 'Disabled globally')
ON CONFLICT (flag_key) DO UPDATE
SET
  app_code = EXCLUDED.app_code,
  rollout_status = EXCLUDED.rollout_status,
  audience = EXCLUDED.audience;

INSERT INTO public.platform_default_configurations (id, app_code, config_key, config_value)
VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b201', 'etl', 'default_boutique_sync_timeout_seconds', '900'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b202', 'stoqr', 'default_alert_severity', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_default_configurations (app_code, config_key, config_value)
SELECT NULL, 'default_sso_provider', 'google-workspace'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.platform_default_configurations
  WHERE app_code IS NULL
    AND config_key = 'default_sso_provider'
);

INSERT INTO public.platform_default_configurations (app_code, config_key, config_value)
SELECT NULL, 'default_data_retention_days', '365'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.platform_default_configurations
  WHERE app_code IS NULL
    AND config_key = 'default_data_retention_days'
);

INSERT INTO public.platform_release_notes (id, app_code, version, summary, published_at)
VALUES
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b301',
    'etl',
    'Retail Data 1.15.0',
    'Boutique run diagnostics and role-aware merchandising template publishing.',
    timezone('utc'::text, now()) - interval '6 days'
  ),
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b302',
    'stoqr',
    'StoQR 1.10.0',
    'Boutique stock alert feed improvements and bulk import recovery.',
    timezone('utc'::text, now()) - interval '4 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_release_notes (id, app_code, version, summary, published_at)
VALUES
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b303',
    'etl',
    'Retail Data 1.14.0',
    'Retail template guardrails, workflow audit enrichment, and bug fixes.',
    '2026-02-15T10:00:00.000Z'::timestamptz
  ),
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b304',
    'stoqr',
    'StoQR 1.9.2',
    'Luxury stock report query performance improvements and pagination tuning.',
    '2026-02-12T08:30:00.000Z'::timestamptz
  )
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
