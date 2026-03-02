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

CREATE OR REPLACE FUNCTION public.demote_org_role(existing_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(existing_role, 'member')
    WHEN 'owner' THEN 'admin'
    WHEN 'admin' THEN 'editor'
    WHEN 'editor' THEN 'member'
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
    ORDER BY r.role_rank DESC, r.created_at
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
    ORDER BY r.role_rank DESC, r.created_at
    LIMIT 1;

    IF v_role_id IS NOT NULL THEN
      RETURN v_role_id;
    END IF;
  END IF;

  SELECT r.id INTO v_role_id
  FROM stoqr.roles r
  WHERE r.company_id = _org_id
  ORDER BY r.role_rank DESC, r.created_at
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

CREATE OR REPLACE FUNCTION public.pick_next_stoqr_role(p_company_id UUID, p_excluded_role_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
  SELECT r.id
  FROM stoqr.roles r
  WHERE r.company_id = p_company_id
    AND lower(r.name) <> 'owner'
    AND (p_excluded_role_id IS NULL OR r.id <> p_excluded_role_id)
  ORDER BY r.role_rank DESC, r.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.pick_next_etl_role(p_org_id UUID, p_excluded_role_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, etl
AS $$
  SELECT r.id
  FROM etl.roles r
  WHERE r.org_id = p_org_id
    AND lower(r.name) <> 'owner'
    AND (p_excluded_role_id IS NULL OR r.id <> p_excluded_role_id)
  ORDER BY r.role_rank DESC, r.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.ensure_owner_app_roles(p_org_id UUID)
RETURNS TABLE (owner_stoqr_role_id UUID, owner_etl_role_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr, etl
AS $$
BEGIN
  SELECT r.id INTO owner_stoqr_role_id
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

  SELECT r.id INTO owner_etl_role_id
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

  RETURN QUERY SELECT owner_stoqr_role_id, owner_etl_role_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_owner_member_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT o.owner_id INTO v_owner_id
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

CREATE OR REPLACE FUNCTION public.prevent_owner_role_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(OLD.name) = 'owner' THEN
    RAISE EXCEPTION 'The Owner role is system-managed and cannot be modified or deleted';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_owner_role_permission_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner_role BOOLEAN;
BEGIN
  IF TG_TABLE_SCHEMA = 'stoqr' THEN
    SELECT EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = OLD.role_id
        AND lower(r.name) = 'owner'
    ) INTO v_is_owner_role;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = OLD.role_id
        AND lower(r.name) = 'owner'
    ) INTO v_is_owner_role;
  END IF;

  IF v_is_owner_role THEN
    RAISE EXCEPTION 'Cannot remove permissions from the Owner role';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_new_permission_to_owner_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_SCHEMA = 'stoqr' THEN
    INSERT INTO stoqr.role_permissions (role_id, permission_code)
    SELECT r.id, NEW.code
    FROM stoqr.roles r
    WHERE lower(r.name) = 'owner'
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  ELSE
    INSERT INTO etl.role_permissions (role_id, permission_code)
    SELECT r.id, NEW.code
    FROM etl.roles r
    WHERE lower(r.name) = 'owner'
    ON CONFLICT (role_id, permission_code) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_org_owner_member_and_default_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr, etl
AS $$
DECLARE
  v_owner_member_id UUID;
  v_previous_owner_member_id UUID;
  v_owner_stoqr_role_id UUID;
  v_owner_etl_role_id UUID;
  v_previous_stoqr_role_id UUID;
  v_previous_etl_role_id UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  SELECT owner_stoqr_role_id, owner_etl_role_id
  INTO v_owner_stoqr_role_id, v_owner_etl_role_id
  FROM public.ensure_owner_app_roles(NEW.id);

  INSERT INTO public.organisation_members (org_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (org_id, user_id) DO UPDATE
    SET role = 'owner';

  IF TG_OP = 'UPDATE' AND OLD.owner_id IS DISTINCT FROM NEW.owner_id AND OLD.owner_id IS NOT NULL THEN
    UPDATE public.organisation_members
    SET role = public.demote_org_role(public.organisation_members.role)
    WHERE org_id = NEW.id
      AND user_id = OLD.owner_id;

    SELECT id INTO v_previous_owner_member_id
    FROM public.organisation_members
    WHERE org_id = NEW.id
      AND user_id = OLD.owner_id
    LIMIT 1;

    SELECT public.pick_next_etl_role(NEW.id, v_owner_etl_role_id)
    INTO v_previous_etl_role_id;

    IF v_previous_owner_member_id IS NOT NULL THEN
      IF v_previous_etl_role_id IS NULL THEN
        DELETE FROM etl.organisation_member_roles
        WHERE org_member_id = v_previous_owner_member_id;
      ELSE
        INSERT INTO etl.organisation_member_roles (org_member_id, role_id)
        VALUES (v_previous_owner_member_id, v_previous_etl_role_id)
        ON CONFLICT (org_member_id) DO UPDATE
          SET role_id = EXCLUDED.role_id;
      END IF;
    END IF;

    SELECT public.pick_next_stoqr_role(NEW.id, v_owner_stoqr_role_id)
    INTO v_previous_stoqr_role_id;

    IF v_previous_stoqr_role_id IS NULL THEN
      DELETE FROM stoqr.organisation_member_roles
      WHERE user_id = OLD.owner_id
        AND company_id = NEW.id;
    ELSE
      INSERT INTO stoqr.organisation_member_roles (user_id, company_id, role_id)
      VALUES (OLD.owner_id, NEW.id, v_previous_stoqr_role_id)
      ON CONFLICT (user_id, company_id) DO UPDATE
        SET role_id = EXCLUDED.role_id;
    END IF;
  END IF;

  INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
  SELECT NEW.id, a.code, CASE WHEN a.code IN ('etl', 'stoqr') THEN 1 ELSE 0 END
  FROM public.apps a
  ON CONFLICT (org_id, app_code) DO UPDATE
    SET seat_limit = GREATEST(public.organisation_app_seats.seat_limit, EXCLUDED.seat_limit);

  SELECT id INTO v_owner_member_id
  FROM public.organisation_members
  WHERE org_id = NEW.id
    AND user_id = NEW.owner_id
  LIMIT 1;

  IF v_owner_member_id IS NOT NULL THEN
    INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
    VALUES
      (v_owner_member_id, 'etl'),
      (v_owner_member_id, 'stoqr')
    ON CONFLICT (org_member_id, app_code) DO NOTHING;

    INSERT INTO etl.organisation_member_roles (org_member_id, role_id)
    VALUES (v_owner_member_id, v_owner_etl_role_id)
    ON CONFLICT (org_member_id) DO UPDATE
      SET role_id = EXCLUDED.role_id;
  END IF;

  INSERT INTO stoqr.organisation_member_roles (user_id, company_id, role_id)
  VALUES (NEW.owner_id, NEW.id, v_owner_stoqr_role_id)
  ON CONFLICT (user_id, company_id) DO UPDATE
    SET role_id = EXCLUDED.role_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_org_owner_member_and_default_seats ON public.organisations;
CREATE TRIGGER trg_ensure_org_owner_member_and_default_seats
  AFTER INSERT OR UPDATE OF owner_id ON public.organisations
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_org_owner_member_and_default_seats();

DROP TRIGGER IF EXISTS trg_prevent_owner_member_mutation ON public.organisation_members;
CREATE TRIGGER trg_prevent_owner_member_mutation
  BEFORE UPDATE OR DELETE ON public.organisation_members
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_owner_member_mutation();

DROP TRIGGER IF EXISTS trg_prevent_owner_role_mutation_stoqr ON stoqr.roles;
CREATE TRIGGER trg_prevent_owner_role_mutation_stoqr
  BEFORE UPDATE OR DELETE ON stoqr.roles
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_owner_role_mutation();

DROP TRIGGER IF EXISTS trg_prevent_owner_role_mutation_etl ON etl.roles;
CREATE TRIGGER trg_prevent_owner_role_mutation_etl
  BEFORE UPDATE OR DELETE ON etl.roles
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_owner_role_mutation();

DROP TRIGGER IF EXISTS trg_prevent_owner_role_permission_delete_stoqr ON stoqr.role_permissions;
CREATE TRIGGER trg_prevent_owner_role_permission_delete_stoqr
  BEFORE DELETE ON stoqr.role_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_owner_role_permission_delete();

DROP TRIGGER IF EXISTS trg_prevent_owner_role_permission_delete_etl ON etl.role_permissions;
CREATE TRIGGER trg_prevent_owner_role_permission_delete_etl
  BEFORE DELETE ON etl.role_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_owner_role_permission_delete();

DROP TRIGGER IF EXISTS trg_grant_new_permission_to_owner_roles_stoqr ON stoqr.app_permissions;
CREATE TRIGGER trg_grant_new_permission_to_owner_roles_stoqr
  AFTER INSERT ON stoqr.app_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.grant_new_permission_to_owner_roles();

DROP TRIGGER IF EXISTS trg_grant_new_permission_to_owner_roles_etl ON etl.app_permissions;
CREATE TRIGGER trg_grant_new_permission_to_owner_roles_etl
  AFTER INSERT ON etl.app_permissions
  FOR EACH ROW EXECUTE PROCEDURE public.grant_new_permission_to_owner_roles();

CREATE OR REPLACE FUNCTION public.enforce_org_app_seat_limit()
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
BEGIN
  SELECT org_id INTO v_org_id
  FROM public.organisation_members
  WHERE id = NEW.org_member_id;

  SELECT role INTO v_member_role
  FROM public.organisation_members
  WHERE id = NEW.org_member_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid organisation member id: %', NEW.org_member_id;
  END IF;

  IF v_member_role = 'owner' THEN
    RETURN NEW;
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
    AND om.role <> 'owner'
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
    LEFT JOIN stoqr.organisation_member_roles cm
      ON cm.company_id = om.org_id
     AND cm.user_id = om.user_id
    LEFT JOIN stoqr.role_permissions rp
      ON rp.role_id = cm.role_id
     AND rp.permission_code = _permission_code
    WHERE om.org_id = _company_id
      AND om.user_id = auth.uid()
      AND (
        om.role = 'owner'
        OR (om.role = 'admin' AND _permission_code IN (
          'company.manage',
          'billing.manage',
          'members.view',
          'members.manage',
          'roles.manage',
          'dashboard.view',
          'products.view',
          'products.manage',
          'inventory.bulk_manage',
          'scanner.use',
          'labels.manage',
          'reports.view',
          'reports.export',
          'procurement.manage',
          'alerts.view',
          'alerts.manage',
          'activity.view',
          'transactions.view',
          'transactions.create'
        ))
        OR rp.role_id IS NOT NULL
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_etl_permission(_org_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, etl
AS $$
BEGIN
  IF public.is_app_super_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.organisation_members om
    LEFT JOIN etl.organisation_member_roles emr
      ON emr.org_member_id = om.id
    LEFT JOIN etl.role_permissions rp
      ON rp.role_id = emr.role_id
     AND rp.permission_code = _permission_code
    WHERE om.org_id = _org_id
      AND om.user_id = auth.uid()
      AND (
        om.role = 'owner'
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
  ELSIF NEW.transaction_type IN ('sale', 'loss', 'scan_out') THEN
    qty_delta := -abs(NEW.quantity_change);
  ELSIF NEW.transaction_type = 'scan_in' THEN
    qty_delta := abs(NEW.quantity_change);
  ELSE
    RAISE EXCEPTION 'Unsupported transaction_type: %', NEW.transaction_type;
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

CREATE OR REPLACE FUNCTION stoqr.log_activity_event(
  p_company_id UUID,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_actor_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
BEGIN
  INSERT INTO stoqr.activity_events (
    company_id,
    actor_user_id,
    event_type,
    entity_type,
    entity_id,
    message,
    metadata
  )
  VALUES (
    p_company_id,
    p_actor_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    p_message,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION stoqr.capture_activity_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
DECLARE
  v_company_id UUID;
  v_actor_id UUID;
  v_entity_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

  IF TG_TABLE_NAME = 'purchase_order_items' THEN
    IF TG_OP = 'DELETE' THEN
      SELECT company_id, created_by INTO v_company_id, v_actor_id
      FROM stoqr.purchase_orders
      WHERE id = OLD.po_id;
    ELSE
      SELECT company_id, created_by INTO v_company_id, v_actor_id
      FROM stoqr.purchase_orders
      WHERE id = NEW.po_id;
    END IF;
  ELSE
    IF TG_OP = 'DELETE' THEN
      v_company_id := OLD.company_id;
      v_actor_id := COALESCE(
        NULLIF(to_jsonb(OLD)->>'performed_by', '')::UUID,
        NULLIF(to_jsonb(OLD)->>'created_by', '')::UUID,
        NULLIF(to_jsonb(OLD)->>'received_by', '')::UUID,
        NULLIF(to_jsonb(OLD)->>'scanned_by', '')::UUID,
        auth.uid()
      );
    ELSE
      v_company_id := NEW.company_id;
      v_actor_id := COALESCE(
        NULLIF(to_jsonb(NEW)->>'performed_by', '')::UUID,
        NULLIF(to_jsonb(NEW)->>'created_by', '')::UUID,
        NULLIF(to_jsonb(NEW)->>'received_by', '')::UUID,
        NULLIF(to_jsonb(NEW)->>'scanned_by', '')::UUID,
        auth.uid()
      );
    END IF;
  END IF;

  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM stoqr.log_activity_event(
    v_company_id,
    lower(TG_TABLE_NAME) || '.' || lower(TG_OP),
    lower(TG_TABLE_NAME),
    v_entity_id,
    TG_TABLE_NAME || ' ' || TG_OP,
    jsonb_build_object('operation', TG_OP),
    v_actor_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_inventory_transactions ON stoqr.inventory_transactions;
CREATE TRIGGER trg_activity_inventory_transactions
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.inventory_transactions
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_purchase_orders ON stoqr.purchase_orders;
CREATE TRIGGER trg_activity_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.purchase_orders
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_purchase_order_items ON stoqr.purchase_order_items;
CREATE TRIGGER trg_activity_purchase_order_items
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.purchase_order_items
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_receiving_logs ON stoqr.receiving_logs;
CREATE TRIGGER trg_activity_receiving_logs
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.receiving_logs
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_scan_events ON stoqr.scan_events;
CREATE TRIGGER trg_activity_scan_events
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.scan_events
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_alert_events ON stoqr.alert_events;
CREATE TRIGGER trg_activity_alert_events
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.alert_events
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_inventory_bulk_operations ON stoqr.inventory_bulk_operations;
CREATE TRIGGER trg_activity_inventory_bulk_operations
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.inventory_bulk_operations
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

DROP TRIGGER IF EXISTS trg_activity_label_print_jobs ON stoqr.label_print_jobs;
CREATE TRIGGER trg_activity_label_print_jobs
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.label_print_jobs
  FOR EACH ROW EXECUTE PROCEDURE stoqr.capture_activity_event();

GRANT EXECUTE ON FUNCTION public.is_org_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner_strictly(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_etl_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_higher_org_role(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_org_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.map_stoqr_role_to_org_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_stoqr_role_for_org_member(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_next_stoqr_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pick_next_etl_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_owner_app_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_org_app_seat_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION stoqr.log_activity_event(UUID, TEXT, TEXT, UUID, TEXT, JSONB, UUID) TO authenticated;
