-- ============================================================
-- Migration 0012: Unified organisations + per-app seats
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Unified shared model
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  etl_org_id UUID UNIQUE,
  stoqr_company_id UUID UNIQUE,
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

CREATE OR REPLACE FUNCTION public.pick_higher_org_role(current_role TEXT, incoming_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(current_role, 'member') = 'owner' OR COALESCE(incoming_role, 'member') = 'owner' THEN 'owner'
    WHEN COALESCE(current_role, 'member') = 'admin' OR COALESCE(incoming_role, 'member') = 'admin' THEN 'admin'
    WHEN COALESCE(current_role, 'member') = 'editor' OR COALESCE(incoming_role, 'member') = 'editor' THEN 'editor'
    ELSE 'member'
  END;
$$;

CREATE OR REPLACE FUNCTION public.map_stoqr_role_to_org_role(_role_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  IF _role_id IS NULL THEN
    RETURN 'member';
  END IF;

  SELECT r.name INTO v_role_name
  FROM stoqr.roles r
  WHERE r.id = _role_id;

  IF v_role_name IS NULL THEN
    RETURN 'member';
  END IF;

  IF lower(v_role_name) = 'owner' THEN
    RETURN 'owner';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stoqr.role_permissions rp
    WHERE rp.role_id = _role_id
      AND rp.permission_code IN ('company.manage', 'members.manage', 'roles.manage', 'billing.manage')
  ) THEN
    RETURN 'admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stoqr.role_permissions rp
    WHERE rp.role_id = _role_id
      AND rp.permission_code IN ('products.manage', 'transactions.create')
  ) THEN
    RETURN 'editor';
  END IF;

  RETURN 'member';
END;
$$;

CREATE OR REPLACE FUNCTION public.pick_stoqr_role_for_org_member(_org_id UUID, _org_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  IF _org_role IN ('owner', 'admin') THEN
    SELECT r.id INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND lower(r.name) = 'owner'
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;

    SELECT r.id INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND EXISTS (
        SELECT 1 FROM stoqr.role_permissions rp
        WHERE rp.role_id = r.id
          AND rp.permission_code = 'company.manage'
      )
    ORDER BY r.created_at
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;
  END IF;

  IF _org_role = 'editor' THEN
    SELECT r.id INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND EXISTS (
        SELECT 1 FROM stoqr.role_permissions rp
        WHERE rp.role_id = r.id
          AND rp.permission_code = 'products.manage'
      )
    ORDER BY r.created_at
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;
  END IF;

  SELECT r.id INTO v_role_id
  FROM stoqr.roles r
  WHERE r.company_id = _org_id
  ORDER BY r.created_at
  LIMIT 1;

  RETURN v_role_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Capture FK metadata and drop old org/company foreign keys
-- ─────────────────────────────────────────────────────────────

CREATE TEMP TABLE _fk_rewire (
  table_schema TEXT,
  table_name TEXT,
  constraint_name TEXT,
  column_name TEXT,
  on_delete_action TEXT,
  on_update_action TEXT
) ON COMMIT DROP;

INSERT INTO _fk_rewire (table_schema, table_name, constraint_name, column_name, on_delete_action, on_update_action)
SELECT
  ns.nspname,
  rel.relname,
  con.conname,
  att.attname,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    ELSE 'NO ACTION'
  END,
  CASE con.confupdtype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
    ELSE 'NO ACTION'
  END
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
WHERE con.contype = 'f'
  AND array_length(con.conkey, 1) = 1
  AND con.confrelid IN ('etl.organisations'::regclass, 'stoqr.companies'::regclass);

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM _fk_rewire LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      rec.table_schema,
      rec.table_name,
      rec.constraint_name
    );
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────
-- Build deterministic ETL↔StoQR org mapping
-- ─────────────────────────────────────────────────────────────

CREATE TEMP TABLE _stoqr_company_owners AS
SELECT
  c.id AS company_id,
  COALESCE(
    (
      SELECT cm.user_id
      FROM stoqr.company_members cm
      JOIN stoqr.roles r ON r.id = cm.role_id
      WHERE cm.company_id = c.id
        AND lower(r.name) = 'owner'
      ORDER BY cm.joined_at
      LIMIT 1
    ),
    (
      SELECT cm.user_id
      FROM stoqr.company_members cm
      WHERE cm.company_id = c.id
      ORDER BY cm.joined_at
      LIMIT 1
    )
  ) AS owner_id
