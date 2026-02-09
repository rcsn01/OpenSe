-- ============================================================
-- Migration 0004: ETL Schema - Tables
-- ============================================================
-- All ETL-specific tables live in the `etl` schema.
-- References public.profiles for user identity.

-- Organisations
CREATE TABLE IF NOT EXISTS etl.organisations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  tier TEXT DEFAULT 'tier-1' CHECK (tier IN ('tier-1', 'tier-2', 'tier-3')),
  subscription_status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
);

CREATE INDEX IF NOT EXISTS organisations_owner_idx ON etl.organisations(owner_id);

-- Organisation members
CREATE TABLE IF NOT EXISTS etl.organisation_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES etl.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'editor', 'member')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS organisation_members_org_idx ON etl.organisation_members(org_id);
CREATE INDEX IF NOT EXISTS organisation_members_user_idx ON etl.organisation_members(user_id);

-- Organisation invites
CREATE TABLE IF NOT EXISTS etl.organisation_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES etl.organisations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'member')),
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS organisation_invites_org_idx ON etl.organisation_invites(org_id);
CREATE INDEX IF NOT EXISTS organisation_invites_email_idx ON etl.organisation_invites(email);

-- Workflows
CREATE TABLE IF NOT EXISTS etl.workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  graph_data JSONB,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  org_id UUID REFERENCES etl.organisations(id) ON DELETE CASCADE,
  is_template BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS workflows_org_idx ON etl.workflows(org_id);
CREATE INDEX IF NOT EXISTS workflows_owner_idx ON etl.workflows(owner_id);
CREATE INDEX IF NOT EXISTS workflows_is_template_idx ON etl.workflows(is_template) WHERE is_template = true;
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON etl.workflows(created_at);

-- Workflow executions
CREATE TABLE IF NOT EXISTS etl.workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES etl.workflows(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES etl.organisations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS workflow_executions_org_idx ON etl.workflow_executions(org_id);
CREATE INDEX IF NOT EXISTS workflow_executions_user_idx ON etl.workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS workflow_executions_workflow_idx ON etl.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON etl.workflow_executions(status);

-- Workflow versions
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

-- Notification settings
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

-- Enable RLS on all ETL tables
ALTER TABLE etl.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.organisation_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.notification_settings ENABLE ROW LEVEL SECURITY;

-- Grants for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.organisation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.organisation_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.workflows TO authenticated;
GRANT SELECT ON etl.workflow_executions TO authenticated;
GRANT SELECT, INSERT ON etl.workflow_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON etl.notification_settings TO authenticated;
