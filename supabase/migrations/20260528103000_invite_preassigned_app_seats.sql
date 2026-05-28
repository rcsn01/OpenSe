-- Allow organisation invites to reserve app seats before the invited user accepts.

CREATE TABLE public.organisation_invite_app_seats (
  invite_id UUID NOT NULL REFERENCES public.organisation_invites(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (invite_id, app_code)
);

CREATE INDEX organisation_invite_app_seats_app_idx
  ON public.organisation_invite_app_seats (app_code);

ALTER TABLE public.organisation_invite_app_seats ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON TABLE public.organisation_invite_app_seats TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.organisation_invite_app_seats TO service_role;

CREATE POLICY invite_app_seats_select ON public.organisation_invite_app_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_invites oi
      WHERE oi.id = organisation_invite_app_seats.invite_id
        AND (
          oi.email = auth.jwt() ->> 'email'
          OR public.is_org_admin(oi.org_id, auth.uid())
          OR public.is_org_owner(oi.org_id, auth.uid())
        )
    )
  );

CREATE POLICY invite_app_seats_manage ON public.organisation_invite_app_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_invites oi
      WHERE oi.id = organisation_invite_app_seats.invite_id
        AND public.can_manage_org_member_app_seats(oi.org_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_invites oi
      WHERE oi.id = organisation_invite_app_seats.invite_id
        AND public.can_manage_org_member_app_seats(oi.org_id, auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.accept_invite(invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.organisation_invites%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_user_email TEXT := LOWER(BTRIM(auth.jwt() ->> 'email'));
  v_org_member_id UUID;
  v_app_codes TEXT[];
BEGIN
  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.organisation_invites oi
  WHERE oi.id = accept_invite.invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF LOWER(v_invite.email::TEXT) <> v_user_email THEN
    RAISE EXCEPTION 'This invite does not belong to you';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organisation_members om
    WHERE om.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organisation';
  END IF;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, 'member')
  RETURNING id INTO v_org_member_id;

  SELECT COALESCE(ARRAY_AGG(ias.app_code ORDER BY ias.app_code), ARRAY[]::TEXT[])
  INTO v_app_codes
  FROM public.organisation_invite_app_seats ias
  WHERE ias.invite_id = accept_invite.invite_id;

  DELETE FROM public.organisation_invite_app_seats ias
  WHERE ias.invite_id = accept_invite.invite_id;

  INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
  SELECT v_org_member_id, pending_app.app_code
  FROM unnest(v_app_codes) AS pending_app(app_code)
  ON CONFLICT (org_member_id, app_code) DO NOTHING;

  DELETE FROM public.organisation_invites oi
  WHERE oi.id = accept_invite.invite_id;

  RETURN true;
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
    oas.seat_limit,
    (
      COALESCE(assigned.assigned_count, 0)
      + COALESCE(pending.pending_count, 0)
    )::INTEGER AS assigned_seats
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
  LEFT JOIN (
    SELECT ias.app_code, COUNT(*) AS pending_count
    FROM public.organisation_invite_app_seats ias
    JOIN public.organisation_invites oi ON oi.id = ias.invite_id
    WHERE oi.org_id = v_org_id
      AND oi.accepted_at IS NULL
    GROUP BY ias.app_code
  ) AS pending
    ON pending.app_code = a.code
  ORDER BY a.code;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_assign_org_member_app_seat(p_org_member_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_member_org_id UUID;
  v_member_role TEXT;
  v_seat_limit INTEGER;
  v_reserved_count INTEGER;
  v_inserted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT om.org_id, om.role
  INTO v_member_org_id, v_member_role
  FROM public.organisation_members om
  WHERE om.id = p_org_member_id;

  IF v_member_org_id IS NULL OR v_member_org_id <> v_org_id THEN
    RAISE EXCEPTION 'Target member is not in your organisation';
  END IF;

  IF NOT public.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organisation_member_app_seats mas
    WHERE mas.org_member_id = p_org_member_id
      AND mas.app_code = p_app_code
  ) THEN
    RETURN;
  END IF;

  IF v_member_role <> 'owner' THEN
    SELECT oas.seat_limit
    INTO v_seat_limit
    FROM public.organisation_app_seats oas
    WHERE oas.org_id = v_org_id
      AND oas.app_code = p_app_code;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Seat limit is not configured for org % app %', v_org_id, p_app_code;
    END IF;

    IF v_seat_limit IS NOT NULL THEN
      SELECT (
        SELECT COUNT(*)::INTEGER
        FROM public.organisation_member_app_seats mas
        JOIN public.organisation_members om ON om.id = mas.org_member_id
        WHERE om.org_id = v_org_id
          AND om.role <> 'owner'
          AND mas.app_code = p_app_code
      ) + (
        SELECT COUNT(*)::INTEGER
        FROM public.organisation_invite_app_seats ias
        JOIN public.organisation_invites oi ON oi.id = ias.invite_id
        WHERE oi.org_id = v_org_id
          AND oi.accepted_at IS NULL
          AND ias.app_code = p_app_code
      )
      INTO v_reserved_count;

      IF v_reserved_count >= v_seat_limit THEN
        RAISE EXCEPTION 'Seat limit exceeded for org % app % (% assigned / % limit)',
          v_org_id,
          p_app_code,
          v_reserved_count,
          v_seat_limit;
      END IF;
    END IF;
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

CREATE FUNCTION public.accounts_assign_org_invite_app_seat(p_invite_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_invite_org_id UUID;
  v_invite_email TEXT;
  v_seat_limit INTEGER;
  v_reserved_count INTEGER;
  v_inserted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT oi.org_id, oi.email::TEXT
  INTO v_invite_org_id, v_invite_email
  FROM public.organisation_invites oi
  WHERE oi.id = p_invite_id
    AND oi.accepted_at IS NULL;

  IF v_invite_org_id IS NULL OR v_invite_org_id <> v_org_id THEN
    RAISE EXCEPTION 'Target invite is not in your organisation';
  END IF;

  IF NOT public.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organisation_invite_app_seats ias
    WHERE ias.invite_id = p_invite_id
      AND ias.app_code = p_app_code
  ) THEN
    RETURN;
  END IF;

  SELECT oas.seat_limit
  INTO v_seat_limit
  FROM public.organisation_app_seats oas
  WHERE oas.org_id = v_org_id
    AND oas.app_code = p_app_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat limit is not configured for org % app %', v_org_id, p_app_code;
  END IF;

  IF v_seat_limit IS NOT NULL THEN
    SELECT (
      SELECT COUNT(*)::INTEGER
      FROM public.organisation_member_app_seats mas
      JOIN public.organisation_members om ON om.id = mas.org_member_id
      WHERE om.org_id = v_org_id
        AND om.role <> 'owner'
        AND mas.app_code = p_app_code
    ) + (
      SELECT COUNT(*)::INTEGER
      FROM public.organisation_invite_app_seats ias
      JOIN public.organisation_invites oi ON oi.id = ias.invite_id
      WHERE oi.org_id = v_org_id
        AND oi.accepted_at IS NULL
        AND ias.app_code = p_app_code
    )
    INTO v_reserved_count;

    IF v_reserved_count >= v_seat_limit THEN
      RAISE EXCEPTION 'Seat limit exceeded for org % app % (% assigned / % limit)',
        v_org_id,
        p_app_code,
        v_reserved_count,
        v_seat_limit;
    END IF;
  END IF;

  INSERT INTO public.organisation_invite_app_seats (invite_id, app_code)
  VALUES (p_invite_id, p_app_code)
  ON CONFLICT (invite_id, app_code) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count > 0 THEN
    PERFORM public.log_org_audit_event(
      v_org_id,
      'seat_assigned',
      p_app_code,
      NULL,
      jsonb_build_object('invite_id', p_invite_id, 'invite_email', v_invite_email)
    );
  END IF;
END;
$$;

CREATE FUNCTION public.accounts_unassign_org_invite_app_seat(p_invite_id UUID, p_app_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_org_id UUID;
  v_invite_org_id UUID;
  v_invite_email TEXT;
  v_deleted_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  SELECT oi.org_id, oi.email::TEXT
  INTO v_invite_org_id, v_invite_email
  FROM public.organisation_invites oi
  WHERE oi.id = p_invite_id
    AND oi.accepted_at IS NULL;

  IF v_invite_org_id IS NULL OR v_invite_org_id <> v_org_id THEN
    RAISE EXCEPTION 'Target invite is not in your organisation';
  END IF;

  IF NOT public.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM public.organisation_invite_app_seats
  WHERE invite_id = p_invite_id
    AND app_code = p_app_code;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count > 0 THEN
    PERFORM public.log_org_audit_event(
      v_org_id,
      'seat_unassigned',
      p_app_code,
      NULL,
      jsonb_build_object('invite_id', p_invite_id, 'invite_email', v_invite_email)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accounts_assign_org_invite_app_seat(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accounts_unassign_org_invite_app_seat(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.accounts_assign_org_invite_app_seat(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_unassign_org_invite_app_seat(UUID, TEXT) TO authenticated, service_role;