FROM stoqr.companies c;

CREATE TEMP TABLE _matched_pairs AS
WITH candidates AS (
  SELECT
    e.id AS etl_org_id,
    c.id AS company_id,
    e.created_at AS etl_created_at,
    c.created_at AS stoqr_created_at,
    row_number() OVER (
      PARTITION BY e.id
      ORDER BY c.created_at, c.id
    ) AS etl_pick,
    row_number() OVER (
      PARTITION BY c.id
      ORDER BY e.created_at, e.id
    ) AS stoqr_pick
  FROM etl.organisations e
  JOIN stoqr.companies c
    ON lower(trim(c.name)) = lower(trim(e.name))
  JOIN _stoqr_company_owners sco
    ON sco.company_id = c.id
   AND sco.owner_id = e.owner_id
)
SELECT etl_org_id, company_id
FROM candidates
WHERE etl_pick = 1 AND stoqr_pick = 1;

CREATE TEMP TABLE _company_org_map AS
SELECT
  c.id AS company_id,
  COALESCE(mp.etl_org_id, c.id) AS unified_org_id
FROM stoqr.companies c
LEFT JOIN _matched_pairs mp ON mp.company_id = c.id;

-- Update all StoQR company_id references to unified org ids.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'stoqr'
      AND column_name = 'company_id'
      AND table_name <> 'companies'
  LOOP
    EXECUTE format(
      'UPDATE stoqr.%I t SET company_id = m.unified_org_id FROM _company_org_map m WHERE t.company_id = m.company_id',
      rec.table_name
    );
  END LOOP;
END $$;

-- Update company primary keys (safe now that child FKs are dropped).
UPDATE stoqr.companies c
SET id = m.unified_org_id
FROM _company_org_map m
WHERE c.id = m.company_id
  AND c.id <> m.unified_org_id;

-- ─────────────────────────────────────────────────────────────
-- Migrate unified organisations and members
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.organisations (
  id,
  name,
  owner_id,
  stripe_customer_id,
  stripe_subscription_id,
  etl_org_id,
  created_at
)
SELECT
  e.id,
  e.name,
  e.owner_id,
  e.stripe_customer_id,
  e.stripe_subscription_id,
  e.id,
  e.created_at
FROM etl.organisations e
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  owner_id = EXCLUDED.owner_id,
  stripe_customer_id = COALESCE(public.organisations.stripe_customer_id, EXCLUDED.stripe_customer_id),
  stripe_subscription_id = COALESCE(public.organisations.stripe_subscription_id, EXCLUDED.stripe_subscription_id),
  etl_org_id = COALESCE(public.organisations.etl_org_id, EXCLUDED.etl_org_id);

INSERT INTO public.organisations (
  id,
  name,
  owner_id,
  stripe_customer_id,
  stoqr_company_id,
  created_at,
  updated_at
)
SELECT
  c.id,
  c.name,
  COALESCE(
    sco.owner_id,
    (SELECT p.id FROM public.profiles p ORDER BY p.created_at NULLS LAST, p.id LIMIT 1)
  ) AS owner_id,
  c.stripe_customer_id,
  c.id,
  c.created_at,
  c.updated_at
FROM stoqr.companies c
LEFT JOIN _stoqr_company_owners sco ON sco.company_id = c.id
ON CONFLICT (id) DO UPDATE
SET
  name = COALESCE(public.organisations.name, EXCLUDED.name),
  owner_id = COALESCE(public.organisations.owner_id, EXCLUDED.owner_id),
  stripe_customer_id = COALESCE(public.organisations.stripe_customer_id, EXCLUDED.stripe_customer_id),
  stoqr_company_id = COALESCE(public.organisations.stoqr_company_id, EXCLUDED.stoqr_company_id),
  updated_at = COALESCE(EXCLUDED.updated_at, public.organisations.updated_at);

-- Ensure owner always exists in unified members.
INSERT INTO public.organisation_members (org_id, user_id, role)
SELECT o.id, o.owner_id, 'owner'
FROM public.organisations o
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

