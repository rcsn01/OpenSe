-- Accounts domain baseline.
--
-- This file owns public-schema RLS decisions, seat-management helpers, invite flows,
-- and organisation-scoped audit history.

CREATE TABLE public.organisation_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  app_code TEXT REFERENCES public.apps(code) ON DELETE SET NULL,
  target_org_member_id UUID REFERENCES public.organisation_members(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX organisation_audit_events_org_idx
  ON public.organisation_audit_events (org_id, created_at DESC);

CREATE INDEX organisation_audit_events_actor_idx
  ON public.organisation_audit_events (actor_user_id, created_at DESC);

ALTER TABLE public.organisation_audit_events ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_org_owner_strictly(p_org_id, p_user_id)
      OR public.is_app_super_admin();
$$;

CREATE FUNCTION public.can_manage_org_member_app_seats(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_org_admin(p_org_id, p_user_id)
      OR public.is_app_super_admin();
$$;

CREATE FUNCTION public.get_primary_org_for_user(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT candidate.org_id
  FROM (
    SELECT
      om.org_id,
      CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END AS precedence,
      om.created_at
    FROM public.organisation_members om
    WHERE om.user_id = p_user_id
  ) AS candidate
  ORDER BY candidate.precedence, candidate.created_at
  LIMIT 1;
$$;

CREATE FUNCTION public.prevent_owner_member_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT o.owner_id
  INTO v_owner_id
  FROM public.organisations o
  WHERE o.id = OLD.org_id;

  IF v_owner_id IS NULL OR OLD.user_id <> v_owner_id THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Cannot delete the active owner membership for organisation %', OLD.org_id;
  END IF;

  IF NEW.role <> 'owner' THEN
    RAISE EXCEPTION 'Cannot change the role for the active owner in organisation %', OLD.org_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.enforce_org_app_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_member_role TEXT;
  v_seat_limit INTEGER;
  v_assigned_count INTEGER;
BEGIN
  SELECT org_id, role
  INTO v_org_id, v_member_role
  FROM public.organisation_members
  WHERE id = NEW.org_member_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid organisation member id: %', NEW.org_member_id;
  END IF;

  IF v_member_role = 'owner' THEN
    RETURN NEW;
  END IF;

  SELECT seat_limit
  INTO v_seat_limit
  FROM public.organisation_app_seats
  WHERE org_id = v_org_id
    AND app_code = NEW.app_code;

  IF v_seat_limit IS NULL THEN
    RAISE EXCEPTION 'Seat limit is not configured for org % app %', v_org_id, NEW.app_code;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_assigned_count
  FROM public.organisation_member_app_seats mas
  JOIN public.organisation_members om ON om.id = mas.org_member_id
  WHERE om.org_id = v_org_id
    AND om.role <> 'owner'
    AND mas.app_code = NEW.app_code
    AND (
      TG_OP <> 'UPDATE'
      OR mas.org_member_id <> OLD.org_member_id
      OR mas.app_code <> OLD.app_code
    );

  IF v_assigned_count >= v_seat_limit THEN
    RAISE EXCEPTION 'Seat limit exceeded for org % app % (% assigned / % limit)',
      v_org_id,
      NEW.app_code,
      v_assigned_count,
      v_seat_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.accept_invite(invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organisation_invites%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_user_email TEXT := auth.jwt() ->> 'email';
BEGIN
  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.organisation_invites
  WHERE id = invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.email <> v_user_email THEN
    RAISE EXCEPTION 'This invite does not belong to you';
  END IF;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, 'member')
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = public.pick_higher_org_role(public.organisation_members.role, 'member');

  DELETE FROM public.organisation_invites
  WHERE id = invite_id;

  RETURN true;
END;
$$;

CREATE FUNCTION public.log_org_audit_event(
  p_org_id UUID,
  p_action TEXT,
  p_app_code TEXT DEFAULT NULL,
  p_target_org_member_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organisation_audit_events (
    org_id,
    actor_user_id,
    action,
    app_code,
    target_org_member_id,
    metadata
  )
  VALUES (
    p_org_id,
    auth.uid(),
    p_action,
    p_app_code,
    p_target_org_member_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE FUNCTION public.accounts_get_my_org_context()
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  member_role TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    om.role,
    o.stripe_customer_id,
    o.stripe_subscription_id
  FROM public.organisations o
  JOIN public.organisation_members om
    ON om.org_id = o.id
  WHERE o.id = v_org_id
    AND om.user_id = v_user_id
  LIMIT 1;
END;
$$;

CREATE FUNCTION public.accounts_get_org_app_seat_summary()
RETURNS TABLE (
  app_code TEXT,
  app_name TEXT,
  seat_limit INTEGER,
  assigned_seats INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  RETURN QUERY
  SELECT
    a.code,
    a.name,
    COALESCE(oas.seat_limit, 0) AS seat_limit,
    COALESCE(assigned.assigned_count, 0)::INTEGER AS assigned_seats
  FROM public.apps a
  LEFT JOIN public.organisation_app_seats oas
    ON oas.org_id = v_org_id
   AND oas.app_code = a.code
  LEFT JOIN (
    SELECT mas.app_code, COUNT(*) AS assigned_count
    FROM public.organisation_member_app_seats mas
    JOIN public.organisation_members om ON om.id = mas.org_member_id
    WHERE om.org_id = v_org_id
    GROUP BY mas.app_code
  ) AS assigned
    ON assigned.app_code = a.code
  ORDER BY a.code;
END;
$$;

CREATE FUNCTION public.accounts_get_org_member_app_assignments()
RETURNS TABLE (
  org_member_id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  role TEXT,
  assigned_apps TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  RETURN QUERY
  SELECT
    om.id,
    om.user_id,
    p.full_name,
    p.email,
    om.role,
    COALESCE(
      ARRAY_REMOVE(ARRAY_AGG(mas.app_code ORDER BY mas.app_code), NULL),
      ARRAY[]::TEXT[]
    ) AS assigned_apps
  FROM public.organisation_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
  LEFT JOIN public.organisation_member_app_seats mas ON mas.org_member_id = om.id
  WHERE om.org_id = v_org_id
  GROUP BY om.id, om.user_id, p.full_name, p.email, om.role
  ORDER BY om.created_at;
END;
$$;

CREATE FUNCTION public.accounts_update_org_seat_limit(p_app_code TEXT, p_seat_limit INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_previous_limit INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_seat_limit < 0 THEN
    RAISE EXCEPTION 'Seat limit must be non-negative';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  IF NOT public.can_manage_org_app_seat_limits(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT seat_limit
  INTO v_previous_limit
  FROM public.organisation_app_seats
  WHERE org_id = v_org_id
    AND app_code = p_app_code;

  UPDATE public.organisation_app_seats
  SET seat_limit = p_seat_limit
  WHERE org_id = v_org_id
    AND app_code = p_app_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation app seat row not found for app %', p_app_code;
  END IF;

  PERFORM public.log_org_audit_event(
    v_org_id,
    'seat_limit_updated',
    p_app_code,
    NULL,
    jsonb_build_object('from', v_previous_limit, 'to', p_seat_limit)
  );
END;
$$;

CREATE FUNCTION public.accounts_assign_org_member_app_seat(p_org_member_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_member_org_id UUID;
  v_inserted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT om.org_id
  INTO v_member_org_id
  FROM public.organisation_members om
  WHERE om.id = p_org_member_id;

  IF v_member_org_id IS NULL OR v_member_org_id <> v_org_id THEN
    RAISE EXCEPTION 'Target member is not in your organisation';
  END IF;

  IF NOT public.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
  VALUES (p_org_member_id, p_app_code)
  ON CONFLICT (org_member_id, app_code) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    PERFORM public.log_org_audit_event(
      v_org_id,
      'seat_assigned',
      p_app_code,
      p_org_member_id,
      '{}'::jsonb
    );
  END IF;
END;
$$;

CREATE FUNCTION public.accounts_unassign_org_member_app_seat(p_org_member_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_member_org_id UUID;
  v_deleted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT om.org_id
  INTO v_member_org_id
  FROM public.organisation_members om
  WHERE om.id = p_org_member_id;

  IF v_member_org_id IS NULL OR v_member_org_id <> v_org_id THEN
    RAISE EXCEPTION 'Target member is not in your organisation';
  END IF;

  IF NOT public.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM public.organisation_member_app_seats
  WHERE org_member_id = p_org_member_id
    AND app_code = p_app_code;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    PERFORM public.log_org_audit_event(
      v_org_id,
      'seat_unassigned',
      p_app_code,
      p_org_member_id,
      '{}'::jsonb
    );
  END IF;
END;
$$;

CREATE FUNCTION public.accounts_list_org_audit_events(p_limit INTEGER DEFAULT 25)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  actor_user_id UUID,
  actor_email TEXT,
  actor_full_name TEXT,
  action TEXT,
  app_code TEXT,
  target_org_member_id UUID,
  target_user_email TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_limit INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 200);

  RETURN QUERY
  SELECT
    e.id,
    e.org_id,
    e.actor_user_id,
    actor_profile.email,
    actor_profile.full_name,
    e.action,
    e.app_code,
    e.target_org_member_id,
    target_profile.email,
    e.metadata,
    e.created_at
  FROM public.organisation_audit_events e
  LEFT JOIN public.profiles actor_profile ON actor_profile.id = e.actor_user_id
  LEFT JOIN public.organisation_members target_member ON target_member.id = e.target_org_member_id
  LEFT JOIN public.profiles target_profile ON target_profile.id = target_member.user_id
  WHERE e.org_id = v_org_id
  ORDER BY e.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE TRIGGER trg_prevent_owner_member_mutation
  BEFORE UPDATE OR DELETE ON public.organisation_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_member_mutation();

CREATE TRIGGER trg_enforce_org_app_seat_limit
  BEFORE INSERT OR UPDATE ON public.organisation_member_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_app_seat_limit();

CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY super_admin_members_select ON public.super_admin_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_app_super_admin()
  );

CREATE POLICY super_admin_members_insert ON public.super_admin_members
  FOR INSERT WITH CHECK (public.is_app_super_admin());

CREATE POLICY super_admin_members_update ON public.super_admin_members
  FOR UPDATE USING (public.is_app_super_admin())
  WITH CHECK (public.is_app_super_admin());

CREATE POLICY super_admin_members_delete ON public.super_admin_members
  FOR DELETE USING (public.is_app_super_admin());

CREATE POLICY organisations_select ON public.organisations
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.is_org_member(id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisations_insert ON public.organisations
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR public.is_app_super_admin()
  );

CREATE POLICY organisations_update ON public.organisations
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.is_org_admin(id, auth.uid())
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_org_admin(id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisations_delete ON public.organisations
  FOR DELETE USING (
    owner_id = auth.uid()
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_members_select ON public.organisation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_members_insert ON public.organisation_members
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_members_update ON public.organisation_members
  FOR UPDATE USING (
    (public.is_org_admin(org_id, auth.uid()) OR public.is_app_super_admin())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
    )
  )
  WITH CHECK (
    (public.is_org_admin(org_id, auth.uid()) OR public.is_app_super_admin())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
      AND role <> 'owner'
    )
  );

CREATE POLICY organisation_members_delete ON public.organisation_members
  FOR DELETE USING (
    (public.is_org_admin(org_id, auth.uid()) OR public.is_app_super_admin())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
    )
  );

-- The app catalog is seed-managed reference data; direct writes are intentionally denied.
CREATE POLICY apps_select ON public.apps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY app_seats_select ON public.organisation_app_seats
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY app_seats_manage ON public.organisation_app_seats
  FOR ALL USING (
    public.can_manage_org_app_seat_limits(org_id, auth.uid())
  )
  WITH CHECK (
    public.can_manage_org_app_seat_limits(org_id, auth.uid())
  );

CREATE POLICY member_app_seats_select ON public.organisation_member_app_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (
          om.user_id = auth.uid()
          OR public.is_org_member(om.org_id, auth.uid())
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY member_app_seats_manage ON public.organisation_member_app_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND public.can_manage_org_member_app_seats(om.org_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND public.can_manage_org_member_app_seats(om.org_id, auth.uid())
    )
  );

CREATE POLICY organisation_invites_select_own ON public.organisation_invites
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY organisation_invites_select_admin ON public.organisation_invites
  FOR SELECT USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_org_owner(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_invites_insert_admin ON public.organisation_invites
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_org_owner(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_invites_delete_admin_or_user ON public.organisation_invites
  FOR DELETE USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_org_owner(org_id, auth.uid())
    OR public.is_app_super_admin()
    OR email = auth.jwt() ->> 'email'
  );

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY subscriptions_manage ON public.subscriptions
  FOR ALL USING (
    public.is_org_owner_strictly(org_id, auth.uid())
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    public.is_org_owner_strictly(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

-- Organisation audit history is intentionally append-only through SECURITY DEFINER RPCs.
CREATE POLICY organisation_audit_events_select ON public.organisation_audit_events
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

GRANT SELECT ON TABLE public.organisation_audit_events TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.organisation_audit_events TO service_role;

REVOKE ALL ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_primary_org_for_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_owner_member_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_org_app_seat_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_org_audit_event(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_my_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_org_app_seat_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_org_member_app_assignments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_update_org_seat_limit(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_assign_org_member_app_seat(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_unassign_org_member_app_seat(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_list_org_audit_events(INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_primary_org_for_user(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_org_audit_event(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_my_org_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_org_app_seat_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_org_member_app_assignments() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_update_org_seat_limit(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_assign_org_member_app_seat(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_unassign_org_member_app_seat(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_list_org_audit_events(INTEGER) TO authenticated, service_role;