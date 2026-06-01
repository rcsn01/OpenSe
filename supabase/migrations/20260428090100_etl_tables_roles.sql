-- ETL application baseline.

CREATE TABLE etl.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT
);

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

CREATE TABLE etl.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_id, name)
);

CREATE UNIQUE INDEX etl_roles_org_id_name_lower_uidx
  ON etl.roles (org_id, lower(name));

CREATE TABLE etl.role_permissions (
  role_id UUID NOT NULL REFERENCES etl.roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES etl.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE etl.organisation_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id UUID NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  role_id UUID REFERENCES etl.roles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_member_id)
);

CREATE TABLE etl.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  description TEXT,
  graph_data JSONB,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  is_template BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX workflows_org_idx ON etl.workflows (org_id);
CREATE INDEX workflows_owner_idx ON etl.workflows (owner_id);
CREATE INDEX workflows_is_template_idx ON etl.workflows (is_template) WHERE is_template = true;
CREATE INDEX workflows_created_at_idx ON etl.workflows (created_at);

CREATE TABLE etl.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES etl.workflows(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX workflow_executions_org_idx ON etl.workflow_executions (org_id);
CREATE INDEX workflow_executions_user_idx ON etl.workflow_executions (user_id);
CREATE INDEX workflow_executions_workflow_idx ON etl.workflow_executions (workflow_id);
CREATE INDEX workflow_executions_status_idx ON etl.workflow_executions (status);

CREATE TABLE etl.workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES etl.workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  graph_data JSONB NOT NULL,
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  UNIQUE (workflow_id, version_number)
);

CREATE TABLE etl.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES etl.workflows(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'webhook')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, channel)
);

ALTER TABLE etl.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.organisation_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.notification_settings ENABLE ROW LEVEL SECURITY;
