CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  username CITEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TABLE public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TABLE public.organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'editor', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_id, user_id)
);

CREATE INDEX organisation_members_org_idx ON public.organisation_members (org_id);
CREATE INDEX organisation_members_user_idx ON public.organisation_members (user_id);

CREATE TABLE public.organisation_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  accepted_at TIMESTAMPTZ,
  UNIQUE (org_id, email)
);

CREATE INDEX organisation_invites_org_idx ON public.organisation_invites (org_id);
CREATE INDEX organisation_invites_email_idx ON public.organisation_invites (email);

CREATE TABLE public.apps (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

INSERT INTO public.apps (code, name)
VALUES
  ('etl', 'ETL'),
  ('stoqr', 'StoQR')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

CREATE TABLE public.organisation_app_seats (
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  seat_limit INTEGER DEFAULT NULL CHECK (seat_limit IS NULL OR seat_limit >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (org_id, app_code)
);

CREATE TABLE public.platform_instance_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  max_organisations INTEGER NOT NULL DEFAULT 1 CHECK (max_organisations >= 0),
  free_seat_limit INTEGER DEFAULT NULL CHECK (free_seat_limit IS NULL OR free_seat_limit >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.platform_instance_settings (id, max_organisations, free_seat_limit)
VALUES (true, 1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.organisation_member_app_seats (
  org_member_id UUID NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  app_code TEXT NOT NULL REFERENCES public.apps(code) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (org_member_id, app_code)
);

CREATE TABLE public.subscriptions (
  id TEXT PRIMARY KEY,
  org_id UUID NOT NULL UNIQUE REFERENCES public.organisations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  price_id TEXT,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ
);

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_organisations_updated_at
  BEFORE UPDATE ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_organisation_app_seats_updated_at
  BEFORE UPDATE ON public.organisation_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_platform_instance_settings_updated_at
  BEFORE UPDATE ON public.platform_instance_settings
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_app_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_member_app_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_instance_settings ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.has_users()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles);
$$;

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.pick_higher_org_role(existing_role TEXT, new_role TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN COALESCE(existing_role, 'member') = 'owner' OR COALESCE(new_role, 'member') = 'owner' THEN 'owner'
    WHEN COALESCE(existing_role, 'member') = 'admin' OR COALESCE(new_role, 'member') = 'admin' THEN 'admin'
    WHEN COALESCE(existing_role, 'member') = 'editor' OR COALESCE(new_role, 'member') = 'editor' THEN 'editor'
    ELSE 'member'
  END;
$$;

CREATE FUNCTION public.demote_org_role(existing_role TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE COALESCE(existing_role, 'member')
    WHEN 'owner' THEN 'admin'
    WHEN 'admin' THEN 'editor'
    WHEN 'editor' THEN 'member'
    ELSE 'member'
  END;
$$;

CREATE FUNCTION app_private.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisations
    WHERE id = p_org_id
      AND owner_id = p_user_id
      AND p_user_id = auth.uid()
  );
$$;

CREATE FUNCTION app_private.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE org_id = p_org_id
      AND user_id = p_user_id
      AND p_user_id = auth.uid()
  );
$$;

CREATE FUNCTION app_private.is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE org_id = p_org_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
      AND p_user_id = auth.uid()
  );
$$;

CREATE FUNCTION app_private.is_org_owner_strictly(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organisations
    WHERE id = p_org_id
      AND owner_id = p_user_id
      AND p_user_id = auth.uid()
  );
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organisation_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.organisation_invites TO authenticated;
GRANT SELECT ON TABLE public.apps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organisation_app_seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organisation_member_app_seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subscriptions TO authenticated;

REVOKE ALL ON TABLE public.platform_instance_settings FROM PUBLIC, anon, authenticated;

GRANT ALL PRIVILEGES ON TABLE public.profiles TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.organisations TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.organisation_members TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.organisation_invites TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.apps TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.organisation_app_seats TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.organisation_member_app_seats TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.subscriptions TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.platform_instance_settings TO service_role;

REVOKE ALL ON FUNCTION public.has_users() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pick_higher_org_role(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.demote_org_role(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_org_owner(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_org_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_org_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_org_owner_strictly(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_users() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pick_higher_org_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_org_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_org_owner_strictly(UUID, UUID) TO authenticated;
