-- Open-KB database functions and triggers.

CREATE FUNCTION kb.assign_issue_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_project_org_id UUID;
BEGIN
  SELECT p.organisation_id
  INTO v_project_org_id
  FROM kb.projects p
  WHERE p.id = NEW.project_id
    AND p.deleted_at IS NULL;

  IF v_project_org_id IS NULL THEN
    RAISE EXCEPTION 'Open-KB project % does not exist', NEW.project_id;
  END IF;

  IF v_project_org_id <> NEW.organisation_id THEN
    RAISE EXCEPTION 'Issue organisation must match project organisation';
  END IF;

  IF NEW.sequence_id IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::TEXT));

    SELECT COALESCE(MAX(sequence_id), 0) + 1
    INTO NEW.sequence_id
    FROM kb.issues
    WHERE project_id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.create_default_project_states()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
BEGIN
  INSERT INTO kb.states (organisation_id, project_id, name, group_key, color, sort_order, is_default, created_by)
  VALUES
    (NEW.organisation_id, NEW.id, 'Backlog', 'backlog', '#64748b', 10, true, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'In Progress', 'started', '#2563eb', 20, false, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'Done', 'completed', '#16a34a', 30, false, NEW.created_by);

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.validate_project_team_org()
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
    RAISE EXCEPTION 'Project team must belong to the same organisation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.has_app_seat(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members om
    JOIN public.organisation_member_app_seats mas
      ON mas.org_member_id = om.id
     AND mas.app_code = 'open-kb'
    WHERE om.org_id = p_org_id
      AND om.user_id = auth.uid()
  );
$$;

CREATE FUNCTION kb.has_permission(p_org_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, kb
AS $$
BEGIN
  IF NOT kb.has_app_seat(p_org_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    WITH current_membership AS (
      SELECT om.id AS org_member_id, om.org_id, om.role AS org_role, omr.role_id
      FROM public.organisation_members om
      LEFT JOIN kb.organisation_member_roles omr
        ON omr.org_member_id = om.id
      WHERE om.org_id = p_org_id
        AND om.user_id = auth.uid()
    ),
    assigned_permissions AS (
      SELECT ap.code AS permission_code
      FROM current_membership cm
      JOIN kb.app_permissions ap ON TRUE
      WHERE cm.org_role = 'owner'
      UNION
      SELECT rp.permission_code
      FROM current_membership cm
      JOIN kb.role_permissions rp ON rp.role_id = cm.role_id
      WHERE cm.org_role <> 'owner'
    ),
    permission_edges(source_code, implied_code) AS (
      VALUES
        ('projects.create', 'projects.view'),
        ('projects.edit', 'projects.view'),
        ('projects.delete', 'projects.view'),
        ('projects.members.manage', 'projects.view'),
        ('issues.create', 'issues.view'),
        ('issues.edit', 'issues.view'),
        ('issues.delete', 'issues.view'),
        ('planning.manage', 'planning.view'),
        ('intake.manage', 'intake.view'),
        ('automation.manage', 'settings.view'),
        ('settings.roles.manage', 'settings.view'),
        ('settings.integrations.manage', 'settings.view'),
        ('analytics.view', 'dashboard.view'),
        ('projects.view', 'dashboard.view'),
        ('issues.view', 'dashboard.view')
    ),
    expanded_permissions AS (
      SELECT permission_code AS code
      FROM assigned_permissions
      UNION
      SELECT pe.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe ON pe.source_code = ap.permission_code
      UNION
      SELECT pe2.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
      JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
    )
    SELECT 1
    FROM expanded_permissions ep
    WHERE ep.code = p_permission_code
  );
END;
$$;

CREATE FUNCTION kb.has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = kb, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM kb.projects p
    WHERE p.id = p_project_id
      AND kb.has_app_seat(p.organisation_id)
      AND (
        kb.has_permission(p.organisation_id, 'projects.view')
        OR EXISTS (
          SELECT 1
          FROM kb.project_members pm
          WHERE pm.project_id = p.id
            AND pm.profile_id = auth.uid()
            AND pm.deleted_at IS NULL
        )
      )
  );
