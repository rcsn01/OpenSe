-- ============================================================
-- Baseline: Shared Functions (Public + StoQR)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_app_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admin_members
    WHERE user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_super_admin_status()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_app_super_admin();
$$;

REVOKE ALL ON FUNCTION public.get_super_admin_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_super_admin_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.has_users()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles);
$$;

GRANT EXECUTE ON FUNCTION public.has_users() TO anon;
GRANT EXECUTE ON FUNCTION public.has_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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

  IF NOT EXISTS (SELECT 1 FROM public.super_admin_members) THEN
    INSERT INTO public.super_admin_members (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.pick_higher_org_role(existing_role TEXT, new_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(existing_role, 'member') = 'owner' OR COALESCE(new_role, 'member') = 'owner' THEN 'owner'
    WHEN COALESCE(existing_role, 'member') = 'admin' OR COALESCE(new_role, 'member') = 'admin' THEN 'admin'
    WHEN COALESCE(existing_role, 'member') = 'editor' OR COALESCE(new_role, 'member') = 'editor' THEN 'editor'
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

CREATE OR REPLACE FUNCTION stoqr.update_inventory_count()
RETURNS TRIGGER AS $$
DECLARE
  current_qty INTEGER;
  qty_delta INTEGER;
BEGIN
  IF NEW.transaction_type IN ('purchase', 'return', 'adjustment') THEN
    qty_delta := NEW.quantity_change;
  ELSIF NEW.transaction_type IN ('sale', 'loss') THEN
    qty_delta := -abs(NEW.quantity_change);
  END IF;

  SELECT quantity_on_hand INTO current_qty
  FROM stoqr.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  UPDATE stoqr.products
  SET quantity_on_hand = current_qty + qty_delta
  WHERE id = NEW.product_id;

  NEW.stock_after := current_qty + qty_delta;
  NEW.quantity_change := qty_delta;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_inventory_transaction ON stoqr.inventory_transactions;
CREATE TRIGGER on_inventory_transaction
  BEFORE INSERT ON stoqr.inventory_transactions
  FOR EACH ROW EXECUTE PROCEDURE stoqr.update_inventory_count();

GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner_strictly(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_higher_org_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_stoqr_role_to_org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_stoqr_role_for_org_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_org_app_seat_limit() TO authenticated;
