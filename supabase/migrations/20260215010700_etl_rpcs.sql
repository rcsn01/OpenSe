-- ============================================================
-- Baseline: ETL RPCs (Invite + Usage Analytics)
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_invite(invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_email := (SELECT auth.jwt() ->> 'email');

  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM etl.organisation_invites
  WHERE id = invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.email <> v_user_email THEN
    RAISE EXCEPTION 'This invite does not belong to you';
  END IF;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, v_invite.role)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

  INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
  SELECT om.id, 'etl'
  FROM public.organisation_members om
  WHERE om.org_id = v_invite.org_id
    AND om.user_id = v_user_id
  ON CONFLICT (org_member_id, app_code) DO NOTHING;

  DELETE FROM etl.organisation_invites WHERE id = invite_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_usage_stats(target_org_id UUID)
RETURNS TABLE(success_count BIGINT, failed_count BIGINT, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE status = 'success') AS success_count,
    count(*) FILTER (WHERE status = 'failed') AS failed_count,
    count(*) AS total_count
  FROM etl.workflow_executions
  WHERE org_id = target_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_usage_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_usage_stats(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_usage_stats(target_user_id UUID)
RETURNS TABLE(personal_success BIGINT, personal_failed BIGINT, org_success BIGINT, org_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE org_id IS NULL AND status = 'success'),
    count(*) FILTER (WHERE org_id IS NULL AND status = 'failed'),
    count(*) FILTER (WHERE org_id IS NOT NULL AND status = 'success'),
    count(*) FILTER (WHERE org_id IS NOT NULL AND status = 'failed')
  FROM etl.workflow_executions
  WHERE user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_usage_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_usage_stats(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_all_orgs_usage_stats()
RETURNS TABLE(org_id UUID, success_count BIGINT, failed_count BIGINT, total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    we.org_id,
    count(*) FILTER (WHERE we.status = 'success'),
    count(*) FILTER (WHERE we.status = 'failed'),
    count(*)
  FROM etl.workflow_executions we
  WHERE we.org_id IS NOT NULL
  GROUP BY we.org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_orgs_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_orgs_usage_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_all_users_usage_stats()
RETURNS TABLE(user_id UUID, personal_success BIGINT, personal_failed BIGINT, org_success BIGINT, org_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    we.user_id,
    count(*) FILTER (WHERE we.org_id IS NULL AND we.status = 'success'),
    count(*) FILTER (WHERE we.org_id IS NULL AND we.status = 'failed'),
    count(*) FILTER (WHERE we.org_id IS NOT NULL AND we.status = 'success'),
    count(*) FILTER (WHERE we.org_id IS NOT NULL AND we.status = 'failed')
  FROM etl.workflow_executions we
  GROUP BY we.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_users_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_users_usage_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_member_usage_stats(target_org_id UUID)
RETURNS TABLE(total_count BIGINT, success_count BIGINT, failed_count BIGINT, daily_date DATE, daily_total BIGINT, daily_success BIGINT, daily_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_org_member(target_org_id, auth.uid())
     AND NOT public.is_org_owner(target_org_id, auth.uid())
     AND NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT
      count(*)::BIGINT,
      count(*) FILTER (WHERE we.status = 'success')::BIGINT,
      count(*) FILTER (WHERE we.status = 'failed')::BIGINT,
      we.started_at::DATE AS daily_date,
      count(*)::BIGINT,
      count(*) FILTER (WHERE we.status = 'success')::BIGINT,
      count(*) FILTER (WHERE we.status = 'failed')::BIGINT
    FROM etl.workflow_executions we
    INNER JOIN etl.workflows w ON w.id = we.workflow_id
    WHERE w.org_id = target_org_id
      AND we.started_at >= now() - INTERVAL '30 days'
    GROUP BY we.started_at::DATE
    ORDER BY daily_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_member_usage_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_member_usage_stats(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_org_active_users(target_org_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT, execution_count BIGINT, last_active TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_org_member(target_org_id, auth.uid())
     AND NOT public.is_org_owner(target_org_id, auth.uid())
     AND NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT
      we.user_id,
      p.email,
      p.full_name,
      count(*)::BIGINT AS execution_count,
      max(we.started_at) AS last_active
    FROM etl.workflow_executions we
    INNER JOIN etl.workflows w ON w.id = we.workflow_id
    INNER JOIN public.profiles p ON p.id = we.user_id
    WHERE w.org_id = target_org_id
      AND we.started_at >= now() - INTERVAL '30 days'
    GROUP BY we.user_id, p.email, p.full_name
    ORDER BY execution_count DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_active_users(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_org_active_users(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_personal_usage_stats()
RETURNS TABLE(daily_date DATE, daily_total BIGINT, daily_success BIGINT, daily_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  RETURN QUERY
    SELECT
      we.started_at::DATE,
      count(*)::BIGINT,
      count(*) FILTER (WHERE we.status = 'success')::BIGINT,
      count(*) FILTER (WHERE we.status = 'failed')::BIGINT
    FROM etl.workflow_executions we
    INNER JOIN etl.workflows w ON w.id = we.workflow_id
    WHERE w.owner_id = auth.uid()
      AND w.org_id IS NULL
      AND we.started_at >= now() - INTERVAL '30 days'
    GROUP BY we.started_at::DATE
    ORDER BY daily_date;
END;
$$;

REVOKE ALL ON FUNCTION public.get_personal_usage_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_personal_usage_stats() TO authenticated;
