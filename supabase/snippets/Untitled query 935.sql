CREATE TABLE IF NOT EXISTS etl.logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT NOT NULL,
  description   TEXT,
 status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'running', 'idle', 'scheduled')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  error_message TEXT,
  metadata      JSONB,
  workflow_id   UUID REFERENCES etl.workflows(id) ON DELETE SET NULL,
  execution_id  UUID REFERENCES etl.workflow_executions(id) ON DELETE SET NULL,
  org_id        UUID REFERENCES public.organisations(id) ON DELETE SET NULL
);