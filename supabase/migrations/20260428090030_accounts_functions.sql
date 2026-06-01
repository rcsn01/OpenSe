CREATE FUNCTION app_private.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT app_private.is_org_admin(p_org_id, p_user_id);
$$;

CREATE FUNCTION app_private.can_manage_org_member_app_seats(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT app_private.is_org_admin(p_org_id, p_user_id);
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
      AND p_user_id = auth.uid()
  ) AS candidate
  ORDER BY candidate.precedence, candidate.created_at
  LIMIT 1;
$$;

DROP POLICY IF EXISTS invite_app_seats_manage ON public.organisation_invite_app_seats;
CREATE POLICY invite_app_seats_manage ON public.organisation_invite_app_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_invites oi
      WHERE oi.id = organisation_invite_app_seats.invite_id
        AND app_private.can_manage_org_member_app_seats(oi.org_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_invites oi
      WHERE oi.id = organisation_invite_app_seats.invite_id
        AND app_private.can_manage_org_member_app_seats(oi.org_id, auth.uid())
    )
  );

CREATE FUNCTION app_private.prevent_owner_member_mutation()
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
  v_limit_row_count INTEGER := 0;
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

  GET DIAGNOSTICS v_limit_row_count = ROW_COUNT;

  IF v_limit_row_count = 0 THEN
    RAISE EXCEPTION 'Seat limit is not configured for org % app %', v_org_id, NEW.app_code;
  END IF;

  IF v_seat_limit IS NULL THEN
    RETURN NEW;
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

CREATE FUNCTION public.enforce_instance_organisation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_organisations INTEGER;
  v_organisation_count INTEGER;
BEGIN
  SELECT max_organisations
  INTO v_max_organisations
  FROM public.platform_instance_settings
  WHERE id = true;

  IF v_max_organisations IS NULL THEN
    v_max_organisations := 1;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_organisation_count
  FROM public.organisations;

  IF v_organisation_count >= v_max_organisations THEN
    RAISE EXCEPTION 'Organisation creation limit reached for this OpenSe instance';
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
  v_user_email TEXT := LOWER(BTRIM(auth.jwt() ->> 'email'));
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
  VALUES (v_invite.org_id, v_user_id, 'member');

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
  IF NOT app_private.is_org_member(p_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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



CREATE FUNCTION public.accounts_get_onboarding_instance_policy()
RETURNS TABLE (
  can_create_organisation BOOLEAN,
  organisation_count INTEGER,
  max_organisations INTEGER,
  free_seat_limit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_max_organisations INTEGER;
  v_free_seat_limit INTEGER;
  v_organisation_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT settings.max_organisations, settings.free_seat_limit
  INTO v_max_organisations, v_free_seat_limit
  FROM public.platform_instance_settings settings
  WHERE settings.id = true;

  v_max_organisations := COALESCE(v_max_organisations, 1);

  SELECT COUNT(*)::INTEGER
  INTO v_organisation_count
  FROM public.organisations;

  RETURN QUERY
  SELECT
    v_organisation_count < v_max_organisations,
    v_organisation_count,
    v_max_organisations,
    v_free_seat_limit;
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

  IF p_seat_limit IS NULL OR p_seat_limit < 0 THEN
    RAISE EXCEPTION 'Seat limit must be non-negative';
  END IF;

  v_org_id := public.get_primary_org_for_user(v_user_id);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  IF NOT app_private.can_manage_org_app_seat_limits(v_org_id, v_user_id) THEN
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

CREATE TRIGGER trg_prevent_owner_member_mutation
  BEFORE UPDATE OR DELETE ON public.organisation_members
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prevent_owner_member_mutation();

CREATE TRIGGER trg_enforce_instance_organisation_limit
  BEFORE INSERT ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_instance_organisation_limit();

CREATE TRIGGER trg_enforce_org_app_seat_limit
  BEFORE INSERT OR UPDATE ON public.organisation_member_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_app_seat_limit();

CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.organisation_members viewer_membership
      JOIN public.organisation_members profile_membership
        ON profile_membership.org_id = viewer_membership.org_id
      WHERE viewer_membership.user_id = auth.uid()
        AND profile_membership.user_id = profiles.id
    )
  );

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY organisations_select ON public.organisations
  FOR SELECT USING (
    owner_id = auth.uid()
    OR app_private.is_org_member(id, auth.uid())
  );