-- Migrate ETL members.
INSERT INTO public.organisation_members (org_id, user_id, role, created_at)
SELECT
  om.org_id,
  om.user_id,
  om.role,
  om.created_at
FROM etl.organisation_members om
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

-- Migrate StoQR members.
INSERT INTO public.organisation_members (org_id, user_id, role, created_at)
SELECT
  cm.company_id,
  cm.user_id,
  public.map_stoqr_role_to_org_role(cm.role_id),
  cm.joined_at
FROM stoqr.company_members cm
ON CONFLICT (org_id, user_id) DO UPDATE
SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

-- ─────────────────────────────────────────────────────────────
-- Rewire old ETL/StoQR foreign keys to unified organisations
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT * FROM _fk_rewire LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.organisations(id) ON DELETE %s ON UPDATE %s',
      rec.table_schema,
      rec.table_name,
      rec.constraint_name,
      rec.column_name,
      rec.on_delete_action,
      rec.on_update_action
    );
  END LOOP;
END $$;

-- Keep legacy root tables explicitly tied to unified org identity.
ALTER TABLE etl.organisations
  DROP CONSTRAINT IF EXISTS etl_organisations_public_org_fk;
ALTER TABLE etl.organisations
  ADD CONSTRAINT etl_organisations_public_org_fk
  FOREIGN KEY (id) REFERENCES public.organisations(id) ON DELETE CASCADE;

ALTER TABLE stoqr.companies
  DROP CONSTRAINT IF EXISTS stoqr_companies_public_org_fk;
ALTER TABLE stoqr.companies
  ADD CONSTRAINT stoqr_companies_public_org_fk
  FOREIGN KEY (id) REFERENCES public.organisations(id) ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────
-- Per-app seat assignment + limits
-- ─────────────────────────────────────────────────────────────

-- Seed seat limits for all organisations/apps.
INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
SELECT o.id, a.code, 0
FROM public.organisations o
CROSS JOIN public.apps a
ON CONFLICT (org_id, app_code) DO NOTHING;

-- Assign ETL seats from ETL membership model.
INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT DISTINCT om.id, 'etl'
FROM public.organisation_members om
WHERE EXISTS (
  SELECT 1
  FROM etl.organisations eo
  WHERE eo.id = om.org_id
)
ON CONFLICT (org_member_id, app_code) DO NOTHING;

-- Assign StoQR seats from StoQR membership model.
INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
SELECT DISTINCT om.id, 'stoqr'
FROM public.organisation_members om
WHERE EXISTS (
  SELECT 1
  FROM stoqr.company_members cm
  WHERE cm.company_id = om.org_id
    AND cm.user_id = om.user_id
)
ON CONFLICT (org_member_id, app_code) DO NOTHING;

-- Ensure seat limits are at least current assignments.
WITH assigned AS (
  SELECT
    om.org_id,
    mas.app_code,
    COUNT(*)::INTEGER AS assigned_count
  FROM public.organisation_member_app_seats mas
  JOIN public.organisation_members om ON om.id = mas.org_member_id
  GROUP BY om.org_id, mas.app_code
)
UPDATE public.organisation_app_seats s
SET seat_limit = GREATEST(s.seat_limit, a.assigned_count)
FROM assigned a
WHERE s.org_id = a.org_id
  AND s.app_code = a.app_code;

CREATE OR REPLACE FUNCTION public.enforce_org_app_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_seat_limit INTEGER;
  v_assigned_count INTEGER;
BEGIN
  SELECT org_id INTO v_org_id
  FROM public.organisation_members
  WHERE id = NEW.org_member_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid organisation member id: %', NEW.org_member_id;
  END IF;

  SELECT seat_limit INTO v_seat_limit
  FROM public.organisation_app_seats
  WHERE org_id = v_org_id
    AND app_code = NEW.app_code;

  IF v_seat_limit IS NULL THEN
    RAISE EXCEPTION 'Seat limit is not configured for org % app %', v_org_id, NEW.app_code;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_assigned_count
  FROM public.organisation_member_app_seats mas
  JOIN public.organisation_members om ON om.id = mas.org_member_id
  WHERE om.org_id = v_org_id
    AND mas.app_code = NEW.app_code
    AND (
      TG_OP <> 'UPDATE'
      OR mas.org_member_id <> OLD.org_member_id
      OR mas.app_code <> OLD.app_code
    );

  IF v_assigned_count >= v_seat_limit THEN
    RAISE EXCEPTION 'Seat limit exceeded for org % app % (% assigned / % limit)', v_org_id, NEW.app_code, v_assigned_count, v_seat_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_org_app_seat_limit ON public.organisation_member_app_seats;
