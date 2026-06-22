-- Open-KB configurable project tabs and project message threads.

CREATE TABLE open_kb.project_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES open_kb.projects(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL CHECK (tab_key IN (
    'overview',
    'list',
    'board',
    'timeline',
    'dashboard',
    'calendar',
    'workflow',
    'messages',
    'note',
    'gantt',
    'workload',
    'files',
    'drafts',
    'cycles',
    'modules',
    'estimates',
    'pages',
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

CREATE INDEX open_kb_project_tabs_project_idx
  ON open_kb.project_tabs (project_id, deleted_at, sort_order);

CREATE UNIQUE INDEX open_kb_project_tabs_active_key_uidx
  ON open_kb.project_tabs (project_id, tab_key)
  WHERE deleted_at IS NULL;

CREATE TABLE open_kb.project_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES open_kb.projects(id) ON DELETE CASCADE,
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

CREATE INDEX open_kb_project_messages_project_idx
  ON open_kb.project_messages (project_id, deleted_at, created_at DESC);

CREATE FUNCTION open_kb.validate_project_tab()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_project_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.tab_key = 'list' THEN
      RAISE EXCEPTION 'The List project tab cannot be removed';
    END IF;
    RETURN OLD;
  END IF;

  SELECT p.organisation_id
  INTO v_project_org_id
  FROM open_kb.projects p
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

  IF NEW.tab_key = 'list' AND NEW.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'The List project tab cannot be removed';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION open_kb.create_default_project_tabs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
BEGIN
  INSERT INTO open_kb.project_tabs (organisation_id, project_id, tab_key, label, sort_order, created_by)
  VALUES
    (NEW.organisation_id, NEW.id, 'overview', 'Overview', 10, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'list', 'List', 20, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'drafts', 'Drafts', 30, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'cycles', 'Cycles', 40, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'modules', 'Modules', 50, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'estimates', 'Estimates', 60, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'pages', 'Pages', 70, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'settings', 'Settings', 80, NEW.created_by)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION open_kb.validate_project_tab() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION open_kb.create_default_project_tabs() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER handle_project_tabs_updated_at
  BEFORE UPDATE ON open_kb.project_tabs
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER handle_project_messages_updated_at
  BEFORE UPDATE ON open_kb.project_messages
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE TRIGGER trg_open_kb_validate_project_tab
  BEFORE INSERT OR UPDATE OR DELETE ON open_kb.project_tabs
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.validate_project_tab();

CREATE TRIGGER trg_open_kb_project_default_tabs
  AFTER INSERT ON open_kb.projects
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.create_default_project_tabs();

ALTER TABLE open_kb.project_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE open_kb.project_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  open_kb.project_tabs,
  open_kb.project_messages
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  open_kb.project_tabs,
  open_kb.project_messages
TO service_role;

CREATE POLICY project_tabs_select ON open_kb.project_tabs
  FOR SELECT TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_tabs_insert ON open_kb.project_tabs
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_tabs_update ON open_kb.project_tabs
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_tabs_delete ON open_kb.project_tabs
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_select ON open_kb.project_messages
  FOR SELECT TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.view')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_insert ON open_kb.project_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_update ON open_kb.project_messages
  FOR UPDATE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  )
  WITH CHECK (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

CREATE POLICY project_messages_delete ON open_kb.project_messages
  FOR DELETE TO authenticated
  USING (
    open_kb.has_permission(organisation_id, 'projects.edit')
    AND open_kb.has_project_access(project_id)
  );

INSERT INTO open_kb.project_tabs (organisation_id, project_id, tab_key, label, sort_order, created_by)
SELECT p.organisation_id, p.id, tab.tab_key, tab.label, tab.sort_order, p.created_by
FROM open_kb.projects p
CROSS JOIN (
  VALUES
    ('overview', 'Overview', 10),
    ('list', 'List', 20),
    ('drafts', 'Drafts', 30),
    ('cycles', 'Cycles', 40),
    ('modules', 'Modules', 50),
    ('estimates', 'Estimates', 60),
    ('pages', 'Pages', 70),
    ('settings', 'Settings', 80)
) AS tab(tab_key, label, sort_order)
WHERE p.deleted_at IS NULL
ON CONFLICT DO NOTHING;
