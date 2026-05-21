-- Accounts account-center additions.
--
-- Adds profile/preferences/organisation RPCs used by the redesigned Accounts app,
-- billing contact fields, avatar storage, and account-scoped audit logging.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS recovery_email TEXT;

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS billing_phone TEXT;

CREATE TABLE IF NOT EXISTS public.account_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en-AU',
  notification_preferences JSONB NOT NULL DEFAULT '{"product_updates": true, "security_alerts": true, "billing_alerts": true}'::jsonb,
  default_landing_app TEXT NOT NULL DEFAULT 'accounts' CHECK (default_landing_app IN ('accounts', 'etl', 'stoqr', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TRIGGER handle_account_preferences_updated_at
  BEFORE UPDATE ON public.account_preferences
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_preferences_select_self ON public.account_preferences
  FOR SELECT USING (user_id = auth.uid() OR public.is_app_super_admin());

CREATE POLICY account_preferences_insert_self ON public.account_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_app_super_admin());

CREATE POLICY account_preferences_update_self ON public.account_preferences
  FOR UPDATE USING (user_id = auth.uid() OR public.is_app_super_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_app_super_admin());

GRANT SELECT, INSERT, UPDATE ON TABLE public.account_preferences TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.account_preferences TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('account-avatars', 'account-avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can manage their account avatars'
  ) THEN
    CREATE POLICY "Users can manage their account avatars" ON storage.objects
      FOR ALL USING (
        bucket_id = 'account-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'account-avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can view account avatars'
  ) THEN
    CREATE POLICY "Authenticated users can view account avatars" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'account-avatars'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_org_admin(p_org_id, p_user_id)
      OR public.is_app_super_admin();
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

CREATE OR REPLACE FUNCTION public.accounts_get_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  username CITEXT,
  avatar_url TEXT,
  avatar_storage_path TEXT,
  recovery_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.username,
    p.avatar_url,
    p.avatar_storage_path,
    p.recovery_email,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.id = v_user_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_update_profile(
  p_full_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_avatar_storage_path TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  username CITEXT,
  avatar_url TEXT,
  avatar_storage_path TEXT,
  recovery_email TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NULLIF(BTRIM(p_full_name), '') IS NULL THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  UPDATE public.profiles
  SET
    full_name = BTRIM(p_full_name),
    username = NULLIF(BTRIM(p_username), '')::CITEXT,
    avatar_url = p_avatar_url,
    avatar_storage_path = p_avatar_storage_path
  WHERE profiles.id = v_user_id;

  PERFORM public.log_my_account_audit_event('profile_updated');

  RETURN QUERY SELECT * FROM public.accounts_get_profile();
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_update_recovery_email(p_recovery_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := LOWER(BTRIM(p_recovery_email));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Recovery email must be valid';
  END IF;

  UPDATE public.profiles
  SET recovery_email = v_email
  WHERE id = v_user_id;

  PERFORM public.log_my_account_audit_event('recovery_email_updated');
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_get_preferences()
RETURNS TABLE (
  theme TEXT,
  timezone TEXT,
  locale TEXT,
  notification_preferences JSONB,
  default_landing_app TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    ap.theme,
    ap.timezone,
    ap.locale,
    ap.notification_preferences,
    ap.default_landing_app,
    ap.updated_at
  FROM public.account_preferences ap
  WHERE ap.user_id = v_user_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_upsert_preferences(
  p_theme TEXT,
  p_timezone TEXT,
  p_locale TEXT,
  p_notification_preferences JSONB,
  p_default_landing_app TEXT
)
RETURNS TABLE (
  theme TEXT,
  timezone TEXT,
  locale TEXT,
  notification_preferences JSONB,
  default_landing_app TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.account_preferences (
    user_id,
    theme,
    timezone,
    locale,
    notification_preferences,
    default_landing_app
  )
  VALUES (
    v_user_id,
    p_theme,
    COALESCE(NULLIF(BTRIM(p_timezone), ''), 'UTC'),
    COALESCE(NULLIF(BTRIM(p_locale), ''), 'en-AU'),
    COALESCE(p_notification_preferences, '{}'::jsonb),
    p_default_landing_app
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    theme = EXCLUDED.theme,
    timezone = EXCLUDED.timezone,
    locale = EXCLUDED.locale,
    notification_preferences = EXCLUDED.notification_preferences,
    default_landing_app = EXCLUDED.default_landing_app;

  PERFORM public.log_my_account_audit_event('preferences_updated');

  RETURN QUERY SELECT * FROM public.accounts_get_preferences();
END;
$$;

DROP FUNCTION IF EXISTS public.accounts_get_my_org_context();

CREATE FUNCTION public.accounts_get_my_org_context()
RETURNS TABLE (
  org_id UUID,
  org_name TEXT,
  member_role TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_name TEXT,
  billing_email TEXT,
  billing_phone TEXT
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
    o.stripe_subscription_id,
    o.billing_name,
    o.billing_email,
    o.billing_phone
  FROM public.organisations o
  JOIN public.organisation_members om
    ON om.org_id = o.id
  WHERE o.id = v_org_id
    AND om.user_id = v_user_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_get_organisation_profile()
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

  IF NOT public.can_manage_org_member_app_seats(v_org_id, v_user_id) THEN
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

  RETURN QUERY SELECT * FROM public.accounts_get_organisation_profile();
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

  IF NOT public.can_manage_org_app_seat_limits(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.organisations
  SET
    billing_name = NULLIF(BTRIM(p_billing_name), ''),
    billing_email = NULLIF(LOWER(BTRIM(p_billing_email)), ''),
    billing_phone = NULLIF(BTRIM(p_billing_phone), '')
  WHERE id = v_org_id;

  PERFORM public.log_org_audit_event(v_org_id, 'billing_contact_updated');

  RETURN QUERY SELECT * FROM public.accounts_get_organisation_profile();
END;
$$;

CREATE OR REPLACE FUNCTION public.accounts_transfer_organisation_ownership(p_new_owner_user_id UUID)
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

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organisation membership found for current user';
  END IF;

  IF NOT public.is_org_owner_strictly(v_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Only the current owner can transfer ownership';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE org_id = v_org_id
      AND user_id = p_new_owner_user_id
  ) THEN
    RAISE EXCEPTION 'New owner must be an existing organisation member';
  END IF;

  UPDATE public.organisations
  SET owner_id = p_new_owner_user_id
  WHERE id = v_org_id;

  UPDATE public.organisation_members
  SET role = CASE
    WHEN user_id = p_new_owner_user_id THEN 'owner'
    WHEN user_id = v_user_id THEN 'admin'
    ELSE role
  END
  WHERE org_id = v_org_id
    AND user_id IN (p_new_owner_user_id, v_user_id);

  PERFORM public.log_org_audit_event(
    v_org_id,
    'organisation_owner_transferred',
    NULL,
    NULL,
    jsonb_build_object('from_user_id', v_user_id, 'to_user_id', p_new_owner_user_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_my_account_audit_event(TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_update_profile(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_update_recovery_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_preferences() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_upsert_preferences(TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_my_org_context() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_get_organisation_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_update_organisation_profile(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_update_billing_contact(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accounts_transfer_organisation_ownership(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.log_my_account_audit_event(TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_update_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_update_recovery_email(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_preferences() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_upsert_preferences(TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_my_org_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_get_organisation_profile() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_update_organisation_profile(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_update_billing_contact(TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accounts_transfer_organisation_ownership(UUID) TO authenticated, service_role;