CREATE POLICY organisations_insert ON public.organisations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY organisations_update ON public.organisations
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR app_private.is_org_admin(id, auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR app_private.is_org_admin(id, auth.uid())
  );

CREATE POLICY organisations_delete ON public.organisations
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY organisation_members_select ON public.organisation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR app_private.is_org_member(org_id, auth.uid())
  );

CREATE POLICY organisation_members_insert ON public.organisation_members
  FOR INSERT WITH CHECK (app_private.is_org_admin(org_id, auth.uid()));

CREATE POLICY organisation_members_update ON public.organisation_members
  FOR UPDATE USING (
    app_private.is_org_admin(org_id, auth.uid())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
    )
  )
  WITH CHECK (
    app_private.is_org_admin(org_id, auth.uid())
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
    app_private.is_org_admin(org_id, auth.uid())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
    )
  );

-- The app catalog is migration-owned runtime data; direct writes are intentionally denied.
CREATE POLICY apps_select ON public.apps
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY app_seats_select ON public.organisation_app_seats
  FOR SELECT USING (app_private.is_org_member(org_id, auth.uid()));

CREATE POLICY app_seats_manage ON public.organisation_app_seats
  FOR ALL USING (
    app_private.can_manage_org_app_seat_limits(org_id, auth.uid())
  )
  WITH CHECK (
    app_private.can_manage_org_app_seat_limits(org_id, auth.uid())
  );

CREATE POLICY member_app_seats_select ON public.organisation_member_app_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (
          om.user_id = auth.uid()
          OR app_private.is_org_member(om.org_id, auth.uid())
        )
    )
  );

CREATE POLICY member_app_seats_manage ON public.organisation_member_app_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND app_private.can_manage_org_member_app_seats(om.org_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND app_private.can_manage_org_member_app_seats(om.org_id, auth.uid())
    )
  );

CREATE POLICY organisation_invites_select_own ON public.organisation_invites
  FOR SELECT USING (email = auth.jwt() ->> 'email');

CREATE POLICY organisation_invites_select_admin ON public.organisation_invites
  FOR SELECT USING (
    app_private.is_org_admin(org_id, auth.uid())
    OR app_private.is_org_owner(org_id, auth.uid())
  );

CREATE POLICY organisation_invites_insert_admin ON public.organisation_invites
  FOR INSERT WITH CHECK (
    app_private.is_org_admin(org_id, auth.uid())
    OR app_private.is_org_owner(org_id, auth.uid())
  );

CREATE POLICY organisation_invites_delete_admin_or_user ON public.organisation_invites
  FOR DELETE USING (
    app_private.is_org_admin(org_id, auth.uid())
    OR app_private.is_org_owner(org_id, auth.uid())
    OR email = auth.jwt() ->> 'email'
  );

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (app_private.is_org_member(org_id, auth.uid()));

CREATE POLICY subscriptions_manage ON public.subscriptions
  FOR ALL USING (app_private.is_org_owner_strictly(org_id, auth.uid()))
  WITH CHECK (app_private.is_org_owner_strictly(org_id, auth.uid()));

-- Organisation audit history is intentionally append-only through SECURITY DEFINER RPCs.
CREATE POLICY organisation_audit_events_select ON public.organisation_audit_events
  FOR SELECT USING (app_private.is_org_member(org_id, auth.uid()));

GRANT SELECT ON TABLE public.organisation_audit_events TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.organisation_audit_events TO service_role;

