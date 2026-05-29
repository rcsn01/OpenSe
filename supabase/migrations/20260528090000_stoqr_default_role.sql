-- Rename the StoQR system Guest role to Default and make its permissions manager-editable.

CREATE OR REPLACE FUNCTION public.prevent_owner_role_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_SCHEMA = 'stoqr' THEN
    IF TG_OP = 'INSERT' THEN
      IF lower(NEW.name) NOT IN ('owner', 'default', 'guest') AND NEW.role_rank <= 0 THEN
        RAISE EXCEPTION 'Custom StoQR roles must use a positive role rank';
      END IF;

      RETURN NEW;
    END IF;

    IF lower(OLD.name) IN ('owner', 'default', 'guest')
      AND current_setting('app.stoqr_repair_system_role', true) IS DISTINCT FROM 'on'
    THEN
      RAISE EXCEPTION 'The % role is system-managed and cannot be modified or deleted', OLD.name;
    END IF;

    IF TG_OP = 'UPDATE'
      AND lower(OLD.name) NOT IN ('owner', 'default', 'guest')
      AND lower(NEW.name) IN ('owner', 'default', 'guest')
    THEN
      RAISE EXCEPTION 'Owner, Default, and Guest are reserved system role names';
    END IF;

    IF TG_OP = 'UPDATE' AND lower(NEW.name) NOT IN ('owner', 'default', 'guest') AND NEW.role_rank <= 0 THEN
      RAISE EXCEPTION 'Custom StoQR roles must use a positive role rank';
    END IF;
  ELSIF lower(OLD.name) = 'owner' THEN
    RAISE EXCEPTION 'The Owner role is system-managed and cannot be modified or deleted';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  PERFORM set_config('app.stoqr_repair_system_role', 'on', true);

  UPDATE stoqr.roles r
  SET name = 'Default custom ' || substr(r.id::text, 1, 8),
      role_rank = COALESCE((
        SELECT max(existing.role_rank) + 1
        FROM stoqr.roles existing
        WHERE existing.company_id = r.company_id
          AND existing.id <> r.id
      ), 100)
  WHERE lower(r.name) = 'default'
    AND EXISTS (
      SELECT 1
      FROM stoqr.roles guest_role
      WHERE guest_role.company_id = r.company_id
        AND lower(guest_role.name) = 'guest'
    );

  UPDATE stoqr.roles
  SET name = 'Default',
      description = 'System-managed default role',
      role_rank = 0
  WHERE lower(name) = 'guest';

  UPDATE stoqr.roles
  SET description = 'System-managed default role',
      role_rank = 0
  WHERE lower(name) = 'default';
END;
$$;

