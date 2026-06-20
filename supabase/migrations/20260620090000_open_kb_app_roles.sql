-- Open-KB application baseline.
--
-- Plane tenancy is intentionally not created. Every Open-KB row is scoped to
-- public.organisations through organisation_id, and app access is gated by
-- public.organisation_member_app_seats(app_code = 'open-kb').

CREATE SCHEMA open_kb;

GRANT USAGE ON SCHEMA open_kb TO anon, authenticated, service_role;

INSERT INTO public.apps (code, name)
VALUES ('open-kb', 'Open-KB')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

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
VALUES (
  'adadadad-adad-adad-adad-adadadadad05',
  'open-kb',
  'Open-KB Team',
  'monthly',
  1900,
  false,
  NULL,
  NULL,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  app_code = EXCLUDED.app_code,
  plan_name = EXCLUDED.plan_name,
  billing_interval = EXCLUDED.billing_interval,
  seat_price_cents = EXCLUDED.seat_price_cents,
  is_bundle = EXCLUDED.is_bundle,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  is_active = EXCLUDED.is_active;

CREATE TABLE open_kb.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT,
  page_key TEXT,
  action_key TEXT,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  deprecated BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO open_kb.app_permissions (code, description, page_key, action_key, label, sort_order, hidden, deprecated)
VALUES
  ('dashboard.view', 'View Open-KB dashboard summaries', 'dashboard', 'view', 'View', 100, false, false),
  ('projects.view', 'View projects', 'projects', 'view', 'View', 200, false, false),
  ('projects.create', 'Create projects', 'projects', 'create', 'Create', 210, false, false),
  ('projects.edit', 'Edit project settings and metadata', 'projects', 'edit', 'Edit', 220, false, false),
  ('projects.delete', 'Archive or delete projects', 'projects', 'delete', 'Delete', 230, false, false),
  ('projects.members.manage', 'Manage project members', 'projects', 'members.manage', 'Manage Members', 240, false, false),
  ('issues.view', 'View issues and work item activity', 'issues', 'view', 'View', 300, false, false),
  ('issues.create', 'Create issues and draft issues', 'issues', 'create', 'Create', 310, false, false),
  ('issues.edit', 'Edit issues, states, labels, links, and comments', 'issues', 'edit', 'Edit', 320, false, false),
  ('issues.delete', 'Delete issues and related work item records', 'issues', 'delete', 'Delete', 330, false, false),
  ('planning.view', 'View cycles, modules, estimates, and saved views', 'planning', 'view', 'View', 400, false, false),
  ('planning.manage', 'Manage cycles, modules, estimates, and planning assignments', 'planning', 'manage', 'Manage', 410, false, false),
  ('pages.view', 'View pages, stickies, descriptions, and favorites', 'pages', 'view', 'View', 500, false, false),
  ('pages.manage', 'Create and edit pages, stickies, and rich text assets', 'pages', 'manage', 'Manage', 510, false, false),
  ('intake.view', 'View intake queues and votes', 'intake', 'view', 'View', 600, false, false),
  ('intake.manage', 'Triage and manage intake issues', 'intake', 'manage', 'Manage', 610, false, false),
  ('analytics.view', 'View analytics and reports', 'analytics', 'view', 'View', 700, false, false),
  ('automation.manage', 'Manage webhooks, imports, exports, integrations, and API tokens', 'automation', 'manage', 'Manage', 800, false, false),
  ('settings.view', 'View Open-KB settings', 'settings', 'view', 'View', 900, false, false),
  ('settings.roles.manage', 'Manage Open-KB roles and permissions', 'settings', 'roles.manage', 'Manage Roles', 910, false, false),
  ('settings.integrations.manage', 'Manage integration settings after feature flag approval', 'settings', 'integrations.manage', 'Manage Integrations', 920, false, false)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    page_key = EXCLUDED.page_key,
    action_key = EXCLUDED.action_key,
    label = EXCLUDED.label,
    sort_order = EXCLUDED.sort_order,
    hidden = EXCLUDED.hidden,
    deprecated = EXCLUDED.deprecated;

CREATE TABLE open_kb.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  UNIQUE (organisation_id, name)
);

CREATE UNIQUE INDEX open_kb_roles_organisation_id_name_lower_uidx
  ON open_kb.roles (organisation_id, lower(name));

CREATE TABLE open_kb.role_permissions (
  role_id UUID NOT NULL REFERENCES open_kb.roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES open_kb.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE open_kb.organisation_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id UUID NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  role_id UUID REFERENCES open_kb.roles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_member_id)
);

CREATE TABLE open_kb.feature_flags (
  organisation_id UUID PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  github_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  slack_sync_enabled BOOLEAN NOT NULL DEFAULT false,
  api_tokens_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
