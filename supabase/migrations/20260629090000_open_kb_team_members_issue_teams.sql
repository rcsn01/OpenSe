-- Open-KB team membership and issue team assignment metadata.

CREATE TABLE kb.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES kb.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX kb_team_members_team_profile_uidx
  ON kb.team_members (team_id, profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX kb_team_members_org_idx
  ON kb.team_members (organisation_id, deleted_at);

CREATE INDEX kb_team_members_team_idx
  ON kb.team_members (team_id, deleted_at);

CREATE INDEX kb_team_members_profile_idx
  ON kb.team_members (profile_id, deleted_at);

CREATE TRIGGER handle_team_members_updated_at
  BEFORE UPDATE ON kb.team_members
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime(updated_at);

ALTER TABLE kb.issues
  ADD COLUMN team_id UUID REFERENCES kb.teams(id) ON DELETE SET NULL;

CREATE INDEX kb_issues_team_idx
  ON kb.issues (team_id, deleted_at);

CREATE FUNCTION kb.validate_team_member_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_team_org_id UUID;
BEGIN
  SELECT t.organisation_id
  INTO v_team_org_id
  FROM kb.teams t
  WHERE t.id = NEW.team_id
    AND t.deleted_at IS NULL;

  IF v_team_org_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB team % does not exist', NEW.team_id;
  END IF;

  IF v_team_org_id <> NEW.organisation_id THEN
    RAISE EXCEPTION 'Team member organisation must match team organisation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organisation_members om
    JOIN public.organisation_member_app_seats mas
      ON mas.org_member_id = om.id
     AND mas.app_code = 'open-kb'
    WHERE om.org_id = NEW.organisation_id
      AND om.user_id = NEW.profile_id
  ) THEN
    RAISE EXCEPTION 'Team member profile must belong to the organisation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.validate_issue_team_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_team_org_id UUID;
BEGIN
  IF NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.organisation_id
  INTO v_team_org_id
  FROM kb.teams t
  WHERE t.id = NEW.team_id
    AND t.deleted_at IS NULL;

  IF v_team_org_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB team % does not exist', NEW.team_id;
  END IF;

  IF v_team_org_id <> NEW.organisation_id THEN
    RAISE EXCEPTION 'Issue team must belong to the same organisation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.clear_team_assignments_on_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    UPDATE kb.projects
    SET team_id = NULL
    WHERE team_id = NEW.id;

    UPDATE kb.issues
    SET team_id = NULL
    WHERE team_id = NEW.id;

    UPDATE kb.team_members
    SET deleted_at = NEW.deleted_at
    WHERE team_id = NEW.id
      AND deleted_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kb_validate_team_member_org
  BEFORE INSERT OR UPDATE OF organisation_id, team_id, profile_id, deleted_at ON kb.team_members
  FOR EACH ROW
  WHEN (NEW.deleted_at IS NULL)
  EXECUTE FUNCTION kb.validate_team_member_org();

CREATE TRIGGER trg_kb_validate_issue_team_org
  BEFORE INSERT OR UPDATE OF organisation_id, team_id ON kb.issues
  FOR EACH ROW
  EXECUTE FUNCTION kb.validate_issue_team_org();

CREATE TRIGGER trg_kb_clear_team_assignments_on_soft_delete
  AFTER UPDATE OF deleted_at ON kb.teams
  FOR EACH ROW
  EXECUTE FUNCTION kb.clear_team_assignments_on_soft_delete();

ALTER TABLE kb.team_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE kb.team_members TO authenticated;
GRANT ALL PRIVILEGES ON TABLE kb.team_members TO service_role;

CREATE POLICY team_members_select ON kb.team_members
  FOR SELECT TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.view'));

CREATE POLICY team_members_insert ON kb.team_members
  FOR INSERT TO authenticated
  WITH CHECK (kb.has_permission(organisation_id, 'projects.edit'));

CREATE POLICY team_members_update ON kb.team_members
  FOR UPDATE TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.edit'))
  WITH CHECK (kb.has_permission(organisation_id, 'projects.edit'));

CREATE POLICY team_members_delete ON kb.team_members
  FOR DELETE TO authenticated
  USING (kb.has_permission(organisation_id, 'projects.edit'));

REVOKE ALL ON FUNCTION kb.validate_team_member_org() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.validate_issue_team_org() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION kb.clear_team_assignments_on_soft_delete() FROM PUBLIC, anon, authenticated;
