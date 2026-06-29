-- Open-KB configurable project tabs and project message threads.

CREATE TABLE kb.project_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES kb.projects(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL CHECK (tab_key IN (
    'overview',
    'list',
    'board',
    'timeline',
    'dashboard',
    'calendar',
    'workflow',
    'messages',
    'gantt',
    'workload',
    'files',
    'estimates',
    'settings'
  )),
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX kb_project_tabs_project_idx
  ON kb.project_tabs (project_id, deleted_at, sort_order);

CREATE UNIQUE INDEX kb_project_tabs_active_key_uidx
  ON kb.project_tabs (project_id, tab_key)
  WHERE deleted_at IS NULL;

CREATE TABLE kb.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES kb.projects(id) ON DELETE CASCADE,
  profile_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  description_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  description_html TEXT,
  description_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX kb_project_messages_project_idx
  ON kb.project_messages (project_id, deleted_at, created_at DESC);

CREATE FUNCTION kb.validate_project_tab()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_project_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.metadata->>'required' = 'true' THEN
      RAISE EXCEPTION 'The required project tab cannot be removed';
    END IF;
    RETURN OLD;
  END IF;

  SELECT p.organisation_id
  INTO v_project_org_id
  FROM kb.projects p
  WHERE p.id = NEW.project_id
    AND p.deleted_at IS NULL;

  IF v_project_org_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB project % does not exist', NEW.project_id;
  END IF;

  IF v_project_org_id <> NEW.organisation_id THEN
    RAISE EXCEPTION 'Project tab organisation must match project organisation';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.tab_key <> OLD.tab_key THEN
    RAISE EXCEPTION 'Project tab keys cannot be changed';
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.metadata->>'required' = 'true'
    AND COALESCE(NEW.metadata->>'required', 'false') <> 'true'
  THEN
    RAISE EXCEPTION 'Required project tabs cannot be made optional';
  END IF;

  IF NEW.metadata->>'required' = 'true' AND NEW.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'The required project tab cannot be removed';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.create_default_project_tabs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
BEGIN
  INSERT INTO kb.project_tabs (organisation_id, project_id, tab_key, label, sort_order, metadata, created_by)
  VALUES
    (NEW.organisation_id, NEW.id, 'overview', 'Overview', 10, '{}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'list', 'List', 20, '{"required": true}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'settings', 'Settings', 80, '{}'::jsonb, NEW.created_by)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION kb.validate_project_tab() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.create_default_project_tabs() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER handle_project_tabs_updated_at
  BEFORE UPDATE ON kb.project_tabs
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER handle_project_messages_updated_at
  BEFORE UPDATE ON kb.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER trg_kb_validate_project_tab
  BEFORE INSERT OR UPDATE OR DELETE ON kb.project_tabs
  FOR EACH ROW
  EXECUTE FUNCTION kb.validate_project_tab();

CREATE TRIGGER trg_kb_project_default_tabs
  AFTER INSERT ON kb.projects
  FOR EACH ROW
  EXECUTE FUNCTION kb.create_default_project_tabs();

ALTER TABLE kb.project_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb.project_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  kb.project_tabs,
  kb.project_messages
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  kb.project_tabs,
  kb.project_messages
TO service_role;

CREATE POLICY project_tabs_select ON kb.project_tabs
  FOR SELECT TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_tabs_insert ON kb.project_tabs
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_tabs_update ON kb.project_tabs
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_tabs_delete ON kb.project_tabs
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_select ON kb.project_messages
  FOR SELECT TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.view')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_insert ON kb.project_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_update ON kb.project_messages
  FOR UPDATE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  )
  WITH CHECK (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_delete ON kb.project_messages
  FOR DELETE TO authenticated
  USING (
    kb.has_permission(organisation_id, 'projects.edit')
    AND kb.has_project_access(project_id)
  );

INSERT INTO kb.project_tabs (organisation_id, project_id, tab_key, label, sort_order, metadata, created_by)
SELECT p.organisation_id, p.id, tab.tab_key, tab.label, tab.sort_order, tab.metadata, p.created_by
FROM kb.projects p
CROSS JOIN (
  VALUES
    ('overview', 'Overview', 10, '{}'::jsonb),
    ('list', 'List', 20, '{"required": true}'::jsonb),
    ('settings', 'Settings', 80, '{}'::jsonb)
) AS tab(tab_key, label, sort_order, metadata)
WHERE p.deleted_at IS NULL
ON CONFLICT DO NOTHING;
