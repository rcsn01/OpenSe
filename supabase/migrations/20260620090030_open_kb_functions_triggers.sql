-- Open-KB database functions and triggers.

CREATE FUNCTION open_kb.assign_issue_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_project_org_id UUID;
BEGIN
  SELECT p.organisation_id
  INTO v_project_org_id
  FROM open_kb.projects p
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
    FROM open_kb.issues
    WHERE project_id = NEW.project_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION open_kb.create_default_project_states()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
BEGIN
  INSERT INTO open_kb.states (organisation_id, project_id, name, group_key, color, sort_order, is_default, created_by)
  VALUES
    (NEW.organisation_id, NEW.id, 'Backlog', 'backlog', '#64748b', 10, true, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'In Progress', 'started', '#2563eb', 20, false, NEW.created_by),
    (NEW.organisation_id, NEW.id, 'Done', 'completed', '#16a34a', 30, false, NEW.created_by);

  RETURN NEW;
END;
$$;

CREATE FUNCTION open_kb.validate_project_team_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_team_org_id UUID;
BEGIN
  IF NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.organisation_id
  INTO v_team_org_id
  FROM open_kb.teams t
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

CREATE FUNCTION open_kb.public_deploy_board(p_slug TEXT)
RETURNS TABLE (
  board_id UUID,
  organisation_id UUID,
  project_id UUID,
  slug TEXT,
  title TEXT,
  description_text TEXT,
  status TEXT,
  payload JSONB,
  project_name TEXT,
  project_identifier TEXT,
  project_description_text TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = open_kb, public
AS $$
  SELECT
    b.id AS board_id,
    b.organisation_id,
    b.project_id,
    b.slug,
    COALESCE(b.title, b.name, p.name) AS title,
    b.description_text,
    b.status,
    b.payload,
    p.name AS project_name,
    p.identifier AS project_identifier,
    p.description_text AS project_description_text
  FROM open_kb.project_deploy_boards b
  JOIN open_kb.projects p
    ON p.id = b.project_id
   AND p.organisation_id = b.organisation_id
  WHERE lower(b.slug) = lower(trim(p_slug))
    AND b.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND p.visibility = 'public'
    AND COALESCE(b.status, 'active') = 'active'
  LIMIT 1;
$$;

CREATE FUNCTION open_kb.public_deploy_board_issues(p_slug TEXT)
RETURNS TABLE (
  issue_id UUID,
  project_id UUID,
  sequence_id INTEGER,
  title TEXT,
  description_text TEXT,
  priority TEXT,
  state_id UUID,
  state_name TEXT,
  state_group_key TEXT,
  state_color TEXT,
  start_date DATE,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = open_kb, public
AS $$
  WITH public_board AS (
    SELECT b.project_id
    FROM open_kb.project_deploy_boards b
    JOIN open_kb.projects p
      ON p.id = b.project_id
     AND p.organisation_id = b.organisation_id
    WHERE lower(b.slug) = lower(trim(p_slug))
      AND b.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND p.visibility = 'public'
      AND COALESCE(b.status, 'active') = 'active'
    LIMIT 1
  )
  SELECT
    i.id AS issue_id,
    i.project_id,
    i.sequence_id,
    i.title,
    i.description_text,
    i.priority,
    i.state_id,
    s.name AS state_name,
    s.group_key AS state_group_key,
    s.color AS state_color,
    i.start_date,
    i.target_date,
    i.completed_at,
    i.created_at,
    i.updated_at
  FROM open_kb.issues i
  JOIN public_board pb ON pb.project_id = i.project_id
  LEFT JOIN open_kb.states s ON s.id = i.state_id
  WHERE i.deleted_at IS NULL
    AND i.archived_at IS NULL
  ORDER BY
    COALESCE(s.sort_order, 9999),
    COALESCE(i.sequence_id, 999999),
    i.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION open_kb.public_deploy_board(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION open_kb.public_deploy_board_issues(TEXT) TO anon, authenticated, service_role;

CREATE FUNCTION open_kb.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = auth.uid()
  );
$$;

CREATE FUNCTION open_kb.has_app_seat(p_org_id UUID)
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

CREATE FUNCTION open_kb.has_permission(p_org_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, open_kb
AS $$
BEGIN
  IF NOT open_kb.has_app_seat(p_org_id) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    WITH current_membership AS (
      SELECT om.id AS org_member_id, om.org_id, om.role AS org_role, omr.role_id
      FROM public.organisation_members om
      LEFT JOIN open_kb.organisation_member_roles omr
        ON omr.org_member_id = om.id
      WHERE om.org_id = p_org_id
        AND om.user_id = auth.uid()
    ),
    assigned_permissions AS (
      SELECT ap.code AS permission_code
      FROM current_membership cm
      JOIN open_kb.app_permissions ap ON TRUE
      WHERE cm.org_role = 'owner'
      UNION
      SELECT rp.permission_code
      FROM current_membership cm
      JOIN open_kb.role_permissions rp ON rp.role_id = cm.role_id
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
        ('pages.manage', 'pages.view'),
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

CREATE FUNCTION open_kb.has_project_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = open_kb, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM open_kb.projects p
    WHERE p.id = p_project_id
      AND open_kb.has_app_seat(p.organisation_id)
      AND (
        open_kb.has_permission(p.organisation_id, 'projects.view')
        OR EXISTS (
          SELECT 1
          FROM open_kb.project_members pm
          WHERE pm.project_id = p.id
            AND pm.profile_id = auth.uid()
            AND pm.deleted_at IS NULL
        )
      )
  );
$$;

CREATE FUNCTION open_kb.enqueue_github_comment_sync(p_comment_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_comment RECORD;
  v_repository_id UUID;
  v_issue_number INTEGER;
  v_sync_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to enqueue GitHub comment sync'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    c.id,
    c.organisation_id,
    c.project_id,
    c.issue_id,
    c.description_text
  INTO v_comment
  FROM open_kb.issue_comments c
  JOIN open_kb.issues i
    ON i.id = c.issue_id
   AND i.organisation_id = c.organisation_id
   AND i.project_id = c.project_id
   AND i.deleted_at IS NULL
  WHERE c.id = p_comment_id
    AND c.deleted_at IS NULL;

  IF v_comment.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT open_kb.has_permission(v_comment.organisation_id, 'issues.edit')
    OR NOT open_kb.has_project_access(v_comment.project_id)
  THEN
    RAISE EXCEPTION 'Missing permission to enqueue GitHub comment sync'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM open_kb.feature_flags ff
    WHERE ff.organisation_id = v_comment.organisation_id
      AND ff.github_sync_enabled
  ) THEN
    RETURN NULL;
  END IF;

  SELECT gis.github_repository_id, gis.external_issue_number
  INTO v_repository_id, v_issue_number
  FROM open_kb.github_issue_syncs gis
  JOIN open_kb.github_repositories gr
    ON gr.id = gis.github_repository_id
   AND gr.organisation_id = gis.organisation_id
   AND gr.deleted_at IS NULL
   AND gr.organisation_integration_id IS NOT NULL
  JOIN open_kb.organisation_integrations oi
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
  FROM open_kb.github_comment_syncs gcs
  WHERE gcs.organisation_id = v_comment.organisation_id
    AND gcs.comment_id = v_comment.id
    AND gcs.github_repository_id = v_repository_id
    AND gcs.sync_direction = 'outbound'
    AND gcs.deleted_at IS NULL
  LIMIT 1;

  IF v_sync_id IS NOT NULL THEN
    RETURN v_sync_id;
  END IF;

  INSERT INTO open_kb.github_comment_syncs (
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
      'source', 'open_kb',
      'issue_number', v_issue_number,
      'comment_preview', left(coalesce(v_comment.description_text, ''), 280)
    ),
    auth.uid()
  )
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
EXCEPTION
  WHEN unique_violation THEN
    SELECT gcs.id
    INTO v_sync_id
    FROM open_kb.github_comment_syncs gcs
    WHERE gcs.organisation_id = v_comment.organisation_id
      AND gcs.comment_id = v_comment.id
      AND gcs.github_repository_id = v_repository_id
      AND gcs.sync_direction = 'outbound'
      AND gcs.deleted_at IS NULL
    LIMIT 1;
    RETURN v_sync_id;
END;
$$;

CREATE FUNCTION open_kb.enqueue_slack_comment_sync(p_comment_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_comment RECORD;
  v_inserted_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to enqueue Slack comment sync'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    c.id,
    c.organisation_id,
    c.project_id,
    c.issue_id,
    c.description_text,
    i.sequence_id,
    p.identifier AS project_identifier
  INTO v_comment
  FROM open_kb.issue_comments c
  JOIN open_kb.issues i
    ON i.id = c.issue_id
   AND i.organisation_id = c.organisation_id
   AND i.project_id = c.project_id
   AND i.deleted_at IS NULL
  JOIN open_kb.projects p
    ON p.id = c.project_id
   AND p.organisation_id = c.organisation_id
   AND p.deleted_at IS NULL
  WHERE c.id = p_comment_id
    AND c.deleted_at IS NULL;

  IF v_comment.id IS NULL THEN
    RETURN 0;
  END IF;

  IF NOT open_kb.has_permission(v_comment.organisation_id, 'issues.edit')
    OR NOT open_kb.has_project_access(v_comment.project_id)
  THEN
    RAISE EXCEPTION 'Missing permission to enqueue Slack comment sync'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM open_kb.feature_flags ff
    WHERE ff.organisation_id = v_comment.organisation_id
      AND ff.slack_sync_enabled
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO open_kb.slack_project_syncs (
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
      'source', 'open_kb',
      'issue_key', v_comment.project_identifier || '-' || v_comment.sequence_id::text,
      'comment_preview', left(coalesce(v_comment.description_text, ''), 280)
    ),
    auth.uid()
  FROM open_kb.slack_project_syncs mapping
  JOIN open_kb.organisation_integrations oi
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

CREATE FUNCTION open_kb.retry_provider_sync(p_provider TEXT, p_sync_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to retry provider sync'
      USING ERRCODE = '42501';
  END IF;

  IF p_provider = 'github' THEN
    SELECT organisation_id
    INTO v_org_id
    FROM open_kb.github_comment_syncs
    WHERE id = p_sync_id
      AND sync_direction = 'outbound'
      AND deleted_at IS NULL;
  ELSIF p_provider = 'slack' THEN
    SELECT organisation_id
    INTO v_org_id
    FROM open_kb.slack_project_syncs
    WHERE id = p_sync_id
      AND sync_direction = 'outbound'
      AND deleted_at IS NULL;
  ELSE
    RAISE EXCEPTION 'Unsupported provider sync retry provider: %', p_provider
      USING ERRCODE = '22023';
  END IF;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT open_kb.has_permission(v_org_id, 'settings.integrations.manage') THEN
    RAISE EXCEPTION 'Missing permission to retry provider sync'
      USING ERRCODE = '42501';
  END IF;

  IF p_provider = 'github' THEN
    UPDATE open_kb.github_comment_syncs
    SET status = 'retrying',
        attempt_count = 0,
        next_retry_at = NULL,
        processed_at = NULL,
        last_error_text = NULL,
        payload = coalesce(payload, '{}'::jsonb)
          || jsonb_build_object(
            'manual_retry', jsonb_build_object('requested_by', auth.uid(), 'at', timezone('utc'::text, now()))
          )
    WHERE id = p_sync_id
      AND organisation_id = v_org_id
      AND sync_direction = 'outbound'
      AND deleted_at IS NULL;
  ELSE
    UPDATE open_kb.slack_project_syncs
    SET status = 'retrying',
        attempt_count = 0,
        next_retry_at = NULL,
        processed_at = NULL,
        last_error_text = NULL,
        payload = coalesce(payload, '{}'::jsonb)
          || jsonb_build_object(
            'manual_retry', jsonb_build_object('requested_by', auth.uid(), 'at', timezone('utc'::text, now()))
          )
    WHERE id = p_sync_id
      AND organisation_id = v_org_id
      AND sync_direction = 'outbound'
      AND deleted_at IS NULL;
  END IF;

  RETURN true;
END;
$$;

CREATE FUNCTION open_kb.disconnect_provider_integration(p_org_id UUID, p_provider TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_integration_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to disconnect provider integration'
      USING ERRCODE = '42501';
  END IF;

  IF p_provider NOT IN ('github', 'slack') THEN
    RAISE EXCEPTION 'Unsupported provider integration disconnect provider: %', p_provider
      USING ERRCODE = '22023';
  END IF;

  IF NOT open_kb.has_permission(p_org_id, 'settings.integrations.manage') THEN
    RAISE EXCEPTION 'Missing permission to disconnect provider integration'
      USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO v_integration_id
  FROM open_kb.organisation_integrations
  WHERE organisation_id = p_org_id
    AND provider = p_provider
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_integration_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE open_kb.integration_credentials
  SET revoked_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now()),
      metadata = coalesce(metadata, '{}'::jsonb)
        || jsonb_build_object(
          'revoked_by', auth.uid(),
          'revoked_reason', 'manual_disconnect',
          'revoked_at', timezone('utc'::text, now())
        )
  WHERE organisation_integration_id = v_integration_id
    AND revoked_at IS NULL;

  UPDATE open_kb.organisation_integrations
  SET status = 'disconnected',
      access_token_hash = NULL,
      refresh_token_hash = NULL,
      expires_at = NULL,
      updated_by = auth.uid(),
      updated_at = timezone('utc'::text, now())
  WHERE id = v_integration_id;

  IF p_provider = 'github' THEN
    UPDATE open_kb.github_repositories
    SET status = 'disabled',
        updated_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE organisation_id = p_org_id
      AND organisation_integration_id = v_integration_id
      AND deleted_at IS NULL;

    UPDATE open_kb.github_comment_syncs gcs
    SET status = 'waiting',
        next_retry_at = timezone('utc'::text, now()) + interval '1 day',
        last_error_text = 'github_integration_disconnected',
        payload = coalesce(gcs.payload, '{}'::jsonb)
          || jsonb_build_object('disconnect_pause_at', timezone('utc'::text, now()))
    WHERE gcs.organisation_id = p_org_id
      AND gcs.sync_direction = 'outbound'
      AND gcs.deleted_at IS NULL
      AND gcs.status IN ('outbound_pending', 'retrying', 'waiting');
  ELSE
    UPDATE open_kb.slack_project_syncs
    SET status = 'disabled',
        updated_by = auth.uid(),
        updated_at = timezone('utc'::text, now())
    WHERE organisation_id = p_org_id
      AND organisation_integration_id = v_integration_id
      AND sync_direction = 'inbound'
      AND deleted_at IS NULL;

    UPDATE open_kb.slack_project_syncs sps
    SET status = 'waiting',
        next_retry_at = timezone('utc'::text, now()) + interval '1 day',
        last_error_text = 'slack_integration_disconnected',
        payload = coalesce(sps.payload, '{}'::jsonb)
          || jsonb_build_object('disconnect_pause_at', timezone('utc'::text, now()))
    WHERE sps.organisation_id = p_org_id
      AND sps.organisation_integration_id = v_integration_id
      AND sps.sync_direction = 'outbound'
      AND sps.deleted_at IS NULL
      AND sps.status IN ('outbound_pending', 'retrying', 'waiting');
  END IF;

  RETURN true;
END;
$$;

CREATE FUNCTION open_kb.ensure_role(p_org_id UUID, p_name TEXT, p_rank INTEGER)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  INSERT INTO open_kb.roles (organisation_id, name, description, role_rank)
  VALUES (p_org_id, p_name, p_name || ' Open-KB role', p_rank)
  ON CONFLICT (organisation_id, name) DO UPDATE
    SET role_rank = EXCLUDED.role_rank
  RETURNING id INTO v_role_id;

  IF lower(p_name) = 'owner' THEN
    INSERT INTO open_kb.role_permissions (role_id, permission_code)
    SELECT v_role_id, code
    FROM open_kb.app_permissions
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  ELSIF lower(p_name) = 'default' THEN
    INSERT INTO open_kb.role_permissions (role_id, permission_code)
    VALUES
      (v_role_id, 'dashboard.view'),
      (v_role_id, 'projects.view'),
      (v_role_id, 'issues.view'),
      (v_role_id, 'planning.view'),
      (v_role_id, 'pages.view'),
      (v_role_id, 'intake.view'),
      (v_role_id, 'analytics.view'),
      (v_role_id, 'settings.view')
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  RETURN v_role_id;
END;
$$;

CREATE FUNCTION open_kb.assign_default_role_for_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
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

  SELECT open_kb.ensure_role(
    v_org_id,
    CASE WHEN v_org_role = 'owner' THEN 'Owner' ELSE 'Default' END,
    CASE WHEN v_org_role = 'owner' THEN 1000 ELSE 100 END
  )
  INTO v_role_id;

  INSERT INTO open_kb.organisation_member_roles (org_member_id, role_id)
  VALUES (NEW.org_member_id, v_role_id)
  ON CONFLICT (org_member_id) DO UPDATE
    SET role_id = EXCLUDED.role_id;

  RETURN NEW;
END;
$$;

CREATE FUNCTION open_kb.ensure_owner_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = open_kb, public
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

    SELECT open_kb.ensure_role(NEW.id, 'Owner', 1000)
    INTO v_owner_role_id;

    INSERT INTO open_kb.organisation_member_roles (org_member_id, role_id)
    VALUES (v_owner_member_id, v_owner_role_id)
    ON CONFLICT (org_member_id) DO UPDATE
      SET role_id = EXCLUDED.role_id;
  END IF;

  INSERT INTO open_kb.feature_flags (organisation_id)
  VALUES (NEW.id)
  ON CONFLICT (organisation_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_open_kb_default_role_for_seat
  AFTER INSERT ON public.organisation_member_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.assign_default_role_for_seat();

CREATE TRIGGER trg_ensure_open_kb_owner_seat
  AFTER INSERT OR UPDATE OF owner_id ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.ensure_owner_seat();

CREATE TRIGGER trg_open_kb_project_default_states
  AFTER INSERT ON open_kb.projects
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.create_default_project_states();

CREATE TRIGGER trg_open_kb_validate_project_team_org
  BEFORE INSERT OR UPDATE OF organisation_id, team_id ON open_kb.projects
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.validate_project_team_org();

CREATE TRIGGER trg_open_kb_issue_sequence
  BEFORE INSERT ON open_kb.issues
  FOR EACH ROW
  EXECUTE FUNCTION open_kb.assign_issue_sequence();

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

INSERT INTO open_kb.feature_flags (organisation_id)
SELECT id
FROM public.organisations
ON CONFLICT (organisation_id) DO NOTHING;

INSERT INTO open_kb.organisation_member_roles (org_member_id, role_id)
SELECT om.id, open_kb.ensure_role(om.org_id, 'Owner', 1000)
FROM public.organisation_members om
JOIN public.organisations o
  ON o.id = om.org_id
 AND o.owner_id = om.user_id
ON CONFLICT (org_member_id) DO UPDATE
  SET role_id = EXCLUDED.role_id;
