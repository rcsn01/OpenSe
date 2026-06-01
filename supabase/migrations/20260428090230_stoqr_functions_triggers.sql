CREATE TRIGGER handle_organisation_page_settings_updated_at
  BEFORE UPDATE ON stoqr.organisation_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_products_updated_at
  BEFORE UPDATE ON stoqr.products
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE FUNCTION stoqr.normalize_product_identity_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  NEW.sku := NULLIF(btrim(COALESCE(NEW.sku, '')), '');
  NEW.primary_barcode := NULLIF(btrim(COALESCE(NEW.primary_barcode, '')), '');

  IF NEW.primary_barcode IS NULL THEN
    NEW.primary_barcode := NEW.id::text;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION stoqr.sync_product_barcode_identities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
BEGIN
  UPDATE stoqr.product_barcodes
  SET is_primary = false
  WHERE company_id = NEW.company_id
    AND product_id = NEW.id;

  INSERT INTO stoqr.product_barcodes (
    company_id,
    product_id,
    barcode,
    barcode_type,
    is_primary
  )
  VALUES (
    NEW.company_id,
    NEW.id,
    NEW.id::text,
    'barcode',
    NEW.primary_barcode = NEW.id::text
  )
  ON CONFLICT (company_id, barcode) DO UPDATE
  SET
    product_id = EXCLUDED.product_id,
    barcode_type = EXCLUDED.barcode_type,
    is_primary = EXCLUDED.is_primary;

  IF NEW.primary_barcode <> NEW.id::text THEN
    INSERT INTO stoqr.product_barcodes (
      company_id,
      product_id,
      barcode,
      barcode_type,
      is_primary
    )
    VALUES (
      NEW.company_id,
      NEW.id,
      NEW.primary_barcode,
      'barcode',
      true
    )
    ON CONFLICT (company_id, barcode) DO UPDATE
    SET
      product_id = EXCLUDED.product_id,
      barcode_type = EXCLUDED.barcode_type,
      is_primary = EXCLUDED.is_primary;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER handle_products_identity_fields
  BEFORE INSERT OR UPDATE ON stoqr.products
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.normalize_product_identity_fields();

CREATE TRIGGER handle_products_barcode_identity_sync
  AFTER INSERT OR UPDATE OF primary_barcode ON stoqr.products
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.sync_product_barcode_identities();

CREATE TRIGGER handle_alert_rules_updated_at
  BEFORE UPDATE ON stoqr.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_alert_connectors_updated_at
  BEFORE UPDATE ON stoqr.alert_connectors
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_alert_connector_targets_updated_at
  BEFORE UPDATE ON stoqr.alert_connector_targets
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER handle_label_templates_updated_at
  BEFORE UPDATE ON stoqr.label_templates
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE INDEX idx_products_custom_fields ON stoqr.products USING gin (custom_fields);
CREATE UNIQUE INDEX idx_products_company_sku_unique
  ON stoqr.products (company_id, sku)
  WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX idx_products_company_primary_barcode_unique
  ON stoqr.products (company_id, primary_barcode)
  WHERE primary_barcode IS NOT NULL;
CREATE INDEX idx_folders_company ON stoqr.folders (company_id);
CREATE INDEX idx_folders_parent ON stoqr.folders (parent_id);
CREATE INDEX idx_product_tags_product ON stoqr.product_tags (product_id);
CREATE INDEX idx_product_tags_tag ON stoqr.product_tags (tag_id);
CREATE INDEX idx_product_folder_stocks_company_folder ON stoqr.product_folder_stocks (company_id, folder_id);
CREATE INDEX idx_product_folder_stocks_company_product ON stoqr.product_folder_stocks (company_id, product_id);
CREATE INDEX idx_product_folder_stocks_company_levels ON stoqr.product_folder_stocks (company_id, quantity_on_hand, min_stock_level, reorder_point);
CREATE INDEX idx_organisation_page_settings_updated_at ON stoqr.organisation_page_settings (updated_at DESC);
CREATE INDEX idx_report_schedules_company ON stoqr.report_schedules (company_id);
CREATE INDEX idx_products_company_stock_levels ON stoqr.products (company_id, quantity_on_hand, min_stock_level, reorder_point);
CREATE INDEX idx_product_barcodes_product ON stoqr.product_barcodes (product_id);
CREATE INDEX idx_product_barcodes_company_type ON stoqr.product_barcodes (company_id, barcode_type);
CREATE INDEX idx_inventory_bulk_operations_company_created ON stoqr.inventory_bulk_operations (company_id, created_at DESC);
CREATE INDEX idx_scan_events_company_created ON stoqr.scan_events (company_id, created_at DESC);
CREATE INDEX idx_scan_events_product_created ON stoqr.scan_events (product_id, created_at DESC);
CREATE INDEX idx_report_exports_company_created ON stoqr.report_exports (company_id, created_at DESC);
CREATE INDEX idx_purchase_orders_company_status_created_at ON stoqr.purchase_orders (company_id, status, created_at DESC);
CREATE INDEX idx_alert_rules_company_type ON stoqr.alert_rules (company_id, alert_type);
CREATE INDEX idx_alert_events_company_status ON stoqr.alert_events (company_id, status, triggered_at DESC);
CREATE INDEX idx_alert_events_product ON stoqr.alert_events (product_id, triggered_at DESC);
CREATE INDEX idx_alert_events_product_folder ON stoqr.alert_events (product_id, folder_id, triggered_at DESC);
CREATE INDEX idx_alert_delivery_logs_event ON stoqr.alert_delivery_logs (alert_event_id);
CREATE INDEX idx_alert_connectors_company_provider ON stoqr.alert_connectors (company_id, provider);
CREATE INDEX idx_alert_connector_targets_connector ON stoqr.alert_connector_targets (connector_id);
CREATE INDEX idx_alert_rule_connector_targets_target ON stoqr.alert_rule_connector_targets (target_id);
CREATE INDEX idx_activity_events_company_created ON stoqr.activity_events (company_id, created_at DESC);
CREATE INDEX idx_label_templates_company ON stoqr.label_templates (company_id);
CREATE UNIQUE INDEX idx_label_templates_global_name_unique
  ON stoqr.label_templates (name)
  WHERE company_id IS NULL;
