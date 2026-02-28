-- ============================================================
-- Baseline: Public Identity & Canonical Organisation Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username CITEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS public.super_admin_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE TRIGGER handle_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS organisation_members_org_idx ON public.organisation_members(org_id);
CREATE INDEX IF NOT EXISTS organisation_members_user_idx ON public.organisation_members(user_id);

CREATE TABLE IF NOT EXISTS public.organisation_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  token TEXT DEFAULT gen_random_uuid()::text NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE (org_id, email)
);

CREATE INDEX IF NOT EXISTS organisation_invites_org_idx ON public.organisation_invites(org_id);
CREATE INDEX IF NOT EXISTS organisation_invites_email_idx ON public.organisation_invites(email);

CREATE TABLE IF NOT EXISTS public.apps (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO public.apps (code, name)
VALUES ('etl', 'ETL'), ('stoqr', 'StoQR')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.organisation_app_seats (
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  seat_limit INTEGER NOT NULL DEFAULT 1 CHECK (seat_limit >= 0),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (org_id, app_code)
);

CREATE TRIGGER handle_organisation_app_seats_updated_at
  BEFORE UPDATE ON public.organisation_app_seats
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS public.organisation_member_app_seats (
  org_member_id UUID NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (org_member_id, app_code)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')) NOT NULL,
  price_id TEXT,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_app_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_member_app_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.super_admin_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_invites TO authenticated;
GRANT SELECT ON public.apps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_app_seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_member_app_seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
