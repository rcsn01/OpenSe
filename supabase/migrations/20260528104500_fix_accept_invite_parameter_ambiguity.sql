-- Qualify accept_invite identifiers so invite_id is never ambiguous with table columns.

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
