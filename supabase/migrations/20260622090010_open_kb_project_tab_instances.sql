-- Allow multiple project tab instances with the same underlying tab type.

DROP INDEX IF EXISTS open_kb.open_kb_project_tabs_active_key_uidx;

UPDATE open_kb.project_tabs
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('required', true)
WHERE tab_key = 'list'
  AND deleted_at IS NULL
  AND id IN (
    SELECT DISTINCT ON (project_id) id
    FROM open_kb.project_tabs
    WHERE tab_key = 'list'
      AND deleted_at IS NULL
    ORDER BY project_id, sort_order, created_at
  );

UPDATE open_kb.project_tabs
SET deleted_at = COALESCE(deleted_at, timezone('utc'::text, now()))
WHERE tab_key IN ('drafts', 'modules')
  AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION open_kb.validate_project_tab()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
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

  IF NEW.tab_key IN ('drafts', 'modules') AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'This project tab is no longer supported';
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

CREATE OR REPLACE FUNCTION open_kb.create_default_project_tabs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
BEGIN
  INSERT INTO open_kb.project_tabs (organisation_id, project_id, tab_key, label, sort_order, metadata, created_by)
  VALUES
    (NEW.organisation_id, NEW.id, 'overview', 'Overview', 10, '{}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'list', 'List', 20, '{"required": true}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'cycles', 'Cycles', 40, '{}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'estimates', 'Estimates', 60, '{}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'pages', 'Pages', 70, '{}'::jsonb, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'settings', 'Settings', 80, '{}'::jsonb, NEW.created_by);

  RETURN NEW;
END;
$$;
