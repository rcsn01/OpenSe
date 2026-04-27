CREATE TABLE IF NOT EXISTS etl.logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_category TEXT        NOT NULL CHECK (event_category IN ('workflow', 'user_action', 'system')),
  event_type     TEXT        NOT NULL,
  description    TEXT,
  status         TEXT        NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'running')),
  severity       TEXT        NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  error_message  TEXT,
  metadata       JSONB,
  org_id         UUID        REFERENCES public.organisations(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);