-- ============================================================
-- Baseline: ETL Schema Tables (Canonical Org FK)
-- ============================================================

CREATE TABLE IF NOT EXISTS etl.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT
);

INSERT INTO etl.app_permissions (code, description) VALUES
  ('workflows.view', 'View ETL workflows'),
  ('workflows.manage', 'Create and edit ETL workflows'),
  ('executions.view', 'View workflow execution history'),
  ('executions.run', 'Run workflows'),
  ('notifications.manage', 'Manage workflow notifications'),
  ('roles.manage', 'Manage ETL custom roles')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS etl.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(org_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS etl_roles_org_id_name_lower_uidx
  ON etl.roles (org_id, lower(name));

CREATE TABLE IF NOT EXISTS etl.role_permissions (
  role_id UUID REFERENCES etl.roles(id) ON DELETE CASCADE NOT NULL,
  permission_code TEXT REFERENCES etl.app_permissions(code) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS etl.organisation_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_member_id UUID REFERENCES public.organisation_members(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES etl.roles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(org_member_id)
);

CREATE TABLE IF NOT EXISTS etl.workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  graph_data JSONB,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS workflows_org_idx ON etl.workflows(org_id);
CREATE INDEX IF NOT EXISTS workflows_owner_idx ON etl.workflows(owner_id);
CREATE INDEX IF NOT EXISTS workflows_is_template_idx ON etl.workflows(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON etl.workflows(created_at);

CREATE TABLE IF NOT EXISTS etl.workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES etl.workflows(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS etl.logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    text NOT NULL,        
  description   text,                
  status        text DEFAULT 'success',
  created_at    timestamptz DEFAULT now(),
  error_message text,
  metadata      jsonb                
);

CREATE INDEX IF NOT EXISTS workflow_executions_org_idx ON etl.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS workflow_executions_user_idx ON etl.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS workflow_executions_workflow_idx ON etl.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON etl.workflow_executions(status);

CREATE TABLE IF NOT EXISTS etl.workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES etl.workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  graph_data JSONB NOT NULL,
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  UNIQUE(workflow_id, version_number)
);

CREATE TABLE IF NOT EXISTS etl.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES etl.workflows(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'webhook')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, channel)
);

ALTER TABLE etl.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.organisation_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON etl.app_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.organisation_member_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.workflows TO authenticated;
GRANT SELECT ON etl.workflow_executions TO authenticated;
GRANT SELECT, INSERT ON etl.workflow_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.notification_settings TO authenticated;
GRANT SELECT, INSERT ON etl.logs TO authenticated;
