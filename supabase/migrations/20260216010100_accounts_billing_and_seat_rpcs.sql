-- ============================================================
-- Accounts Self-Service RPCs + Seat Permission Split
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_org_owner_strictly(p_org_id, p_user_id)
    OR public.is_app_super_admin()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_member_app_seats(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_org_admin(p_org_id, p_user_id)
    OR public.is_app_super_admin()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_primary_org_for_user(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_choice.org_id
  FROM (
    SELECT
      om.org_id,
      CASE WHEN om.role = 'owner' THEN 0 ELSE 1 END AS precedence,
      om.created_at
    FROM public.organisation_members om
    WHERE om.user_id = p_user_id
  ) AS org_choice
  ORDER BY org_choice.precedence, org_choice.created_at
  LIMIT 1;
$$;

DROP POLICY IF EXISTS app_seats_manage ON public.organisation_app_seats;
CREATE POLICY app_seats_manage ON public.organisation_app_seats
  FOR ALL USING (
    public.can_manage_org_app_seat_limits(org_id, auth.uid())
  )
  WITH CHECK (
    public.can_manage_org_app_seat_limits(org_id, auth.uid())
  );

DROP POLICY IF EXISTS member_app_seats_manage ON public.organisation_member_app_seats;
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

CREATE OR REPLACE FUNCTION public.accounts_get_my_org_context()
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
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
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
  JOIN public.organisation_members om ON om.org_id = o.id
  WHERE o.id = v_org_id
    AND om.user_id = v_user_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_get_org_app_seat_summary()
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
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  RETURN QUERY
  SELECT
    a.code AS app_code,
    a.name AS app_name,
    COALESCE(oas.seat_limit, 0) AS seat_limit,
    COALESCE(assigned.assigned_count, 0)::INTEGER AS assigned_seats
  FROM public.apps a
  LEFT JOIN public.organisation_app_seats oas
    ON oas.app_code = a.code
   AND oas.org_id = v_org_id
  LEFT JOIN (
    SELECT mas.app_code, COUNT(*) AS assigned_count
    FROM public.organisation_member_app_seats mas
    JOIN public.organisation_members om ON om.id = mas.org_member_id
    WHERE om.org_id = v_org_id
    GROUP BY mas.app_code
  ) assigned ON assigned.app_code = a.code
  ORDER BY a.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_get_org_member_app_assignments()
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
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  RETURN QUERY
  SELECT
    om.id AS org_member_id,
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

CREATE OR REPLACE FUNCTION public.accounts_update_org_seat_limit(p_app_code TEXT, p_seat_limit INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
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

  UPDATE public.organisation_app_seats
  SET seat_limit = p_seat_limit
  WHERE org_id = v_org_id
    AND app_code = p_app_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organisation app seat row not found for app %', p_app_code;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_assign_org_member_app_seat(p_org_member_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_member_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT om.org_id INTO v_member_org_id
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
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_unassign_org_member_app_seat(p_org_member_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_member_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT om.org_id INTO v_member_org_id
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
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_primary_org_for_user(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_my_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_org_app_seat_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_org_member_app_assignments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_update_org_seat_limit(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_assign_org_member_app_seat(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_unassign_org_member_app_seat(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_org_app_seat_limits(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_org_member_app_seats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_org_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_get_my_org_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_get_org_app_seat_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_get_org_member_app_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_update_org_seat_limit(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_assign_org_member_app_seat(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_unassign_org_member_app_seat(UUID, TEXT) TO authenticated;
