-- ============================================================
-- Organisation Audit Events + Feed RPCs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organisation_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  app_code TEXT REFERENCES public.apps(code) ON DELETE SET NULL,
  target_org_member_id UUID REFERENCES public.organisation_members(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS organisation_audit_events_org_idx
  ON public.organisation_audit_events(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS organisation_audit_events_actor_idx
  ON public.organisation_audit_events(actor_user_id, created_at DESC);

ALTER TABLE public.organisation_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS organisation_audit_events_select ON public.organisation_audit_events;
CREATE POLICY organisation_audit_events_select ON public.organisation_audit_events
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

GRANT SELECT ON public.organisation_audit_events TO authenticated;
GRANT INSERT ON public.organisation_audit_events TO authenticated;

CREATE OR REPLACE FUNCTION public.log_org_audit_event(
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
DECLARE
  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

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
    v_actor_id,
    p_action,
    p_app_code,
    p_target_org_member_id,
    COALESCE(p_metadata, '{}'::jsonb)
  );
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
  v_previous_limit INTEGER;
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

  SELECT seat_limit INTO v_previous_limit
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
  v_inserted_count INTEGER;
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
  v_deleted_count INTEGER;
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

CREATE OR REPLACE FUNCTION public.accounts_list_org_audit_events(p_limit INTEGER DEFAULT 25)
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
  v_user_id UUID;
  v_org_id UUID;
  v_limit INTEGER;
BEGIN
  v_user_id := auth.uid();
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
    actor_profile.email AS actor_email,
    actor_profile.full_name AS actor_full_name,
    e.action,
    e.app_code,
    e.target_org_member_id,
    target_profile.email AS target_user_email,
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

CREATE OR REPLACE FUNCTION public.admin_list_audit_events(p_org_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
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
  v_limit INTEGER;
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);

  RETURN QUERY
  SELECT
    e.id,
    e.org_id,
    o.name AS org_name,
    e.actor_user_id,
    actor_profile.email AS actor_email,
    actor_profile.full_name AS actor_full_name,
    e.action,
    e.app_code,
    e.target_org_member_id,
    target_profile.email AS target_user_email,
    e.metadata,
    e.created_at
  FROM public.organisation_audit_events e
  JOIN public.organisations o ON o.id = e.org_id
  LEFT JOIN public.profiles actor_profile ON actor_profile.id = e.actor_user_id
  LEFT JOIN public.organisation_members target_member ON target_member.id = e.target_org_member_id
  LEFT JOIN public.profiles target_profile ON target_profile.id = target_member.user_id
  WHERE p_org_id IS NULL OR e.org_id = p_org_id
  ORDER BY e.created_at DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.log_org_audit_event(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_list_org_audit_events(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_audit_events(UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.log_org_audit_event(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_list_org_audit_events(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_audit_events(UUID, INTEGER) TO authenticated;
