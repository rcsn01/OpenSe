-- ============================================================
-- Migration 0005: ETL Policies & RPCs
-- ============================================================

-- ─── ORGANISATIONS ───────────────────────────────────

CREATE POLICY "organisations_select_unified" ON etl.organisations
  FOR SELECT USING (
    owner_id = (SELECT auth.uid())
    OR public.is_org_member(id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisations_insert_super_admin" ON etl.organisations
  FOR INSERT WITH CHECK (public.is_app_super_admin());

CREATE POLICY "organisations_update_unified" ON etl.organisations
  FOR UPDATE USING (
    owner_id = (SELECT auth.uid())
    OR public.is_org_admin(id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisations_delete_owner_or_super" ON etl.organisations
  FOR DELETE USING (
    owner_id = (SELECT auth.uid())
    OR public.is_app_super_admin()
  );

-- ─── ORGANISATION MEMBERS ────────────────────────────

CREATE POLICY "org_members_select_unified" ON etl.organisation_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_org_member(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "org_members_insert_unified" ON etl.organisation_members
  FOR INSERT WITH CHECK (
    public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "org_members_update_unified" ON etl.organisation_members
  FOR UPDATE USING (
    public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "org_members_delete_unified" ON etl.organisation_members
  FOR DELETE USING (
    (
      public.is_org_owner(org_id, (SELECT auth.uid()))
      OR public.is_org_admin(org_id, (SELECT auth.uid()))
      OR public.is_app_super_admin()
    )
    AND NOT EXISTS (
      SELECT 1 FROM etl.organisations o
      WHERE o.id = organisation_members.org_id
        AND o.owner_id = organisation_members.user_id
    )
  );

-- ─── ORGANISATION INVITES ────────────────────────────

CREATE POLICY "invite_select_own" ON etl.organisation_invites
  FOR SELECT USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY "invite_select_admin" ON etl.organisation_invites
  FOR SELECT USING (
    public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "invite_insert_admin" ON etl.organisation_invites
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY "invite_delete_admin_or_user" ON etl.organisation_invites
  FOR DELETE USING (
    public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
    OR email = (SELECT auth.jwt() ->> 'email')
  );

-- ─── WORKFLOWS ───────────────────────────────────────

CREATE POLICY "workflows_select_unified" ON etl.workflows
  FOR SELECT USING (
    (org_id IS NULL AND owner_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM etl.organisation_members om
      WHERE om.org_id = workflows.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workflows_insert_owner_only" ON etl.workflows
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = owner_id);

CREATE POLICY "workflows_update_owner_or_member" ON etl.workflows
  FOR UPDATE USING (
    (SELECT auth.uid()) = owner_id
    OR EXISTS (
      SELECT 1 FROM etl.organisation_members om
      WHERE om.org_id = workflows.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workflows_delete_owner_or_member" ON etl.workflows
  FOR DELETE USING (
    (SELECT auth.uid()) = owner_id
    OR EXISTS (
      SELECT 1 FROM etl.organisation_members om
      WHERE om.org_id = workflows.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

-- ─── WORKFLOW EXECUTIONS ─────────────────────────────

CREATE POLICY "workflow_executions_select_unified" ON etl.workflow_executions
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM etl.organisation_members om
      WHERE om.org_id = workflow_executions.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workflow_executions_insert_self" ON etl.workflow_executions
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "workflow_executions_super_admin_select" ON etl.workflow_executions
  FOR SELECT USING (public.is_app_super_admin());

-- ─── WORKFLOW VERSIONS ───────────────────────────────

CREATE POLICY "versions_select" ON etl.workflow_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM etl.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY "versions_insert" ON etl.workflow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM etl.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

-- ─── NOTIFICATION SETTINGS ──────────────────────────

CREATE POLICY "notifications_select" ON etl.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM etl.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY "notifications_insert" ON etl.notification_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM etl.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "notifications_update" ON etl.notification_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM etl.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "notifications_delete" ON etl.notification_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM etl.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

-- ═══════════════════════════════════════════════════════
-- ETL RPCs
-- ═══════════════════════════════════════════════════════

-- Accept invite RPC
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

  INSERT INTO etl.organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, v_invite.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  DELETE FROM etl.organisation_invites WHERE id = invite_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated;

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.create_user_admin(
  email TEXT, password TEXT, full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = create_user_admin.email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  new_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    email, crypt(password, gen_salt('bf')), now(),
    jsonb_build_object('full_name', full_name), now(), now()
  );

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_admin(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_admin(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.reset_password_admin(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
  WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_password_admin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_password_admin(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_user_admin(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO authenticated;

-- Usage Stats RPCs
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
  SELECT we.org_id,
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
  SELECT we.user_id,
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

-- Org member usage stats
CREATE OR REPLACE FUNCTION public.get_org_member_usage_stats(target_org_id UUID)
RETURNS TABLE(total_count BIGINT, success_count BIGINT, failed_count BIGINT, daily_date DATE, daily_total BIGINT, daily_success BIGINT, daily_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM etl.organisation_members om
    WHERE om.org_id = target_org_id AND om.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM etl.organisations o
    WHERE o.id = target_org_id AND o.owner_id = auth.uid()
  ) AND NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT
      count(*)::BIGINT, count(*) FILTER (WHERE we.status = 'success')::BIGINT,
      count(*) FILTER (WHERE we.status = 'failed')::BIGINT,
      we.started_at::DATE AS daily_date,
      count(*)::BIGINT, count(*) FILTER (WHERE we.status = 'success')::BIGINT,
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
  IF NOT EXISTS (
    SELECT 1 FROM etl.organisation_members om
    WHERE om.org_id = target_org_id AND om.user_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM etl.organisations o
    WHERE o.id = target_org_id AND o.owner_id = auth.uid()
  ) AND NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT we.user_id, p.email, p.full_name,
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

-- Personal usage stats
CREATE OR REPLACE FUNCTION public.get_personal_usage_stats()
RETURNS TABLE(daily_date DATE, daily_total BIGINT, daily_success BIGINT, daily_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  RETURN QUERY
    SELECT we.started_at::DATE,
      count(*)::BIGINT, count(*) FILTER (WHERE we.status = 'success')::BIGINT,
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
