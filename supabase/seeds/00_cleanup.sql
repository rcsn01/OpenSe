
-- ------------------------------------------------------------
-- Seed runtime policy
-- ------------------------------------------------------------
-- This seed intentionally replaces all rows in seeded tables so
-- reruns are deterministic and do not accumulate stale data.

-- ------------------------------------------------------------
-- -1) Cleanup seeded tables (destructive overwrite)
-- ------------------------------------------------------------
TRUNCATE TABLE
  auth.identities,
  auth.users,
  public.organisation_invite_app_seats,
  public.organisation_invites,
  public.organisation_member_app_seats,
  public.organisation_app_seats,
  public.organisation_members,
  public.organisation_audit_events,
  public.platform_audit_events,
  public.subscriptions,
  public.organisations,
  public.platform_app_health_snapshots,
  public.platform_pricing_plans,
  public.platform_coupons,
  public.platform_feature_flags,
  public.platform_default_configurations,
  public.platform_release_notes,
  etl.role_permissions,
  etl.organisation_member_roles,
  etl.roles,
  etl.workflow_executions,
  etl.workflow_versions,
  etl.notification_settings,
  etl.workflows,
  stoqr.role_permissions,
  stoqr.organisation_member_roles,
  stoqr.organisation_page_settings,
  stoqr.roles,
  stoqr.product_tags,
  stoqr.product_barcodes,
  stoqr.purchase_order_items,
  stoqr.receiving_logs,
  stoqr.inventory_transactions,
  stoqr.inventory_bulk_operations,
  stoqr.scan_events,
  stoqr.report_exports,
  stoqr.report_schedules,
  stoqr.alert_delivery_logs,
  stoqr.alert_events,
  stoqr.alert_rules,
  stoqr.activity_events,
  stoqr.label_print_jobs,
  stoqr.label_templates,
  stoqr.purchase_orders,
  stoqr.suppliers,
  stoqr.products,
  stoqr.tags,
  stoqr.folders
CASCADE;

INSERT INTO public.platform_instance_settings (id, max_organisations, free_seat_limit)
VALUES (true, 100, 5)
ON CONFLICT (id) DO UPDATE
SET
  max_organisations = EXCLUDED.max_organisations,
  free_seat_limit = EXCLUDED.free_seat_limit;

-- ------------------------------------------------------------