CREATE OR REPLACE FUNCTION public.pick_stoqr_role_for_org_member(_org_id UUID, _org_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  IF _org_role = 'owner' THEN
    SELECT r.id
    INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND lower(r.name) = 'owner'
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;
  END IF;

  IF _org_role = 'admin' THEN
    SELECT r.id
    INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND lower(r.name) <> 'owner'
      AND EXISTS (
        SELECT 1
        FROM stoqr.role_permissions rp
        WHERE rp.role_id = r.id
          AND rp.permission_code IN ('organisation.members.manage', 'members.manage')
      )
    ORDER BY r.role_rank DESC, r.created_at
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;

    SELECT r.id
    INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND EXISTS (
        SELECT 1
        FROM stoqr.role_permissions rp
        WHERE rp.role_id = r.id
          AND rp.permission_code IN ('organisation.company.manage', 'company.manage')
      )
    ORDER BY r.role_rank DESC, r.created_at
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;
  END IF;

  IF _org_role = 'editor' THEN
    SELECT r.id
    INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND EXISTS (
        SELECT 1
        FROM stoqr.role_permissions rp
        WHERE rp.role_id = r.id
          AND rp.permission_code IN ('inventory.edit', 'inventory.create', 'products.manage')
      )
    ORDER BY r.role_rank DESC, r.created_at
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;
  END IF;

  SELECT r.id
  INTO v_role_id
  FROM stoqr.roles r
  WHERE r.company_id = _org_id
    AND lower(r.name) = 'default'
  ORDER BY r.created_at
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    RETURN v_role_id;
  END IF;

  SELECT r.id
  INTO v_role_id
  FROM stoqr.roles r
  WHERE r.company_id = _org_id
    AND lower(r.name) <> 'owner'
  ORDER BY r.role_rank DESC, r.created_at
  LIMIT 1;

  RETURN v_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.pick_next_stoqr_role(p_company_id UUID, p_excluded_role_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
  SELECT r.id
  FROM stoqr.roles r
  WHERE r.company_id = p_company_id
    AND lower(r.name) <> 'owner'
    AND (p_excluded_role_id IS NULL OR r.id <> p_excluded_role_id)
  ORDER BY CASE WHEN lower(r.name) = 'default' THEN 0 ELSE 1 END, r.role_rank DESC, r.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_stoqr_default_role(p_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_default_role_id UUID;
  v_conflicting_rank_role_id UUID;
  v_created BOOLEAN := false;
BEGIN
  SELECT r.id
  INTO v_default_role_id
  FROM stoqr.roles r
  WHERE r.company_id = p_org_id
    AND lower(r.name) IN ('default', 'guest')
  ORDER BY CASE WHEN lower(r.name) = 'default' THEN 0 ELSE 1 END, r.created_at
  LIMIT 1;

  SELECT r.id
  INTO v_conflicting_rank_role_id
  FROM stoqr.roles r
  WHERE r.company_id = p_org_id
    AND lower(r.name) NOT IN ('default', 'guest')
    AND r.role_rank = 0
  ORDER BY r.created_at
  LIMIT 1;

  IF v_conflicting_rank_role_id IS NOT NULL THEN
    UPDATE stoqr.roles r
    SET role_rank = COALESCE((
      SELECT max(existing.role_rank) + 1
      FROM stoqr.roles existing
      WHERE existing.company_id = p_org_id
        AND existing.id <> v_conflicting_rank_role_id
    ), 100)
    WHERE r.id = v_conflicting_rank_role_id;
  END IF;

  IF v_default_role_id IS NULL THEN
    INSERT INTO stoqr.roles (company_id, name, description, role_rank)
    VALUES (p_org_id, 'Default', 'System-managed default role', 0)
    RETURNING id INTO v_default_role_id;
    v_created := true;
  ELSE
    PERFORM set_config('app.stoqr_repair_system_role', 'on', true);

    UPDATE stoqr.roles
    SET name = 'Default',
        description = 'System-managed default role',
        role_rank = 0
    WHERE id = v_default_role_id;
  END IF;

  IF v_created THEN
    INSERT INTO stoqr.role_permissions (role_id, permission_code)
    VALUES
      (v_default_role_id, 'dashboard.view'),
      (v_default_role_id, 'inventory.view')
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  RETURN v_default_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_stoqr_guest_role(p_org_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
  SELECT public.ensure_stoqr_default_role(p_org_id);
$$;

CREATE OR REPLACE FUNCTION public.ensure_owner_app_roles(p_org_id UUID)
RETURNS TABLE (owner_stoqr_role_id UUID, owner_etl_role_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr, etl
AS $$
BEGIN
  SELECT r.id
  INTO owner_stoqr_role_id
  FROM stoqr.roles r
  WHERE r.company_id = p_org_id
    AND lower(r.name) = 'owner'
  ORDER BY r.created_at
  LIMIT 1;

  IF owner_stoqr_role_id IS NULL THEN
    INSERT INTO stoqr.roles (company_id, name, description, role_rank)
    VALUES (p_org_id, 'Owner', 'System-managed owner role', 1000)
    RETURNING id INTO owner_stoqr_role_id;
  END IF;

  INSERT INTO stoqr.role_permissions (role_id, permission_code)
  SELECT owner_stoqr_role_id, ap.code
  FROM stoqr.app_permissions ap
  ON CONFLICT (role_id, permission_code) DO NOTHING;

  PERFORM public.ensure_stoqr_default_role(p_org_id);

  SELECT r.id
  INTO owner_etl_role_id
  FROM etl.roles r
  WHERE r.org_id = p_org_id
    AND lower(r.name) = 'owner'
  ORDER BY r.created_at
  LIMIT 1;

  IF owner_etl_role_id IS NULL THEN
    INSERT INTO etl.roles (org_id, name, description, role_rank)
    VALUES (p_org_id, 'Owner', 'System-managed owner role', 1000)
    RETURNING id INTO owner_etl_role_id;
  END IF;

  INSERT INTO etl.role_permissions (role_id, permission_code)
  SELECT owner_etl_role_id, ap.code
  FROM etl.app_permissions ap
  ON CONFLICT (role_id, permission_code) DO NOTHING;

  RETURN QUERY
  SELECT owner_stoqr_role_id, owner_etl_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_owner_role_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_SCHEMA = 'stoqr' THEN
    IF TG_OP = 'INSERT' THEN
      IF lower(NEW.name) NOT IN ('owner', 'default', 'guest') AND NEW.role_rank <= 0 THEN
        RAISE EXCEPTION 'Custom StoQR roles must use a positive role rank';
      END IF;

      RETURN NEW;
    END IF;

    IF lower(OLD.name) IN ('owner', 'default', 'guest')
      AND current_setting('app.stoqr_repair_system_role', true) IS DISTINCT FROM 'on'
    THEN
      RAISE EXCEPTION 'The % role is system-managed and cannot be modified or deleted', OLD.name;
    END IF;

    IF TG_OP = 'UPDATE'
      AND lower(OLD.name) NOT IN ('owner', 'default', 'guest')
      AND lower(NEW.name) IN ('owner', 'default', 'guest')
    THEN
      RAISE EXCEPTION 'Owner, Default, and Guest are reserved system role names';
    END IF;

    IF TG_OP = 'UPDATE' AND lower(NEW.name) NOT IN ('owner', 'default', 'guest') AND NEW.role_rank <= 0 THEN
      RAISE EXCEPTION 'Custom StoQR roles must use a positive role rank';
    END IF;
  ELSIF lower(OLD.name) = 'owner' THEN
    RAISE EXCEPTION 'The Owner role is system-managed and cannot be modified or deleted';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_stoqr_guest_permission_mutation ON stoqr.role_permissions;
DROP FUNCTION IF EXISTS public.prevent_stoqr_guest_permission_mutation();

DROP TRIGGER IF EXISTS trg_assign_stoqr_guest_role_for_seat ON public.organisation_member_app_seats;
DROP FUNCTION IF EXISTS public.assign_stoqr_guest_role_for_seat();
DROP TRIGGER IF EXISTS trg_assign_stoqr_default_role_for_seat ON public.organisation_member_app_seats;

CREATE OR REPLACE FUNCTION public.assign_stoqr_default_role_for_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_default_role_id UUID;
BEGIN
  IF NEW.app_code <> 'stoqr' THEN
    RETURN NEW;
  END IF;

  SELECT om.org_id, om.user_id
  INTO v_org_id, v_user_id
  FROM public.organisation_members om
  WHERE om.id = NEW.org_member_id;

  IF v_org_id IS NULL OR v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT public.ensure_stoqr_default_role(v_org_id)
  INTO v_default_role_id;

  INSERT INTO stoqr.organisation_member_roles (user_id, company_id, role_id)
  VALUES (v_user_id, v_org_id, v_default_role_id)
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_stoqr_default_role_for_seat
  AFTER INSERT ON public.organisation_member_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_stoqr_default_role_for_seat();

DROP POLICY IF EXISTS "Admins can manage roles" ON stoqr.roles;
CREATE POLICY "Admins can manage roles" ON stoqr.roles
  FOR ALL USING (
    public.has_permission(company_id, 'organisation.roles.manage')
    AND lower(name) NOT IN ('owner', 'default', 'guest')
  )
  WITH CHECK (
    public.has_permission(company_id, 'organisation.roles.manage')
    AND lower(name) NOT IN ('owner', 'default', 'guest')
    AND role_rank > 0
  );

DROP POLICY IF EXISTS "Admins can manage role permissions" ON stoqr.role_permissions;
CREATE POLICY "Admins can manage role permissions" ON stoqr.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND public.has_permission(r.company_id, 'organisation.roles.manage')
        AND lower(r.name) <> 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND public.has_permission(r.company_id, 'organisation.roles.manage')
        AND lower(r.name) <> 'owner'
    )
  );

REVOKE ALL ON FUNCTION public.ensure_stoqr_default_role(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_stoqr_guest_role(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_stoqr_default_role_for_seat() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_stoqr_default_role(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_stoqr_guest_role(UUID) TO service_role;
