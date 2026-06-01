-- StoQR application baseline.
--
-- Demo system label templates are seeded from
-- supabase/seeds/40_stoqr_reference_membership.sql.

CREATE TABLE stoqr.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT,
  page_key TEXT,
  action_key TEXT,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  deprecated BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO stoqr.app_permissions (code, description, page_key, action_key, label, sort_order, hidden, deprecated)
VALUES
  ('dashboard.view', 'View dashboard KPIs, trends, and alerts summary', 'dashboard', 'view', 'View', 100, false, false),
  ('inventory.view', 'View inventory lists and summary data', 'inventory', 'view', 'View', 200, false, false),
  ('inventory.use', 'Open product detail pages and product history', 'inventory', 'use', 'Use', 210, false, false),
  ('inventory.create', 'Create products and inventory records', 'inventory', 'create', 'Create', 220, false, false),
  ('inventory.edit', 'Edit products, folders, tags, and barcodes', 'inventory', 'edit', 'Edit', 230, false, false),
  ('inventory.adjust', 'Adjust and transfer stock levels', 'inventory', 'adjust', 'Adjust', 240, false, false),
  ('inventory.delete', 'Delete products and inventory structures', 'inventory', 'delete', 'Delete', 250, false, false),
  ('inventory.import_export', 'Import, export, and bulk update inventory records', 'inventory', 'import_export', 'Import / Export', 260, false, false),
  ('scanner.view', 'View scanner workflows and scan history', 'scanner', 'view', 'View', 300, false, false),
  ('scanner.use', 'Perform scans and scanner-driven stock actions', 'scanner', 'use', 'Use', 310, false, false),
  ('labels.view', 'View label templates and label output', 'labels', 'view', 'View', 400, false, false),
  ('labels.use', 'Generate and queue label output', 'labels', 'use', 'Use', 410, false, false),
  ('labels.manage', 'Manage label templates and print jobs', 'labels', 'manage', 'Manage', 420, false, false),
  ('reports.view', 'View reports and analytics data', 'reports', 'view', 'View', 500, false, false),
  ('reports.export', 'Export reports to CSV/PDF/PNG', 'reports', 'export', 'Export', 510, false, false),
  ('procurement.view', 'View suppliers, purchase orders, and receiving', 'procurement', 'view', 'View', 600, false, false),
  ('procurement.create', 'Create suppliers and purchase orders', 'procurement', 'create', 'Create', 610, false, false),
  ('procurement.receive', 'Receive purchase orders into inventory', 'procurement', 'receive', 'Receive', 620, false, false),
  ('procurement.manage', 'Manage procurement settings and records', 'procurement', 'manage', 'Manage', 630, false, false),
  ('alerts.view', 'View inventory and system alerts', 'alerts', 'view', 'View', 700, false, false),
  ('alerts.use', 'Acknowledge and resolve alert events', 'alerts', 'use', 'Use', 710, false, false),
  ('alerts.manage', 'Manage alert rules and delivery settings', 'alerts', 'manage', 'Manage', 720, false, false),
  ('organisation.view', 'View organisation teams, roles, pages, and settings', 'organisation', 'view', 'View', 800, false, false),
  ('organisation.members.manage', 'Invite and manage organisation members', 'organisation', 'members.manage', 'Manage Members', 810, false, false),
  ('organisation.roles.manage', 'Create and edit custom roles', 'organisation', 'roles.manage', 'Manage Roles', 820, false, false),
  ('organisation.pages.manage', 'Manage organisation-wide page availability', 'organisation', 'pages.manage', 'Manage Pages', 830, false, false),
  ('organisation.activity.view', 'View organisation activity logs', 'organisation', 'activity.view', 'View Activity', 840, false, false),
  ('organisation.company.manage', 'Manage company details and settings', 'organisation', 'company.manage', 'Manage Company', 850, false, false),
  ('organisation.billing.manage', 'Manage subscription and billing', 'organisation', 'billing.manage', 'Manage Billing', 860, false, false),
  ('company.manage', 'Deprecated alias for organisation.company.manage', 'organisation', 'company.manage', 'Manage Company', 9000, true, true),
  ('billing.manage', 'Deprecated alias for organisation.billing.manage', 'organisation', 'billing.manage', 'Manage Billing', 9010, true, true),
  ('members.view', 'Deprecated alias for organisation.view', 'organisation', 'view', 'View', 9020, true, true),
  ('members.manage', 'Deprecated alias for organisation.members.manage', 'organisation', 'members.manage', 'Manage Members', 9030, true, true),
  ('roles.manage', 'Deprecated alias for organisation.roles.manage', 'organisation', 'roles.manage', 'Manage Roles', 9040, true, true),
  ('activity.view', 'Deprecated alias for organisation.activity.view', 'organisation', 'activity.view', 'View Activity', 9050, true, true),
  ('products.view', 'Deprecated alias for inventory.view and inventory.use', 'inventory', 'view', 'View', 9060, true, true),
  ('products.manage', 'Deprecated alias for inventory write permissions', 'inventory', 'edit', 'Edit', 9070, true, true),
  ('inventory.bulk_manage', 'Deprecated alias for inventory.import_export', 'inventory', 'import_export', 'Import / Export', 9080, true, true),
  ('transactions.view', 'Deprecated alias for inventory.use', 'inventory', 'use', 'Use', 9090, true, true),
  ('transactions.create', 'Deprecated alias for inventory.adjust and scanner.use', 'inventory', 'adjust', 'Adjust', 9100, true, true)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    page_key = EXCLUDED.page_key,
    action_key = EXCLUDED.action_key,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    hidden = EXCLUDED.hidden,
    deprecated = EXCLUDED.deprecated;

CREATE TABLE stoqr.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (company_id, name)
);

CREATE UNIQUE INDEX stoqr_roles_company_id_name_lower_uidx
  ON stoqr.roles (company_id, lower(name));

CREATE UNIQUE INDEX stoqr_roles_company_id_role_rank_uidx
  ON stoqr.roles (company_id, role_rank);

CREATE TABLE stoqr.role_permissions (
  role_id UUID NOT NULL REFERENCES stoqr.roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES stoqr.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE stoqr.organisation_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, company_id)
);

CREATE TABLE stoqr.organisation_page_settings (
  company_id UUID PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  reports_enabled BOOLEAN NOT NULL DEFAULT true,
  procurement_enabled BOOLEAN NOT NULL DEFAULT true,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
