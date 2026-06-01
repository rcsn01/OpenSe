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
  default_landing_app TEXT NOT NULL DEFAULT 'accounts' CHECK (default_landing_app IN ('accounts', 'etl', 'stoqr')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TRIGGER handle_account_preferences_updated_at
  BEFORE UPDATE ON public.account_preferences
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_preferences_select_self ON public.account_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY account_preferences_insert_self ON public.account_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY account_preferences_update_self ON public.account_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON TABLE public.account_preferences TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.account_preferences TO service_role;

INSERT INTO storage.buckets (id, name, public)
VALUES ('account-avatars', 'account-avatars', false)
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
      AND policyname = 'Users can view account avatars from their organisations'
  ) THEN
    CREATE POLICY "Users can view account avatars from their organisations" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'account-avatars'
        AND (
          (storage.foldername(name))[1] = auth.uid()::text
          OR EXISTS (
            SELECT 1
            FROM public.organisation_members viewer_membership
            JOIN public.organisation_members avatar_owner_membership
              ON avatar_owner_membership.org_id = viewer_membership.org_id
            WHERE viewer_membership.user_id = auth.uid()
              AND avatar_owner_membership.user_id::text = (storage.foldername(name))[1]
          )
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.organisation_invite_app_seats (
  invite_id UUID NOT NULL REFERENCES public.organisation_invites(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (invite_id, app_code)
);

CREATE INDEX IF NOT EXISTS organisation_invite_app_seats_app_idx
  ON public.organisation_invite_app_seats (app_code);

ALTER TABLE public.organisation_invite_app_seats ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON TABLE public.organisation_invite_app_seats TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.organisation_invite_app_seats TO service_role;

DROP POLICY IF EXISTS invite_app_seats_select ON public.organisation_invite_app_seats;
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