REVOKE ALL ON FUNCTION app_private.can_manage_org_app_seat_limits(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.can_manage_org_member_app_seats(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_primary_org_for_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.prevent_owner_member_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_org_app_seat_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_instance_organisation_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_invite(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_org_audit_event(UUID, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accounts_get_onboarding_instance_policy() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accounts_update_org_seat_limit(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION app_private.can_manage_org_app_seat_limits(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_manage_org_member_app_seats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_org_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_get_onboarding_instance_policy() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_update_org_seat_limit(TEXT, INTEGER) TO authenticated;
CREATE OR REPLACE FUNCTION app_private.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT app_private.is_org_admin(p_org_id, p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.log_my_account_audit_event(
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF v_org_id IS NOT NULL THEN
    PERFORM public.log_org_audit_event(
      v_org_id,
      p_action,
      NULL,
      NULL,
      COALESCE(p_metadata, '{}'::jsonb)
    );
  END IF;
END;
$$;









CREATE OR REPLACE FUNCTION public.accounts_update_organisation_profile(
  p_org_name TEXT,
  p_primary_contact_name TEXT DEFAULT NULL,
  p_primary_contact_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  status TEXT,
  member_role TEXT,
  owner_user_id UUID,
  owner_full_name TEXT,
  owner_email TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF NOT app_private.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NULLIF(BTRIM(p_org_name), '') IS NULL THEN
    RAISE EXCEPTION 'Organisation name is required';
  END IF;

  UPDATE public.organisations
  SET
    name = BTRIM(p_org_name),
    primary_contact_name = NULLIF(BTRIM(p_primary_contact_name), ''),
    primary_contact_email = NULLIF(LOWER(BTRIM(p_primary_contact_email)), '')
  WHERE id = v_org_id;

  PERFORM public.log_org_audit_event(v_org_id, 'organisation_profile_updated');

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.status,
    om.role,
    o.owner_id,
    owner_profile.full_name,
    owner_profile.email,
    o.primary_contact_name,
    o.primary_contact_email,
    o.billing_name,
    o.billing_email,
    o.billing_phone,
    o.stripe_customer_id,
    o.stripe_subscription_id
  FROM public.organisations o
  JOIN public.organisation_members om
    ON om.org_id = o.id
   AND om.user_id = v_user_id
  LEFT JOIN public.profiles owner_profile ON owner_profile.id = o.owner_id
  WHERE o.id = v_org_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_update_billing_contact(
  p_billing_name TEXT DEFAULT NULL,
  p_billing_email TEXT DEFAULT NULL,
  p_billing_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  status TEXT,
  member_role TEXT,
  owner_user_id UUID,
  owner_full_name TEXT,
  owner_email TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
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

  IF NOT app_private.can_manage_org_app_seat_limits(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.organisations
  SET
    billing_name = NULLIF(BTRIM(p_billing_name), ''),
    billing_email = NULLIF(LOWER(BTRIM(p_billing_email)), ''),
    billing_phone = NULLIF(BTRIM(p_billing_phone), '')
  WHERE id = v_org_id;

  PERFORM public.log_org_audit_event(v_org_id, 'billing_contact_updated');

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.status,
    om.role,
    o.owner_id,
    owner_profile.full_name,
    owner_profile.email,
    o.primary_contact_name,
    o.primary_contact_email,
    o.billing_name,
    o.billing_email,
    o.billing_phone,
    o.stripe_customer_id,
    o.stripe_subscription_id
  FROM public.organisations o
  JOIN public.organisation_members om
    ON om.org_id = o.id
   AND om.user_id = v_user_id
  LEFT JOIN public.profiles owner_profile ON owner_profile.id = o.owner_id
  WHERE o.id = v_org_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.log_my_account_audit_event(TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accounts_update_organisation_profile(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accounts_update_billing_contact(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.log_my_account_audit_event(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accounts_update_organisation_profile(TEXT, TEXT, TEXT) TO authenticated;
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