CREATE INDEX idx_label_print_jobs_company_status ON stoqr.label_print_jobs (company_id, status, created_at DESC);
CREATE INDEX idx_inventory_transactions_company_created_at
  ON stoqr.inventory_transactions (company_id, created_at DESC);
CREATE INDEX idx_inventory_transactions_company_product_created_at
  ON stoqr.inventory_transactions (company_id, product_id, created_at DESC);
CREATE INDEX idx_inventory_transactions_company_folder_created_at
  ON stoqr.inventory_transactions (company_id, folder_id, created_at DESC);
CREATE INDEX idx_inventory_transactions_company_type_created_at
  ON stoqr.inventory_transactions (company_id, transaction_type, created_at DESC);
CREATE INDEX idx_products_company_deleted_at
  ON stoqr.products (company_id, deleted_at);

ALTER TABLE stoqr.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.organisation_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.organisation_page_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.product_folder_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.inventory_bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.receiving_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_connector_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_rule_connector_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.alert_dispatch_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.label_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.label_print_jobs ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.map_stoqr_role_to_org_role(_role_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  IF _role_id IS NULL THEN
    RETURN 'member';
  END IF;

  SELECT r.name
  INTO v_role_name
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
      AND rp.permission_code IN (
        'organisation.company.manage',
        'organisation.members.manage',
        'organisation.roles.manage',
        'organisation.billing.manage',
        'company.manage',
        'members.manage',
        'roles.manage',
        'billing.manage'
      )
  ) THEN
    RETURN 'admin';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM stoqr.role_permissions rp
    WHERE rp.role_id = _role_id
      AND rp.permission_code IN ('inventory.create', 'inventory.edit', 'inventory.adjust', 'products.manage', 'transactions.create')
  ) THEN
    RETURN 'editor';
  END IF;

  RETURN 'member';
END;
$$;