$$;

CREATE FUNCTION kb.enqueue_github_comment_sync(p_comment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_comment RECORD;
  v_repository_id UUID;
  v_issue_number INTEGER;
  v_sync_id UUID;
  v_actor_id UUID;
BEGIN
  SELECT
    c.id,
    c.organisation_id,
    c.project_id,
    c.issue_id,
    c.description_text,
    c.created_by
  INTO v_comment
  FROM kb.issue_comments c
  JOIN kb.issues i
    ON i.id = c.issue_id
   AND i.organisation_id = c.organisation_id
   AND i.project_id = c.project_id
   AND i.deleted_at IS NULL
  WHERE c.id = p_comment_id
    AND c.deleted_at IS NULL;

  IF v_comment.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_actor_id := coalesce(auth.uid(), v_comment.created_by);

  IF NOT EXISTS (
    SELECT 1
    FROM kb.feature_flags ff
    WHERE ff.organisation_id = v_comment.organisation_id
      AND ff.github_sync_enabled
  ) THEN
    RETURN NULL;
  END IF;

  SELECT gis.github_repository_id, gis.external_issue_number
  INTO v_repository_id, v_issue_number
  FROM kb.github_issue_syncs gis
  JOIN kb.github_repositories gr
    ON gr.id = gis.github_repository_id
   AND gr.organisation_id = gis.organisation_id
   AND gr.deleted_at IS NULL
   AND gr.organisation_integration_id IS NOT NULL
  JOIN kb.organisation_integrations oi
    ON oi.id = gr.organisation_integration_id
   AND oi.organisation_id = gis.organisation_id
   AND oi.provider = 'github'
   AND oi.status = 'connected'
   AND oi.deleted_at IS NULL
  WHERE gis.organisation_id = v_comment.organisation_id
    AND gis.issue_id = v_comment.issue_id
    AND gis.external_issue_number IS NOT NULL
    AND gis.deleted_at IS NULL
  ORDER BY COALESCE(gis.updated_at, gis.created_at) DESC
  LIMIT 1;

  IF v_repository_id IS NULL OR v_issue_number IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT gcs.id
  INTO v_sync_id
  FROM kb.github_comment_syncs gcs
  WHERE gcs.organisation_id = v_comment.organisation_id
    AND gcs.comment_id = v_comment.id
    AND gcs.github_repository_id = v_repository_id
    AND gcs.sync_direction = 'outbound'
    AND gcs.deleted_at IS NULL
  LIMIT 1;

  IF v_sync_id IS NOT NULL THEN
    RETURN v_sync_id;
  END IF;

  INSERT INTO kb.github_comment_syncs (
    organisation_id,
    project_id,
    issue_id,
    comment_id,
    github_repository_id,
    sync_direction,
    status,
    title,
    payload,
    created_by
  )
  VALUES (
    v_comment.organisation_id,
    v_comment.project_id,
    v_comment.issue_id,
    v_comment.id,
    v_repository_id,
    'outbound',
    'outbound_pending',
    'Outbound GitHub comment',
    jsonb_build_object(
      'direction', 'outbound',
      'source', 'kb',
      'issue_number', v_issue_number,
      'comment_preview', left(coalesce(v_comment.description_text, ''), 280)
    ),
    v_actor_id
  )
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT gcs.id
    INTO v_sync_id
    FROM kb.github_comment_syncs gcs
    WHERE gcs.organisation_id = v_comment.organisation_id
      AND gcs.comment_id = v_comment.id
      AND gcs.github_repository_id = v_repository_id
      AND gcs.sync_direction = 'outbound'
      AND gcs.deleted_at IS NULL
    LIMIT 1;
    RETURN v_sync_id;
END;
$$;

CREATE FUNCTION kb.enqueue_slack_comment_sync(p_comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_comment RECORD;
  v_inserted_count INTEGER := 0;
  v_actor_id UUID;
BEGIN
  SELECT
    c.id,
    c.organisation_id,
    c.project_id,
    c.issue_id,
    c.description_text,
    c.created_by,
    i.sequence_id,
    p.identifier AS project_identifier
  INTO v_comment
  FROM kb.issue_comments c
  JOIN kb.issues i
    ON i.id = c.issue_id
   AND i.organisation_id = c.organisation_id
   AND i.project_id = c.project_id
   AND i.deleted_at IS NULL
  JOIN kb.projects p
    ON p.id = c.project_id
   AND p.organisation_id = c.organisation_id
   AND p.deleted_at IS NULL
  WHERE c.id = p_comment_id
    AND c.deleted_at IS NULL;

  IF v_comment.id IS NULL THEN
    RETURN 0;
  END IF;

  v_actor_id := coalesce(auth.uid(), v_comment.created_by);

  IF NOT EXISTS (
    SELECT 1
    FROM kb.feature_flags ff
    WHERE ff.organisation_id = v_comment.organisation_id
      AND ff.slack_sync_enabled
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO kb.slack_project_syncs (
    organisation_id,
    project_id,
    issue_id,
    comment_id,
    organisation_integration_id,
    channel_id,
    channel_name,
    sync_direction,
    status,
    title,
    payload,
    created_by
  )
  SELECT
    mapping.organisation_id,
    mapping.project_id,
    v_comment.issue_id,
    v_comment.id,
    mapping.organisation_integration_id,
    mapping.channel_id,
    mapping.channel_name,
    'outbound',
    'outbound_pending',
    'Outbound Slack comment',
    jsonb_build_object(
      'direction', 'outbound',
      'source', 'kb',
      'issue_key', v_comment.project_identifier || '-' || v_comment.sequence_id::text,
      'comment_preview', left(coalesce(v_comment.description_text, ''), 280)
    ),
    v_actor_id
  FROM kb.slack_project_syncs mapping
  JOIN kb.organisation_integrations oi
    ON oi.id = mapping.organisation_integration_id
   AND oi.organisation_id = mapping.organisation_id
   AND oi.provider = 'slack'
   AND oi.status = 'connected'
   AND oi.deleted_at IS NULL
  WHERE mapping.organisation_id = v_comment.organisation_id
    AND mapping.project_id = v_comment.project_id
    AND mapping.channel_id IS NOT NULL
    AND mapping.sync_direction = 'inbound'
    AND mapping.deleted_at IS NULL
    AND coalesce(mapping.status, 'active') IN ('active', 'received', 'processed')
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$;

CREATE FUNCTION kb.enqueue_issue_comment_provider_syncs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    BEGIN
      PERFORM kb.enqueue_github_comment_sync(NEW.id);
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;

    BEGIN
      PERFORM kb.enqueue_slack_comment_sync(NEW.id);
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.handle_provider_integration_disconnect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'disconnected'
    OR OLD.status IS NOT DISTINCT FROM 'disconnected'
  THEN
    RETURN NEW;
  END IF;

  IF NEW.provider = 'github' THEN
    UPDATE kb.github_repositories
    SET status = 'disabled',
        updated_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE organisation_id = NEW.organisation_id
      AND organisation_integration_id = NEW.id
      AND deleted_at IS NULL;

    UPDATE kb.github_comment_syncs gcs
    SET status = 'waiting',
        next_retry_at = timezone('utc'::text, now()) + interval '1 day',
        last_error_text = 'github_integration_disconnected',
        payload = coalesce(gcs.payload, '{}'::jsonb)
          || jsonb_build_object('disconnect_pause_at', timezone('utc'::text, now()))
    WHERE gcs.organisation_id = NEW.organisation_id
      AND gcs.sync_direction = 'outbound'
      AND gcs.deleted_at IS NULL
      AND gcs.status IN ('outbound_pending', 'retrying', 'waiting');
  ELSIF NEW.provider = 'slack' THEN
    UPDATE kb.slack_project_syncs
    SET status = 'disabled',
        updated_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE organisation_id = NEW.organisation_id
      AND organisation_integration_id = NEW.id
      AND sync_direction = 'inbound'
      AND deleted_at IS NULL;

    UPDATE kb.slack_project_syncs sps
    SET status = 'waiting',
        next_retry_at = timezone('utc'::text, now()) + interval '1 day',
        last_error_text = 'slack_integration_disconnected',
        payload = coalesce(sps.payload, '{}'::jsonb)
          || jsonb_build_object('disconnect_pause_at', timezone('utc'::text, now()))
    WHERE sps.organisation_id = NEW.organisation_id
      AND sps.organisation_integration_id = NEW.id
      AND sps.sync_direction = 'outbound'
      AND sps.deleted_at IS NULL
      AND sps.status IN ('outbound_pending', 'retrying', 'waiting');
  END IF;

  UPDATE kb.integration_credentials
  SET revoked_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now()),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'revoked_by', auth.uid(),
          'revoked_reason', 'manual_disconnect',
          'revoked_at', timezone('utc'::text, now())
        )
  WHERE organisation_integration_id = NEW.id
    AND revoked_at IS NULL;

  NEW.access_token_hash := NULL;
  NEW.refresh_token_hash := NULL;
  NEW.expires_at := NULL;
  NEW.updated_by := auth.uid();
  NEW.updated_at := timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.ensure_role(p_org_id UUID, p_name TEXT, p_rank INTEGER)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  INSERT INTO kb.roles (organisation_id, name, description, role_rank)
  VALUES (p_org_id, p_name, p_name || ' Open-KB role', p_rank)
  ON CONFLICT (organisation_id, name) DO UPDATE
    SET role_rank = EXCLUDED.role_rank
  RETURNING id INTO v_role_id;

  IF lower(p_name) = 'owner' THEN
    INSERT INTO kb.role_permissions (role_id, permission_code)
    SELECT v_role_id, code
    FROM kb.app_permissions
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  ELSIF lower(p_name) = 'default' THEN
    INSERT INTO kb.role_permissions (role_id, permission_code)
    VALUES
      (v_role_id, 'dashboard.view'),
      (v_role_id, 'projects.view'),
      (v_role_id, 'issues.view'),
      (v_role_id, 'planning.view'),
      (v_role_id, 'intake.view'),
      (v_role_id, 'analytics.view'),
      (v_role_id, 'settings.view')
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  RETURN v_role_id;
END;
$$;

CREATE FUNCTION kb.assign_default_role_for_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_org_id UUID;
  v_role_id UUID;
  v_org_role TEXT;
BEGIN
  IF NEW.app_code <> 'open-kb' THEN
    RETURN NEW;
  END IF;

  SELECT om.org_id, om.role
  INTO v_org_id, v_org_role
  FROM public.organisation_members om
  WHERE om.id = NEW.org_member_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT kb.ensure_role(
    v_org_id,
    CASE WHEN v_org_role = 'owner' THEN 'Owner' ELSE 'Default' END,
    CASE WHEN v_org_role = 'owner' THEN 1000 ELSE 100 END
  )
  INTO v_role_id;

  INSERT INTO kb.organisation_member_roles (org_member_id, role_id)
  VALUES (NEW.org_member_id, v_role_id)
  ON CONFLICT (org_member_id) DO UPDATE
    SET role_id = EXCLUDED.role_id;

  RETURN NEW;
END;
$$;

CREATE FUNCTION kb.ensure_owner_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_owner_member_id UUID;
  v_free_seat_limit INTEGER;
  v_owner_role_id UUID;
BEGIN
  SELECT settings.free_seat_limit
  INTO v_free_seat_limit
  FROM public.platform_instance_settings settings
  WHERE settings.id = true;

  INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
  VALUES (NEW.id, 'open-kb', v_free_seat_limit)
  ON CONFLICT (org_id, app_code) DO NOTHING;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = 'owner';

  SELECT id
  INTO v_owner_member_id
  FROM public.organisation_members
  WHERE org_id = NEW.id
    AND user_id = NEW.owner_id
  LIMIT 1;

  IF v_owner_member_id IS NOT NULL THEN
    INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
    VALUES (v_owner_member_id, 'open-kb')
    ON CONFLICT (org_member_id, app_code) DO NOTHING;

    SELECT kb.ensure_role(NEW.id, 'Owner', 1000)
    INTO v_owner_role_id;

    INSERT INTO kb.organisation_member_roles (org_member_id, role_id)
    VALUES (v_owner_member_id, v_owner_role_id)
    ON CONFLICT (org_member_id) DO UPDATE
      SET role_id = EXCLUDED.role_id;
  END IF;

  INSERT INTO kb.feature_flags (organisation_id)
  VALUES (NEW.id)
  ON CONFLICT (organisation_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_kb_default_role_for_seat
  AFTER INSERT ON public.organisation_member_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION kb.assign_default_role_for_seat();

CREATE TRIGGER trg_ensure_kb_owner_seat
  AFTER INSERT OR UPDATE OF owner_id ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION kb.ensure_owner_seat();

CREATE TRIGGER trg_kb_project_default_states
  AFTER INSERT ON kb.projects
  FOR EACH ROW
  EXECUTE FUNCTION kb.create_default_project_states();

CREATE TRIGGER trg_kb_validate_project_team_org
  BEFORE INSERT OR UPDATE OF organisation_id, team_id ON kb.projects
  FOR EACH ROW
  EXECUTE FUNCTION kb.validate_project_team_org();

CREATE TRIGGER trg_kb_issue_sequence
  BEFORE INSERT ON kb.issues
  FOR EACH ROW
  EXECUTE FUNCTION kb.assign_issue_sequence();

CREATE FUNCTION kb.should_skip_workflow()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('kb.skip_workflow', true), '') = 'on';
$$;

CREATE FUNCTION kb.apply_workflow_action(
  p_issue kb.issues,
  p_action kb.workflow_rule_actions
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_profile_id TEXT;
  v_item JSONB;
  v_subtask_title TEXT;
  v_subtask_state_id UUID;
  v_subtask_priority TEXT;
  v_due_date DATE;
BEGIN
  CASE p_action.action_type
    WHEN 'assign_users' THEN
      FOR v_profile_id IN
        SELECT jsonb_array_elements_text(coalesce(p_action.config->'profile_ids', '[]'::jsonb))
      LOOP
        IF NOT EXISTS (
          SELECT 1
          FROM kb.issue_assignees ia
          WHERE ia.issue_id = p_issue.id
            AND ia.profile_id = v_profile_id::uuid
            AND ia.deleted_at IS NULL
        ) THEN
          INSERT INTO kb.issue_assignees (
            organisation_id,
            project_id,
            issue_id,
            profile_id
          )
          VALUES (
            p_issue.organisation_id,
            p_issue.project_id,
            p_issue.id,
            v_profile_id::uuid
          );
        END IF;
      END LOOP;

    WHEN 'assign_team' THEN
      IF p_action.config ? 'team_id' AND nullif(p_action.config->>'team_id', '') IS NOT NULL THEN
        UPDATE kb.issues
        SET team_id = (p_action.config->>'team_id')::uuid
        WHERE id = p_issue.id
          AND organisation_id = p_issue.organisation_id;
      END IF;

    WHEN 'set_due_date' THEN
      IF coalesce(p_action.config->>'mode', '') = 'absolute'
        AND nullif(p_action.config->>'date', '') IS NOT NULL THEN
        v_due_date := (p_action.config->>'date')::date;
      ELSIF coalesce(p_action.config->>'mode', '') = 'relative'
        AND (p_action.config->>'days') ~ '^-?[0-9]+$' THEN
        v_due_date := CURRENT_DATE + (p_action.config->>'days')::integer;
      END IF;

      IF v_due_date IS NOT NULL THEN
        UPDATE kb.issues
        SET target_date = v_due_date
        WHERE id = p_issue.id
          AND organisation_id = p_issue.organisation_id;
      END IF;

    WHEN 'add_comment' THEN
      IF nullif(btrim(p_action.config->>'text'), '') IS NOT NULL THEN
        INSERT INTO kb.issue_comments (
          organisation_id,
          project_id,
          issue_id,
          description_text,
          description_json,
          created_by
        )
        VALUES (
          p_issue.organisation_id,
          p_issue.project_id,
          p_issue.id,
          btrim(p_action.config->>'text'),
          jsonb_build_object(
            'type', 'doc',
            'content', jsonb_build_array(
              jsonb_build_object(
                'type', 'paragraph',
                'content', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', btrim(p_action.config->>'text'))
                )
              )
            )
          ),
          coalesce(auth.uid(), p_issue.created_by)
        );
      END IF;

    WHEN 'create_subtasks' THEN
      FOR v_item IN
        SELECT value
        FROM jsonb_array_elements(coalesce(p_action.config->'items', '[]'::jsonb))
      LOOP
        v_subtask_title := nullif(btrim(v_item->>'title'), '');
        IF v_subtask_title IS NULL THEN
          CONTINUE;
        END IF;

        v_subtask_state_id := NULL;
        IF nullif(v_item->>'state_id', '') IS NOT NULL THEN
          v_subtask_state_id := (v_item->>'state_id')::uuid;
        END IF;

        v_subtask_priority := coalesce(nullif(v_item->>'priority', ''), p_issue.priority, 'none');
        IF v_subtask_priority NOT IN ('none', 'low', 'medium', 'high', 'urgent') THEN
          v_subtask_priority := 'none';
        END IF;

        INSERT INTO kb.issues (
          organisation_id,
          project_id,
          parent_issue_id,
          title,
          priority,
          state_id,
          created_by
        )
        VALUES (
          p_issue.organisation_id,
          p_issue.project_id,
          p_issue.id,
          v_subtask_title,
          v_subtask_priority,
          v_subtask_state_id,
          coalesce(auth.uid(), p_issue.created_by)
        );
      END LOOP;

    ELSE
      NULL;
  END CASE;
END;
$$;

CREATE FUNCTION kb.run_issue_workflow_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kb, public
AS $$
DECLARE
  v_rule RECORD;
  v_action RECORD;
  v_previous_state_id UUID;
BEGIN
  IF kb.should_skip_workflow() THEN
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('kb.skip_workflow', 'on', true);

  IF TG_OP = 'INSERT' THEN
    FOR v_rule IN
      SELECT wr.*
      FROM kb.workflow_rules wr
      WHERE wr.organisation_id = NEW.organisation_id
        AND wr.project_id = NEW.project_id
        AND wr.deleted_at IS NULL
        AND wr.enabled
        AND wr.trigger_event = 'issue_created'
        AND (wr.state_id IS NULL OR wr.state_id = NEW.state_id)
      ORDER BY wr.sort_order, wr.created_at
    LOOP
      FOR v_action IN
        SELECT wra.*
        FROM kb.workflow_rule_actions wra
        WHERE wra.rule_id = v_rule.id
          AND wra.deleted_at IS NULL
        ORDER BY wra.sort_order, wra.created_at
      LOOP
        PERFORM kb.apply_workflow_action(NEW, v_action);
      END LOOP;

      INSERT INTO kb.issue_activities (
        organisation_id,
        project_id,
        issue_id,
        name,
        title,
        status,
        payload
      )
      VALUES (
        NEW.organisation_id,
        NEW.project_id,
        NEW.id,
        'workflow.executed',
        format('Workflow rule "%s" ran', v_rule.name),
        'active',
        jsonb_build_object(
          'event', 'workflow.executed',
          'entity', 'workflow_rule',
          'entity_id', v_rule.id,
          'current', jsonb_build_object(
            'rule_id', v_rule.id,
            'rule_name', v_rule.name,
            'trigger_event', v_rule.trigger_event
          )
        )
      );
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.state_id IS DISTINCT FROM OLD.state_id THEN
    v_previous_state_id := OLD.state_id;

    FOR v_rule IN
      SELECT wr.*
      FROM kb.workflow_rules wr
      WHERE wr.organisation_id = NEW.organisation_id
        AND wr.project_id = NEW.project_id
        AND wr.deleted_at IS NULL
        AND wr.enabled
        AND wr.trigger_event = 'state_entered'
        AND wr.state_id = NEW.state_id
      ORDER BY wr.sort_order, wr.created_at
    LOOP
      FOR v_action IN
        SELECT wra.*
        FROM kb.workflow_rule_actions wra
        WHERE wra.rule_id = v_rule.id
          AND wra.deleted_at IS NULL
        ORDER BY wra.sort_order, wra.created_at
      LOOP
        PERFORM kb.apply_workflow_action(NEW, v_action);
      END LOOP;

      INSERT INTO kb.issue_activities (
        organisation_id,
        project_id,
        issue_id,
        name,
        title,
        status,
        payload
      )
      VALUES (
        NEW.organisation_id,
        NEW.project_id,
        NEW.id,
        'workflow.executed',
        format('Workflow rule "%s" ran', v_rule.name),
        'active',
        jsonb_build_object(
          'event', 'workflow.executed',
          'entity', 'workflow_rule',
          'entity_id', v_rule.id,
          'current', jsonb_build_object(
            'rule_id', v_rule.id,
            'rule_name', v_rule.name,
            'trigger_event', v_rule.trigger_event,
            'previous_state_id', v_previous_state_id,
            'state_id', NEW.state_id
          )
        )
      );
    END LOOP;
  END IF;

  PERFORM set_config('kb.skip_workflow', 'off', true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('kb.skip_workflow', 'off', true);
    RAISE;
END;
$$;

CREATE TRIGGER trg_kb_issue_workflow_rules
  AFTER INSERT OR UPDATE OF state_id ON kb.issues
  FOR EACH ROW
  EXECUTE FUNCTION kb.run_issue_workflow_rules();

CREATE TRIGGER trg_kb_issue_comment_provider_syncs
  AFTER INSERT ON kb.issue_comments
  FOR EACH ROW
  EXECUTE FUNCTION kb.enqueue_issue_comment_provider_syncs();

CREATE TRIGGER trg_kb_provider_integration_disconnect
  BEFORE UPDATE OF status ON kb.organisation_integrations
  FOR EACH ROW
  EXECUTE FUNCTION kb.handle_provider_integration_disconnect();

-- Backfill Open-KB access for organisations that existed before Open-KB was
-- installed into this OpenSe instance.
INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
SELECT o.id, 'open-kb', settings.free_seat_limit
FROM public.organisations o
CROSS JOIN public.platform_instance_settings settings
WHERE settings.id = true
ON CONFLICT (org_id, app_code) DO UPDATE
SET seat_limit = CASE
  WHEN public.organisation_app_seats.seat_limit = 0 THEN EXCLUDED.seat_limit
  ELSE public.organisation_app_seats.seat_limit
END;

INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT om.id, 'open-kb'
FROM public.organisation_members om
JOIN public.organisations o
  ON o.id = om.org_id
 AND o.owner_id = om.user_id
ON CONFLICT (org_member_id, app_code) DO NOTHING;

INSERT INTO kb.feature_flags (organisation_id)
SELECT id
FROM public.organisations
ON CONFLICT (organisation_id) DO NOTHING;

INSERT INTO kb.organisation_member_roles (org_member_id, role_id)
SELECT om.id, kb.ensure_role(om.org_id, 'Owner', 1000)
FROM public.organisation_members om
JOIN public.organisations o
  ON o.id = om.org_id
 AND o.owner_id = om.user_id
ON CONFLICT (org_member_id) DO UPDATE
  SET role_id = EXCLUDED.role_id;