CREATE TRIGGER trg_enforce_org_app_seat_limit
  BEFORE INSERT OR UPDATE ON public.organisation_member_app_seats
  FOR EACH ROW EXECUTE PROCEDURE public.enforce_org_app_seat_limit();

-- ─────────────────────────────────────────────────────────────
-- Helper functions now point to unified model
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisations
    WHERE id = p_org_id
      AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE org_id = p_org_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisation_members
    WHERE org_id = p_org_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner_strictly(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organisations
    WHERE id = p_org_id
      AND owner_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  IF public.is_app_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organisation_members om
    LEFT JOIN stoqr.company_members cm
      ON cm.company_id = om.org_id
     AND cm.user_id = om.user_id
    LEFT JOIN stoqr.role_permissions rp
      ON rp.role_id = cm.role_id
     AND rp.permission_code = _permission_code
    WHERE om.org_id = _company_id
      AND om.user_id = auth.uid()
      AND (
        om.role = 'owner'
        OR (om.role = 'admin' AND _permission_code IN ('company.manage', 'billing.manage', 'members.view', 'members.manage', 'roles.manage'))
        OR rp.role_id IS NOT NULL
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_org_owner_member_and_default_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

  INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
  SELECT NEW.id, a.code, 0
  FROM public.apps a
  ON CONFLICT (org_id, app_code) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_org_owner_member_and_default_seats ON public.organisations;
CREATE TRIGGER trg_ensure_org_owner_member_and_default_seats
  AFTER INSERT ON public.organisations
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_org_owner_member_and_default_seats();

CREATE OR REPLACE FUNCTION public.sync_etl_org_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM stoqr.companies c WHERE c.id = OLD.id) THEN
      DELETE FROM public.organisations WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  INSERT INTO public.organisations (
    id,
    name,
    owner_id,
    stripe_customer_id,
    stripe_subscription_id,
    etl_org_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.name,
    NEW.owner_id,
    NEW.stripe_customer_id,
    NEW.stripe_subscription_id,
    NEW.id,
    NEW.created_at,
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = EXCLUDED.name,
    owner_id = EXCLUDED.owner_id,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.organisations.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, public.organisations.stripe_subscription_id),
    etl_org_id = COALESCE(public.organisations.etl_org_id, EXCLUDED.etl_org_id),
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_stoqr_company_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM etl.organisations e WHERE e.id = OLD.id) THEN
      DELETE FROM public.organisations WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  SELECT o.owner_id INTO v_owner_id
  FROM public.organisations o
  WHERE o.id = NEW.id;

  IF v_owner_id IS NULL THEN
    SELECT cm.user_id INTO v_owner_id
    FROM stoqr.company_members cm
    WHERE cm.company_id = NEW.id
    ORDER BY cm.joined_at
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL THEN
    v_owner_id := auth.uid();
  END IF;

  IF v_owner_id IS NULL THEN
    SELECT p.id INTO v_owner_id
    FROM public.profiles p
    ORDER BY p.created_at NULLS LAST, p.id
    LIMIT 1;
  END IF;

  INSERT INTO public.organisations (
    id,
    name,
    owner_id,
    stripe_customer_id,
    stoqr_company_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.name,
    v_owner_id,
    NEW.stripe_customer_id,
    NEW.id,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, public.organisations.name),
    owner_id = COALESCE(public.organisations.owner_id, EXCLUDED.owner_id),
    stripe_customer_id = COALESCE(public.organisations.stripe_customer_id, EXCLUDED.stripe_customer_id),
    stoqr_company_id = COALESCE(public.organisations.stoqr_company_id, EXCLUDED.stoqr_company_id),
    updated_at = COALESCE(EXCLUDED.updated_at, now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_etl_org_to_unified ON etl.organisations;
CREATE TRIGGER trg_sync_etl_org_to_unified
  AFTER INSERT OR UPDATE OR DELETE ON etl.organisations
  FOR EACH ROW EXECUTE PROCEDURE public.sync_etl_org_to_unified();

DROP TRIGGER IF EXISTS trg_sync_stoqr_company_to_unified ON stoqr.companies;
CREATE TRIGGER trg_sync_stoqr_company_to_unified
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.companies
  FOR EACH ROW EXECUTE PROCEDURE public.sync_stoqr_company_to_unified();

-- ─────────────────────────────────────────────────────────────
-- Keep legacy member tables synced with unified memberships
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_public_member_to_legacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl, stoqr
AS $$
DECLARE
  v_stoqr_role_id UUID;
  v_etl_role TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM etl.organisation_members
    WHERE org_id = OLD.org_id
      AND user_id = OLD.user_id;

    DELETE FROM stoqr.company_members
    WHERE company_id = OLD.org_id
      AND user_id = OLD.user_id;

    RETURN OLD;
  END IF;

  v_etl_role := CASE
    WHEN NEW.role IN ('owner', 'admin') THEN 'admin'
    WHEN NEW.role = 'editor' THEN 'editor'
    ELSE 'member'
  END;

  IF EXISTS (SELECT 1 FROM etl.organisations e WHERE e.id = NEW.org_id) THEN
    INSERT INTO etl.organisation_members (org_id, user_id, role)
    VALUES (NEW.org_id, NEW.user_id, v_etl_role)
    ON CONFLICT (org_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
  END IF;

  IF EXISTS (SELECT 1 FROM stoqr.companies c WHERE c.id = NEW.org_id) THEN
    v_stoqr_role_id := public.pick_stoqr_role_for_org_member(NEW.org_id, NEW.role);

    INSERT INTO stoqr.company_members (company_id, user_id, role_id)
    VALUES (NEW.org_id, NEW.user_id, v_stoqr_role_id)
    ON CONFLICT (user_id, company_id) DO UPDATE
      SET role_id = COALESCE(EXCLUDED.role_id, stoqr.company_members.role_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_etl_member_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.organisation_members
    WHERE org_id = OLD.org_id
      AND user_id = OLD.user_id
      AND role <> 'owner';

    RETURN OLD;
  END IF;

  v_role := CASE
    WHEN NEW.role = 'admin' THEN 'admin'
    WHEN NEW.role = 'editor' THEN 'editor'
    ELSE 'member'
  END;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (NEW.org_id, NEW.user_id, v_role)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_stoqr_member_to_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.organisation_members
    WHERE org_id = OLD.company_id
      AND user_id = OLD.user_id
      AND role <> 'owner';

    RETURN OLD;
  END IF;

  v_role := public.map_stoqr_role_to_org_role(NEW.role_id);

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (NEW.company_id, NEW.user_id, v_role)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = public.pick_higher_org_role(public.organisation_members.role, EXCLUDED.role);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_public_member_to_legacy ON public.organisation_members;
CREATE TRIGGER trg_sync_public_member_to_legacy
  AFTER INSERT OR UPDATE OR DELETE ON public.organisation_members
  FOR EACH ROW EXECUTE PROCEDURE public.sync_public_member_to_legacy();

DROP TRIGGER IF EXISTS trg_sync_etl_member_to_unified ON etl.organisation_members;
CREATE TRIGGER trg_sync_etl_member_to_unified
  AFTER INSERT OR UPDATE OR DELETE ON etl.organisation_members
  FOR EACH ROW EXECUTE PROCEDURE public.sync_etl_member_to_unified();

DROP TRIGGER IF EXISTS trg_sync_stoqr_member_to_unified ON stoqr.company_members;
CREATE TRIGGER trg_sync_stoqr_member_to_unified
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.company_members
  FOR EACH ROW EXECUTE PROCEDURE public.sync_stoqr_member_to_unified();

-- ─────────────────────────────────────────────────────────────
-- Invitation flow compatibility
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_invite(invite_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_user_email := (SELECT auth.jwt() ->> 'email');

  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite
  FROM etl.organisation_invites
  WHERE id = invite_id;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.email <> v_user_email THEN
    RAISE EXCEPTION 'This invite does not belong to you';
  END IF;

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, v_user_id, v_invite.role)
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

  INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
  SELECT om.id, 'etl'
  FROM public.organisation_members om
  WHERE om.org_id = v_invite.org_id
    AND om.user_id = v_user_id
  ON CONFLICT (org_member_id, app_code) DO NOTHING;

  DELETE FROM etl.organisation_invites WHERE id = invite_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(UUID) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- Policy updates to read unified memberships
-- ─────────────────────────────────────────────────────────────

-- ETL policies that had direct joins to etl.organisation_members
DROP POLICY IF EXISTS "workflows_select_unified" ON etl.workflows;
DROP POLICY IF EXISTS "workflows_update_owner_or_member" ON etl.workflows;
DROP POLICY IF EXISTS "workflows_delete_owner_or_member" ON etl.workflows;
DROP POLICY IF EXISTS "workflow_executions_select_unified" ON etl.workflow_executions;
DROP POLICY IF EXISTS "versions_select" ON etl.workflow_versions;
DROP POLICY IF EXISTS "versions_insert" ON etl.workflow_versions;
DROP POLICY IF EXISTS "notifications_select" ON etl.notification_settings;
DROP POLICY IF EXISTS "notifications_insert" ON etl.notification_settings;
DROP POLICY IF EXISTS "notifications_update" ON etl.notification_settings;
DROP POLICY IF EXISTS "notifications_delete" ON etl.notification_settings;

CREATE POLICY "workflows_select_unified" ON etl.workflows
  FOR SELECT USING (
    (org_id IS NULL AND owner_id = (SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = workflows.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workflows_update_owner_or_member" ON etl.workflows
  FOR UPDATE USING (
    (SELECT auth.uid()) = owner_id
    OR EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = workflows.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workflows_delete_owner_or_member" ON etl.workflows
  FOR DELETE USING (
    (SELECT auth.uid()) = owner_id
    OR EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = workflows.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "workflow_executions_select_unified" ON etl.workflow_executions
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = workflow_executions.org_id
        AND om.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "versions_select" ON etl.workflow_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY "versions_insert" ON etl.workflow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "notifications_select" ON etl.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY "notifications_insert" ON etl.notification_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "notifications_update" ON etl.notification_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "notifications_delete" ON etl.notification_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.organisation_members om
            WHERE om.org_id = w.org_id AND om.user_id = auth.uid()
          )
        )
    )
  );

-- StoQR policies that had direct membership checks.
DROP POLICY IF EXISTS "Members can view their company" ON stoqr.companies;
DROP POLICY IF EXISTS "Members can view company roles" ON stoqr.roles;
DROP POLICY IF EXISTS "Members can view role permissions" ON stoqr.role_permissions;
DROP POLICY IF EXISTS "Users can view their own memberships" ON stoqr.company_members;
DROP POLICY IF EXISTS "Managers can view all members" ON stoqr.company_members;
DROP POLICY IF EXISTS "Give users access to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images from their company" ON storage.objects;

CREATE POLICY "Members can view their company" ON stoqr.companies
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = companies.id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view company roles" ON stoqr.roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id = roles.company_id
    )
  );

CREATE POLICY "Members can view role permissions" ON stoqr.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stoqr.roles r
      JOIN public.organisation_members om ON r.company_id = om.org_id
      WHERE r.id = role_permissions.role_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own memberships" ON stoqr.company_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organisation_members om
      WHERE om.org_id = company_members.company_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Managers can view all members" ON stoqr.company_members
  FOR SELECT USING (
    has_permission(company_id, 'members.view')
    OR public.is_org_admin(company_id, auth.uid())
  );

CREATE POLICY "Give users access to their company folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT om.org_id::text
      FROM public.organisation_members om
      WHERE om.user_id = auth.uid()
        AND has_permission(om.org_id, 'products.manage')
    )
  );

