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

INSERT INTO public.admin_app_health_snapshots (
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
    'Minor webhook retry spikes observed.',
    timezone('utc'::text, now()) - interval '30 minutes'
  ),
  (
    'acacacac-acac-acac-acac-acacacacac02',
    'stoqr',
    98.90,
    'medium',
    4,
    'Inventory export queue slower than usual.',
    timezone('utc'::text, now()) - interval '30 minutes'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_pricing_plans (
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
  ('adadadad-adad-adad-adad-adadadadad01', 'etl', 'ETL Pro', 'monthly', 2900, false, 'prod_etl_pro', 'price_etl_pro_monthly', true),
  ('adadadad-adad-adad-adad-adadadadad02', 'etl', 'ETL Pro', 'yearly', 2500, false, 'prod_etl_pro', 'price_etl_pro_yearly', true),
  ('adadadad-adad-adad-adad-adadadadad03', 'stoqr', 'StoQR Growth', 'monthly', 1900, false, 'prod_stoqr_growth', 'price_stoqr_growth_monthly', true),
  ('adadadad-adad-adad-adad-adadadadad04', NULL, 'OpenSe Bundle', 'yearly', 3900, true, 'prod_opense_bundle', 'price_opense_bundle_yearly', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_coupons (
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

INSERT INTO public.platform_admin_audit_events (id, actor_user_id, action, metadata, created_at)
VALUES
  (
    'afafafaf-afaf-afaf-afaf-afafafafaf01',
    '11111111-1111-1111-1111-111111111111',
    'pricing_plan_updated',
    '{"plan_id":"adadadad-adad-adad-adad-adadadadad03","from":1700,"to":1900}'::jsonb,
    timezone('utc'::text, now()) - interval '2 days'
  ),
  (
    'afafafaf-afaf-afaf-afaf-afafafafaf02',
    '11111111-1111-1111-1111-111111111111',
    'feature_flag_updated',
    '{"flag_key":"stoqr.inventory-anomaly-alerts","rollout_status":"beta"}'::jsonb,
    timezone('utc'::text, now()) - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_feature_flags (id, app_code, flag_key, rollout_status, audience)
VALUES
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b101', 'etl', 'etl.enhanced-lineage-graph', 'beta', 'Selected enterprise orgs'),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b102', 'stoqr', 'stoqr.smart-reorder-assistant', 'enabled', 'All organisations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_default_configurations (id, app_code, config_key, config_value)
VALUES
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b201', 'etl', 'default_workflow_timeout_seconds', '900'),
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b202', 'stoqr', 'default_alert_severity', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_release_notes (id, app_code, version, summary, published_at)
VALUES
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b301',
    'etl',
    'ETL 1.15.0',
    'Pipeline run diagnostics and role-aware template publishing.',
    timezone('utc'::text, now()) - interval '6 days'
  ),
  (
    'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b302',
    'stoqr',
    'StoQR 1.10.0',
    'Inventory alert feed improvements and bulk import recovery.',
    timezone('utc'::text, now()) - interval '4 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------