CREATE FUNCTION public.pick_stoqr_role_for_org_member(_org_id UUID, _org_role TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
DECLARE
  v_role_id UUID;
BEGIN
  IF _org_role IN ('owner', 'admin') THEN
    SELECT r.id
    INTO v_role_id
    FROM stoqr.roles r
    WHERE r.company_id = _org_id
      AND lower(r.name) = 'owner'
    ORDER BY r.created_at
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
    AND lower(r.name) = 'guest'
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

CREATE FUNCTION public.pick_next_stoqr_role(p_company_id UUID, p_excluded_role_id UUID DEFAULT NULL)
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
  ORDER BY CASE WHEN lower(r.name) = 'guest' THEN 0 ELSE 1 END, r.role_rank DESC, r.created_at
  LIMIT 1;
$$;

CREATE FUNCTION public.ensure_stoqr_guest_role(p_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_guest_role_id UUID;
  v_conflicting_rank_role_id UUID;
BEGIN
  SELECT r.id
  INTO v_guest_role_id
  FROM stoqr.roles r
  WHERE r.company_id = p_org_id
    AND lower(r.name) = 'guest'
  ORDER BY r.created_at
  LIMIT 1;

  SELECT r.id
  INTO v_conflicting_rank_role_id
  FROM stoqr.roles r
  WHERE r.company_id = p_org_id
    AND lower(r.name) <> 'guest'
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

  IF v_guest_role_id IS NULL THEN
    INSERT INTO stoqr.roles (company_id, name, description, role_rank)
    VALUES (p_org_id, 'Guest', 'System-managed guest role', 0)
    RETURNING id INTO v_guest_role_id;
  ELSE
    PERFORM set_config('app.stoqr_repair_system_role', 'on', true);

    UPDATE stoqr.roles
    SET name = 'Guest',
        description = 'System-managed guest role',
        role_rank = 0
    WHERE id = v_guest_role_id;
  END IF;

  PERFORM set_config('app.stoqr_repair_guest_permissions', 'on', true);

  DELETE FROM stoqr.role_permissions
  WHERE role_id = v_guest_role_id
    AND permission_code NOT IN ('dashboard.view', 'inventory.view');

  INSERT INTO stoqr.role_permissions (role_id, permission_code)
  VALUES
    (v_guest_role_id, 'dashboard.view'),
    (v_guest_role_id, 'inventory.view')
  ON CONFLICT (role_id, permission_code) DO NOTHING;

  RETURN v_guest_role_id;
END;
$$;

CREATE FUNCTION public.ensure_owner_app_roles(p_org_id UUID)
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

  PERFORM public.ensure_stoqr_guest_role(p_org_id);

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

CREATE FUNCTION app_private.prevent_owner_role_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_SCHEMA = 'stoqr' THEN
    IF TG_OP = 'INSERT' THEN
      IF lower(NEW.name) NOT IN ('owner', 'guest') AND NEW.role_rank <= 0 THEN
        RAISE EXCEPTION 'Custom StoQR roles must use a positive role rank';
      END IF;

      RETURN NEW;
    END IF;

    IF lower(OLD.name) IN ('owner', 'guest')
      AND current_setting('app.stoqr_repair_system_role', true) IS DISTINCT FROM 'on'
    THEN
      RAISE EXCEPTION 'The % role is system-managed and cannot be modified or deleted', OLD.name;
    END IF;

    IF TG_OP = 'UPDATE' AND lower(OLD.name) NOT IN ('owner', 'guest') AND lower(NEW.name) IN ('owner', 'guest') THEN
      RAISE EXCEPTION 'Owner and Guest are reserved system role names';
    END IF;

    IF TG_OP = 'UPDATE' AND lower(NEW.name) NOT IN ('owner', 'guest') AND NEW.role_rank <= 0 THEN
      RAISE EXCEPTION 'Custom StoQR roles must use a positive role rank';
    END IF;
  ELSIF lower(OLD.name) = 'owner' THEN
    RAISE EXCEPTION 'The Owner role is system-managed and cannot be modified or deleted';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE FUNCTION public.prevent_stoqr_guest_permission_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT lower(r.name)
  INTO v_role_name
  FROM stoqr.roles r
  WHERE r.id = COALESCE(NEW.role_id, OLD.role_id);

  IF v_role_name <> 'guest' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.permission_code IN ('dashboard.view', 'inventory.view') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'The Guest role can only have dashboard.view and inventory.view permissions';
  END IF;

  IF current_setting('app.stoqr_repair_guest_permissions', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'The Guest role permissions are system-managed';
END;
$$;

CREATE FUNCTION app_private.prevent_owner_role_permission_delete()
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

CREATE FUNCTION public.assign_stoqr_guest_role_for_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_guest_role_id UUID;
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

  SELECT public.ensure_stoqr_guest_role(v_org_id)
  INTO v_guest_role_id;

  INSERT INTO stoqr.organisation_member_roles (user_id, company_id, role_id)
  VALUES (v_user_id, v_org_id, v_guest_role_id)
  ON CONFLICT (user_id, company_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.grant_new_permission_to_owner_roles()
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

CREATE FUNCTION public.ensure_org_owner_member_and_default_seats()
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
  v_free_seat_limit INTEGER;
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

    SELECT id
    INTO v_previous_owner_member_id
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

  SELECT settings.free_seat_limit
  INTO v_free_seat_limit
  FROM public.platform_instance_settings settings
  WHERE settings.id = true;

  INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
  SELECT NEW.id, a.code, v_free_seat_limit
  FROM public.apps a
  ON CONFLICT (org_id, app_code) DO NOTHING;

  INSERT INTO stoqr.organisation_page_settings (
    company_id,
    reports_enabled,
    procurement_enabled,
    alerts_enabled
  )
  VALUES (NEW.id, true, true, true)
  ON CONFLICT (company_id) DO NOTHING;

  SELECT id
  INTO v_owner_member_id
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

CREATE FUNCTION app_private.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  RETURN EXISTS (
    WITH current_membership AS (
      SELECT om.org_id, om.user_id, om.role AS org_role, cm.role_id
      FROM public.organisation_members om
      LEFT JOIN stoqr.organisation_member_roles cm
        ON cm.company_id = om.org_id
       AND cm.user_id = om.user_id
      WHERE om.org_id = _company_id
        AND om.user_id = auth.uid()
    ),
    assigned_permissions AS (
      SELECT ap.code AS permission_code
      FROM current_membership cm
      JOIN stoqr.app_permissions ap ON TRUE
      WHERE cm.org_role = 'owner'
      UNION
      SELECT rp.permission_code
      FROM current_membership cm
      JOIN stoqr.role_permissions rp ON rp.role_id = cm.role_id
      WHERE cm.org_role <> 'owner'
    ),
    permission_edges(source_code, implied_code) AS (
      VALUES
        ('inventory.use', 'inventory.view'),
        ('inventory.create', 'inventory.view'),
        ('inventory.create', 'inventory.use'),
        ('inventory.edit', 'inventory.view'),
        ('inventory.edit', 'inventory.use'),
        ('inventory.adjust', 'inventory.view'),
        ('inventory.adjust', 'inventory.use'),
        ('inventory.delete', 'inventory.view'),
        ('inventory.delete', 'inventory.use'),
        ('inventory.import_export', 'inventory.view'),
        ('inventory.import_export', 'inventory.use'),
        ('scanner.use', 'scanner.view'),
        ('labels.use', 'labels.view'),
        ('labels.manage', 'labels.view'),
        ('labels.manage', 'labels.use'),
        ('reports.export', 'reports.view'),
        ('procurement.create', 'procurement.view'),
        ('procurement.receive', 'procurement.view'),
        ('procurement.manage', 'procurement.view'),
        ('procurement.manage', 'procurement.create'),
        ('procurement.manage', 'procurement.receive'),
        ('alerts.use', 'alerts.view'),
        ('alerts.manage', 'alerts.view'),
        ('alerts.manage', 'alerts.use'),
        ('organisation.members.manage', 'organisation.view'),
        ('organisation.roles.manage', 'organisation.view'),
        ('organisation.pages.manage', 'organisation.view'),
        ('organisation.activity.view', 'organisation.view'),
        ('organisation.company.manage', 'organisation.view'),
        ('organisation.billing.manage', 'organisation.view'),
        ('products.view', 'inventory.view'),
        ('products.view', 'inventory.use'),
        ('products.manage', 'inventory.create'),
        ('products.manage', 'inventory.edit'),
        ('products.manage', 'inventory.adjust'),
        ('products.manage', 'inventory.delete'),
        ('products.manage', 'inventory.view'),
        ('products.manage', 'inventory.use'),
        ('inventory.bulk_manage', 'inventory.import_export'),
        ('inventory.bulk_manage', 'inventory.view'),
        ('inventory.bulk_manage', 'inventory.use'),
        ('transactions.view', 'inventory.use'),
        ('transactions.view', 'inventory.view'),
        ('transactions.create', 'inventory.adjust'),
        ('transactions.create', 'scanner.use'),
        ('transactions.create', 'inventory.use'),
        ('transactions.create', 'inventory.view'),
        ('transactions.create', 'scanner.view'),
        ('company.manage', 'organisation.company.manage'),
        ('billing.manage', 'organisation.billing.manage'),
        ('members.view', 'organisation.view'),
        ('members.manage', 'organisation.members.manage'),
        ('roles.manage', 'organisation.roles.manage'),
        ('activity.view', 'organisation.activity.view'),
        ('inventory.view', 'products.view'),
        ('inventory.edit', 'products.manage'),
        ('inventory.create', 'products.manage'),
        ('inventory.adjust', 'transactions.create'),
        ('inventory.use', 'transactions.view'),
        ('inventory.import_export', 'inventory.bulk_manage'),
        ('scanner.use', 'transactions.create'),
        ('organisation.company.manage', 'company.manage'),
        ('organisation.billing.manage', 'billing.manage'),
        ('organisation.view', 'members.view'),
        ('organisation.members.manage', 'members.manage'),
        ('organisation.roles.manage', 'roles.manage'),
        ('organisation.activity.view', 'activity.view')
    ),
    expanded_permissions AS (
      SELECT permission_code AS code
      FROM assigned_permissions
      UNION
      SELECT pe.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe ON pe.source_code = ap.permission_code
      UNION
      SELECT pe2.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
      JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
    )
    SELECT 1
    FROM expanded_permissions ep
    WHERE ep.code = _permission_code
  );
END;
$$;


CREATE FUNCTION stoqr.update_inventory_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
DECLARE
  current_folder_qty INTEGER;
  qty_delta INTEGER;
  v_total_qty INTEGER;
BEGIN
  IF NEW.folder_id IS NULL THEN
    RAISE EXCEPTION 'folder_id is required for inventory transactions';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.products p
    WHERE p.id = NEW.product_id
      AND p.company_id = NEW.company_id
      AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Product not found for company';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM stoqr.folders f
    WHERE f.id = NEW.folder_id
      AND f.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Folder not found for company';
  END IF;

  IF NEW.transaction_type IN ('purchase', 'return', 'adjustment', 'transfer_in') THEN
    qty_delta := NEW.quantity_change;
  ELSIF NEW.transaction_type IN ('sale', 'loss', 'scan_out', 'transfer_out') THEN
    qty_delta := -ABS(NEW.quantity_change);
  ELSIF NEW.transaction_type = 'scan_in' THEN
    qty_delta := ABS(NEW.quantity_change);
  ELSE
    RAISE EXCEPTION 'Unsupported transaction_type: %', NEW.transaction_type;
  END IF;

  INSERT INTO stoqr.product_folder_stocks (
    company_id,
    product_id,
    folder_id,
    quantity_on_hand,
    min_stock_level,
    reorder_point,
    max_stock_level,
    updated_at
  )
  SELECT
    NEW.company_id,
    NEW.product_id,
    NEW.folder_id,
    0,
    COALESCE(p.min_stock_level, 0),
    COALESCE(p.reorder_point, 0),
    p.max_stock_level,
    timezone('utc'::text, now())
  FROM stoqr.products p
  WHERE p.id = NEW.product_id
  ON CONFLICT (company_id, product_id, folder_id) DO NOTHING;

  SELECT quantity_on_hand
  INTO current_folder_qty
  FROM stoqr.product_folder_stocks
  WHERE company_id = NEW.company_id
    AND product_id = NEW.product_id
    AND folder_id = NEW.folder_id
  FOR UPDATE;

  IF current_folder_qty + qty_delta < 0 THEN
    RAISE EXCEPTION 'Insufficient stock in folder';
  END IF;

  UPDATE stoqr.product_folder_stocks
  SET quantity_on_hand = current_folder_qty + qty_delta,
      updated_at = timezone('utc'::text, now())
  WHERE company_id = NEW.company_id
    AND product_id = NEW.product_id
    AND folder_id = NEW.folder_id;

  SELECT COALESCE(SUM(quantity_on_hand), 0)::INTEGER
  INTO v_total_qty
  FROM stoqr.product_folder_stocks
  WHERE company_id = NEW.company_id
    AND product_id = NEW.product_id;

  UPDATE stoqr.products
  SET quantity_on_hand = v_total_qty,
      folder_id = COALESCE(folder_id, NEW.folder_id),
      updated_at = timezone('utc'::text, now())
  WHERE id = NEW.product_id
    AND company_id = NEW.company_id;

  NEW.stock_after := current_folder_qty + qty_delta;
  NEW.quantity_change := qty_delta;

  RETURN NEW;
END;
$$;

CREATE FUNCTION stoqr.folder_path_name(target_folder_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = stoqr
AS $$
  WITH RECURSIVE folder_path AS (
    SELECT id, parent_id, name, 1 AS depth
    FROM stoqr.folders
    WHERE id = target_folder_id
    UNION ALL
    SELECT parent.id, parent.parent_id, parent.name, folder_path.depth + 1
    FROM stoqr.folders parent
    JOIN folder_path ON folder_path.parent_id = parent.id
  )
  SELECT string_agg(name, ' / ' ORDER BY depth DESC)
  FROM folder_path;
$$;

CREATE FUNCTION stoqr.sync_product_stock_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
DECLARE
  v_product_id UUID;
  v_company_id UUID;
BEGIN
  v_product_id := COALESCE(NEW.product_id, OLD.product_id);
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  UPDATE stoqr.products p
  SET quantity_on_hand = COALESCE((
        SELECT SUM(pfs.quantity_on_hand)::INTEGER
        FROM stoqr.product_folder_stocks pfs
        WHERE pfs.company_id = v_company_id
          AND pfs.product_id = v_product_id
      ), 0),
      updated_at = timezone('utc'::text, now())
  WHERE p.id = v_product_id
    AND p.company_id = v_company_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION stoqr.log_activity_event(
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
  IF auth.role() <> 'service_role'
     AND NOT app_private.is_org_member(p_company_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

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

CREATE FUNCTION stoqr.capture_activity_event()
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
      SELECT company_id, created_by
      INTO v_company_id, v_actor_id
      FROM stoqr.purchase_orders
      WHERE id = OLD.po_id;
    ELSE
      SELECT company_id, created_by
      INTO v_company_id, v_actor_id
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

CREATE TRIGGER trg_ensure_org_owner_member_and_default_seats
  AFTER INSERT OR UPDATE OF owner_id ON public.organisations
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_org_owner_member_and_default_seats();

CREATE TRIGGER trg_prevent_owner_role_mutation_stoqr
  BEFORE INSERT OR UPDATE OR DELETE ON stoqr.roles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prevent_owner_role_mutation();

CREATE TRIGGER trg_prevent_owner_role_mutation_etl
  BEFORE UPDATE OR DELETE ON etl.roles
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prevent_owner_role_mutation();

CREATE TRIGGER trg_prevent_owner_role_permission_delete_stoqr
  BEFORE DELETE ON stoqr.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prevent_owner_role_permission_delete();

CREATE TRIGGER trg_prevent_stoqr_guest_permission_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON stoqr.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_stoqr_guest_permission_mutation();

CREATE TRIGGER trg_prevent_owner_role_permission_delete_etl
  BEFORE DELETE ON etl.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION app_private.prevent_owner_role_permission_delete();

CREATE TRIGGER trg_grant_new_permission_to_owner_roles_stoqr
  AFTER INSERT ON stoqr.app_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_new_permission_to_owner_roles();

CREATE TRIGGER trg_grant_new_permission_to_owner_roles_etl
  AFTER INSERT ON etl.app_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_new_permission_to_owner_roles();

CREATE TRIGGER trg_assign_stoqr_guest_role_for_seat
  AFTER INSERT ON public.organisation_member_app_seats
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_stoqr_guest_role_for_seat();

CREATE TRIGGER on_inventory_transaction
  BEFORE INSERT ON stoqr.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.update_inventory_count();

CREATE TRIGGER trg_sync_product_stock_total
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.product_folder_stocks
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.sync_product_stock_total();

CREATE TRIGGER trg_activity_inventory_transactions
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_purchase_orders
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_purchase_order_items
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_receiving_logs
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.receiving_logs
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_scan_events
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.scan_events
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_alert_events
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.alert_events
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_inventory_bulk_operations
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.inventory_bulk_operations
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();

CREATE TRIGGER trg_activity_label_print_jobs
  AFTER INSERT OR UPDATE OR DELETE ON stoqr.label_print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.capture_activity_event();
CREATE FUNCTION public.create_stoqr_report_export(
  target_company_id UUID,
  p_report_type TEXT,
  p_export_format TEXT,
  p_date_range_start DATE DEFAULT NULL,
  p_date_range_end DATE DEFAULT NULL,
  p_filters JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_export_id UUID;
BEGIN
  IF NOT app_private.has_permission(target_company_id, 'reports.export') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO stoqr.report_exports (
    company_id,
    report_type,
    export_format,
    date_range_start,
    date_range_end,
    filters,
    status,
    requested_by
  )
  VALUES (
    target_company_id,
    p_report_type,
    lower(p_export_format),
    p_date_range_start,
    p_date_range_end,
    COALESCE(p_filters, '{}'::jsonb),
    'pending',
    auth.uid()
  )
  RETURNING id INTO v_export_id;

  RETURN v_export_id;
END;
$$;


CREATE FUNCTION stoqr.evaluate_low_stock_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
DECLARE
  v_rule stoqr.alert_rules%ROWTYPE;
  v_event_id UUID;
  v_old_low BOOLEAN := false;
  v_new_low BOOLEAN := false;
  v_product stoqr.products%ROWTYPE;
  v_folder_name TEXT;
BEGIN
  SELECT *
  INTO v_product
  FROM stoqr.products
  WHERE id = NEW.product_id
    AND company_id = NEW.company_id;

  IF v_product.id IS NULL OR v_product.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_folder_name := COALESCE(stoqr.folder_path_name(NEW.folder_id), 'Unassigned');

  v_new_low := COALESCE(NEW.reorder_point, 0) > 0
    AND COALESCE(NEW.quantity_on_hand, 0) <= COALESCE(NEW.reorder_point, 0);

  IF TG_OP = 'UPDATE' THEN
    v_old_low := COALESCE(OLD.reorder_point, 0) > 0
      AND COALESCE(OLD.quantity_on_hand, 0) <= COALESCE(OLD.reorder_point, 0);
  END IF;

  IF NOT v_new_low OR v_old_low THEN
    RETURN NEW;
  END IF;

  FOR v_rule IN
    SELECT *
    FROM stoqr.alert_rules
    WHERE company_id = NEW.company_id
      AND alert_type = 'low_stock'
      AND enabled = true
      AND delivery_channels && ARRAY['in_app', 'email', 'telegram', 'mattermost']::text[]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM stoqr.alert_events existing
      WHERE existing.company_id = NEW.company_id
        AND existing.rule_id = v_rule.id
        AND existing.product_id = NEW.product_id
        AND existing.folder_id = NEW.folder_id
        AND existing.status = 'open'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO stoqr.alert_events (
      company_id,
      rule_id,
      product_id,
      folder_id,
      alert_type,
      severity,
      status,
      message,
      metadata
    )
    VALUES (
      NEW.company_id,
      v_rule.id,
      NEW.product_id,
      NEW.folder_id,
      'low_stock',
      CASE WHEN COALESCE(NEW.quantity_on_hand, 0) <= 0 THEN 'critical' ELSE 'high' END,
      'open',
      format(
        '%s in %s is at %s units, at or below its Low Stock Alert level of %s.',
        v_product.name,
        v_folder_name,
        COALESCE(NEW.quantity_on_hand, 0),
        COALESCE(NEW.reorder_point, 0)
      ),
      jsonb_build_object(
        'folder_id', NEW.folder_id,
        'folder_name', v_folder_name,
        'quantity_on_hand', COALESCE(NEW.quantity_on_hand, 0),
        'reorder_point', COALESCE(NEW.reorder_point, 0),
        'recipient_roles', COALESCE(v_rule.recipients, ARRAY[]::text[])
      )
    )
    RETURNING id INTO v_event_id;

    INSERT INTO stoqr.alert_delivery_logs (
      company_id,
      alert_event_id,
      channel,
      recipient,
      status,
      sent_at
    )
    SELECT DISTINCT
      NEW.company_id,
      v_event_id,
      'in_app',
      omr.user_id::text,
      'sent',
      timezone('utc'::text, now())
    FROM unnest(COALESCE(v_rule.recipients, ARRAY[]::text[])) AS recipient_token(token)
    JOIN stoqr.organisation_member_roles omr
      ON omr.company_id = NEW.company_id
     AND omr.role_id = replace(recipient_token.token, 'role:', '')::uuid
    WHERE v_rule.delivery_channels @> ARRAY['in_app']::text[]
      AND recipient_token.token ~* '^role:[0-9a-f-]{36}$';

    INSERT INTO stoqr.alert_delivery_logs (
      company_id,
      alert_event_id,
      channel,
      recipient,
      status
    )
    SELECT DISTINCT
      NEW.company_id,
      v_event_id,
      'email',
      NULLIF(p.email, ''),
      'pending'
    FROM unnest(COALESCE(v_rule.recipients, ARRAY[]::text[])) AS recipient_token(token)
    JOIN stoqr.organisation_member_roles omr
      ON omr.company_id = NEW.company_id
     AND omr.role_id = replace(recipient_token.token, 'role:', '')::uuid
    JOIN public.profiles p ON p.id = omr.user_id
    WHERE v_rule.delivery_channels @> ARRAY['email']::text[]
      AND recipient_token.token ~* '^role:[0-9a-f-]{36}$'
      AND NULLIF(p.email, '') IS NOT NULL;

    INSERT INTO stoqr.alert_delivery_logs (
      company_id,
      alert_event_id,
      channel,
      recipient,
      status
    )
    SELECT DISTINCT
      NEW.company_id,
      v_event_id,
      ac.provider,
      act.id::text,
      'pending'
    FROM stoqr.alert_rule_connector_targets arct
    JOIN stoqr.alert_connector_targets act ON act.id = arct.target_id
    JOIN stoqr.alert_connectors ac
      ON ac.id = act.connector_id
     AND ac.company_id = NEW.company_id
     AND ac.provider = ANY(v_rule.delivery_channels)
    WHERE arct.rule_id = v_rule.id
      AND ac.provider IN ('telegram', 'mattermost')
      AND ac.status = 'connected'
      AND act.enabled = true;

    PERFORM public.request_stoqr_alert_notification_dispatch(NEW.company_id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluate_low_stock_alerts
  AFTER INSERT OR UPDATE OF quantity_on_hand, reorder_point ON stoqr.product_folder_stocks
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.evaluate_low_stock_alerts();

CREATE FUNCTION public.claim_stoqr_pending_email_alerts(target_company_id UUID, batch_size INTEGER DEFAULT 25)
RETURNS TABLE (
  delivery_id UUID,
  company_id UUID,
  alert_event_id UUID,
  recipient_email TEXT,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  triggered_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  folder_name TEXT,
  organisation_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT adl.id
    FROM stoqr.alert_delivery_logs adl
    JOIN stoqr.alert_events ae ON ae.id = adl.alert_event_id
    WHERE adl.company_id = target_company_id
      AND adl.channel = 'email'
      AND adl.status = 'pending'
      AND NULLIF(adl.recipient, '') IS NOT NULL
    ORDER BY ae.triggered_at ASC, adl.id ASC
    LIMIT LEAST(GREATEST(COALESCE(batch_size, 25), 1), 100)
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE stoqr.alert_delivery_logs adl
    SET status = 'sending',
        error_message = NULL
    FROM claimed
    WHERE adl.id = claimed.id
    RETURNING adl.id, adl.company_id, adl.alert_event_id, adl.recipient
  )
  SELECT
    updated.id,
    updated.company_id,
    updated.alert_event_id,
    updated.recipient,
    ae.alert_type,
    ae.severity,
    ae.message,
    ae.triggered_at,
    p.name,
    p.sku,
    stoqr.folder_path_name(ae.folder_id),
    o.name
  FROM updated
  JOIN stoqr.alert_events ae ON ae.id = updated.alert_event_id
  JOIN public.organisations o ON o.id = updated.company_id
  LEFT JOIN stoqr.products p ON p.id = ae.product_id
  ORDER BY ae.triggered_at ASC, updated.id ASC;
END;
$$;

CREATE FUNCTION public.mark_stoqr_alert_email_delivery(
  target_delivery_id UUID,
  next_status TEXT,
  provider_message_id TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF next_status NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION 'Invalid email delivery status';
  END IF;

  UPDATE stoqr.alert_delivery_logs
  SET status = next_status,
      provider_message_id = mark_stoqr_alert_email_delivery.provider_message_id,
      error_message = mark_stoqr_alert_email_delivery.error_message,
      sent_at = CASE WHEN next_status = 'sent' THEN timezone('utc'::text, now()) ELSE sent_at END
  WHERE id = target_delivery_id
    AND channel = 'email';
END;
$$;

CREATE FUNCTION public.request_stoqr_alert_notification_dispatch(target_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_function_url TEXT;
  v_dispatch_token TEXT;
BEGIN
  SELECT function_url, dispatch_token
  INTO v_function_url, v_dispatch_token
  FROM stoqr.alert_dispatch_config
  WHERE singleton = true;

  IF v_function_url IS NULL OR v_dispatch_token IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_function_url,
    body := jsonb_build_object(
      'companyId', target_company_id,
      'batchSize', 100
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-dispatch-token', v_dispatch_token
    ),
    timeout_milliseconds := 30000
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to enqueue StoQR alert notification dispatch for company %: %', target_company_id, SQLERRM;
END;
$$;

CREATE FUNCTION public.claim_stoqr_pending_alert_notifications(target_company_id UUID, batch_size INTEGER DEFAULT 25)
RETURNS TABLE (
  delivery_id UUID,
  company_id UUID,
  alert_event_id UUID,
  channel TEXT,
  recipient TEXT,
  connector_id UUID,
  connector_provider TEXT,
  target_id UUID,
  target_name TEXT,
  target_type TEXT,
  provider_target_id TEXT,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  triggered_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  folder_name TEXT,
  organisation_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT adl.id
    FROM stoqr.alert_delivery_logs adl
    JOIN stoqr.alert_events ae ON ae.id = adl.alert_event_id
    WHERE adl.company_id = target_company_id
      AND adl.channel IN ('email', 'telegram', 'mattermost')
      AND adl.status = 'pending'
      AND NULLIF(adl.recipient, '') IS NOT NULL
    ORDER BY ae.triggered_at ASC, adl.id ASC
    LIMIT LEAST(GREATEST(COALESCE(batch_size, 25), 1), 100)
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE stoqr.alert_delivery_logs adl
    SET status = 'sending',
        error_message = NULL
    FROM claimed
    WHERE adl.id = claimed.id
    RETURNING adl.id, adl.company_id, adl.alert_event_id, adl.channel, adl.recipient
  )
  SELECT
    updated.id,
    updated.company_id,
    updated.alert_event_id,
    updated.channel,
    updated.recipient,
    ac.id,
    ac.provider,
    act.id,
    act.target_name,
    act.target_type,
    act.provider_target_id,
    ae.alert_type,
    ae.severity,
    ae.message,
    ae.triggered_at,
    p.name,
    p.sku,
    stoqr.folder_path_name(ae.folder_id),
    o.name
  FROM updated
  JOIN stoqr.alert_events ae ON ae.id = updated.alert_event_id
  JOIN public.organisations o ON o.id = updated.company_id
  LEFT JOIN stoqr.products p ON p.id = ae.product_id
  LEFT JOIN stoqr.alert_connector_targets act
    ON act.id = CASE
      WHEN updated.channel IN ('telegram', 'mattermost')
       AND updated.recipient ~* '^[0-9a-f-]{36}$'
      THEN updated.recipient::uuid
      ELSE NULL::uuid
    END
  LEFT JOIN stoqr.alert_connectors ac ON ac.id = act.connector_id
  ORDER BY ae.triggered_at ASC, updated.id ASC;
END;
$$;

CREATE FUNCTION public.mark_stoqr_alert_notification_delivery(
  target_delivery_id UUID,
  next_status TEXT,
  provider_message_id TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF next_status NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION 'Invalid alert delivery status';
  END IF;

  UPDATE stoqr.alert_delivery_logs
  SET status = next_status,
      provider_message_id = mark_stoqr_alert_notification_delivery.provider_message_id,
      error_message = mark_stoqr_alert_notification_delivery.error_message,
      sent_at = CASE WHEN next_status = 'sent' THEN timezone('utc'::text, now()) ELSE sent_at END
  WHERE id = target_delivery_id
    AND channel IN ('email', 'telegram', 'mattermost');
END;
$$;


-- Rename the StoQR system Guest role to Default and make its permissions manager-editable.

CREATE OR REPLACE FUNCTION app_private.prevent_owner_role_mutation()
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

CREATE OR REPLACE FUNCTION app_private.prevent_owner_role_mutation()
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
    app_private.has_permission(company_id, 'organisation.roles.manage')
    AND lower(name) NOT IN ('owner', 'default', 'guest')
  )
  WITH CHECK (
    app_private.has_permission(company_id, 'organisation.roles.manage')
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
        AND app_private.has_permission(r.company_id, 'organisation.roles.manage')
        AND lower(r.name) <> 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND app_private.has_permission(r.company_id, 'organisation.roles.manage')
        AND lower(r.name) <> 'owner'
    )
  );

REVOKE ALL ON FUNCTION public.ensure_stoqr_default_role(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_stoqr_guest_role(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_stoqr_default_role_for_seat() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.has_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.prevent_owner_role_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.prevent_owner_role_permission_delete() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_stoqr_default_role(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_stoqr_guest_role(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION app_private.has_permission(UUID, TEXT) TO authenticated, service_role;