CREATE POLICY "Users can view images from their company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT om.org_id::text
      FROM public.organisation_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Update ETL usage RPC authorization checks that referenced legacy members.
CREATE OR REPLACE FUNCTION public.get_org_member_usage_stats(target_org_id UUID)
RETURNS TABLE(total_count BIGINT, success_count BIGINT, failed_count BIGINT, daily_date DATE, daily_total BIGINT, daily_success BIGINT, daily_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_org_member(target_org_id, auth.uid())
     AND NOT public.is_org_owner(target_org_id, auth.uid())
     AND NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT
      count(*)::BIGINT,
      count(*) FILTER (WHERE we.status = 'success')::BIGINT,
      count(*) FILTER (WHERE we.status = 'failed')::BIGINT,
      we.started_at::DATE AS daily_date,
      count(*)::BIGINT,
      count(*) FILTER (WHERE we.status = 'success')::BIGINT,
      count(*) FILTER (WHERE we.status = 'failed')::BIGINT
    FROM etl.workflow_executions we
    INNER JOIN etl.workflows w ON w.id = we.workflow_id
    WHERE w.org_id = target_org_id
      AND we.started_at >= now() - INTERVAL '30 days'
    GROUP BY we.started_at::DATE
    ORDER BY daily_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_active_users(target_org_id UUID)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT, execution_count BIGINT, last_active TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_org_member(target_org_id, auth.uid())
     AND NOT public.is_org_owner(target_org_id, auth.uid())
     AND NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
    SELECT
      we.user_id,
      p.email,
      p.full_name,
      count(*)::BIGINT AS execution_count,
      max(we.started_at) AS last_active
    FROM etl.workflow_executions we
    INNER JOIN etl.workflows w ON w.id = we.workflow_id
    INNER JOIN public.profiles p ON p.id = we.user_id
    WHERE w.org_id = target_org_id
      AND we.started_at >= now() - INTERVAL '30 days'
    GROUP BY we.user_id, p.email, p.full_name
    ORDER BY execution_count DESC;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS + grants for new shared tables
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_app_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_member_app_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organisations_select" ON public.organisations;
DROP POLICY IF EXISTS "organisations_insert" ON public.organisations;
DROP POLICY IF EXISTS "organisations_update" ON public.organisations;
DROP POLICY IF EXISTS "organisations_delete" ON public.organisations;

CREATE POLICY "organisations_select" ON public.organisations
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.is_org_member(id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisations_insert" ON public.organisations
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisations_update" ON public.organisations
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.is_org_admin(id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisations_delete" ON public.organisations
  FOR DELETE USING (
    owner_id = auth.uid()
    OR public.is_app_super_admin()
  );

DROP POLICY IF EXISTS "organisation_members_select" ON public.organisation_members;
DROP POLICY IF EXISTS "organisation_members_insert" ON public.organisation_members;
DROP POLICY IF EXISTS "organisation_members_update" ON public.organisation_members;
DROP POLICY IF EXISTS "organisation_members_delete" ON public.organisation_members;

CREATE POLICY "organisation_members_select" ON public.organisation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisation_members_insert" ON public.organisation_members
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisation_members_update" ON public.organisation_members
  FOR UPDATE USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "organisation_members_delete" ON public.organisation_members
  FOR DELETE USING (
    (public.is_org_admin(org_id, auth.uid()) OR public.is_app_super_admin())
    AND NOT (role = 'owner' AND user_id = (SELECT owner_id FROM public.organisations o WHERE o.id = organisation_members.org_id))
  );

DROP POLICY IF EXISTS "apps_select" ON public.apps;
CREATE POLICY "apps_select" ON public.apps
  FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "app_seats_select" ON public.organisation_app_seats;
DROP POLICY IF EXISTS "app_seats_manage" ON public.organisation_app_seats;

CREATE POLICY "app_seats_select" ON public.organisation_app_seats
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "app_seats_manage" ON public.organisation_app_seats
  FOR ALL USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

DROP POLICY IF EXISTS "member_app_seats_select" ON public.organisation_member_app_seats;
DROP POLICY IF EXISTS "member_app_seats_manage" ON public.organisation_member_app_seats;

CREATE POLICY "member_app_seats_select" ON public.organisation_member_app_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (om.user_id = auth.uid() OR public.is_org_member(om.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  );

CREATE POLICY "member_app_seats_manage" ON public.organisation_member_app_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (public.is_org_admin(om.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (public.is_org_admin(om.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_members TO authenticated;
GRANT SELECT ON public.apps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_app_seats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organisation_member_app_seats TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner_strictly(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_higher_org_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_stoqr_role_to_org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_stoqr_role_for_org_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_org_app_seat_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_member_to_legacy() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_etl_member_to_unified() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_stoqr_member_to_unified() TO service_role;
