-- Baseline application catalog required by onboarding and owner-seat triggers.
--
-- Demo data stays in supabase/seeds, but these rows are schema-level reference
-- data: organisation creation assigns app seats for these codes during reset
-- flows even when Supabase CLI auto-seeding is disabled.

INSERT INTO public.apps (code, name)
VALUES
  ('etl', 'ETL'),
  ('stoqr', 'StoQR')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO etl.app_permissions (code, description)
VALUES
  ('workflows.view', 'View ETL workflows'),
  ('workflows.manage', 'Create and edit ETL workflows'),
  ('executions.view', 'View workflow execution history'),
  ('executions.run', 'Run workflows'),
  ('notifications.manage', 'Manage workflow notifications'),
  ('roles.manage', 'Manage ETL custom roles')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO stoqr.app_permissions (code, description)
VALUES
  ('company.manage', 'Manage company details and settings'),
  ('billing.manage', 'Manage subscription and billing'),
  ('members.view', 'View company members'),
  ('members.manage', 'Invite and manage members'),
  ('roles.manage', 'Create and edit custom roles'),
  ('dashboard.view', 'View dashboard KPIs, trends, and alerts summary'),
  ('products.view', 'View inventory and products'),
  ('products.manage', 'Create, edit, and delete products'),
  ('inventory.bulk_manage', 'Import, export, and bulk update inventory records'),
  ('scanner.use', 'Use scanner workflows and scan history'),
  ('labels.manage', 'Manage label templates and print jobs'),
  ('reports.view', 'View reports and analytics data'),
  ('reports.export', 'Export reports to CSV/PDF/PNG'),
  ('procurement.manage', 'Manage suppliers, purchase orders, and receiving'),
  ('alerts.view', 'View inventory and system alerts'),
  ('alerts.manage', 'Manage alert rules and delivery settings'),
  ('activity.view', 'View company activity logs'),
  ('transactions.view', 'View stock history'),
  ('transactions.create', 'Create stock in/out transactions')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;
