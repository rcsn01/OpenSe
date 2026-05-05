-- StoQR application baseline.
--
-- Reference rows for app permissions and system label templates are seeded from
-- supabase/seeds/40_stoqr_reference_membership.sql.

CREATE TABLE stoqr.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE stoqr.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (company_id, name)
);

CREATE UNIQUE INDEX stoqr_roles_company_id_name_lower_uidx
  ON stoqr.roles (company_id, lower(name));

CREATE UNIQUE INDEX stoqr_roles_company_id_role_rank_uidx
  ON stoqr.roles (company_id, role_rank);

CREATE TABLE stoqr.role_permissions (
  role_id UUID NOT NULL REFERENCES stoqr.roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES stoqr.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE stoqr.organisation_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, company_id)
);

CREATE TABLE stoqr.organisation_page_settings (
  company_id UUID PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  reports_enabled BOOLEAN NOT NULL DEFAULT true,
  procurement_enabled BOOLEAN NOT NULL DEFAULT true,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES stoqr.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#64748b',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (company_id, name)
);

CREATE TABLE stoqr.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES stoqr.folders(id) ON DELETE SET NULL,
  sku TEXT,
  primary_barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity_on_hand INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0 CHECK (min_stock_level >= 0),
  max_stock_level INTEGER CHECK (max_stock_level IS NULL OR max_stock_level >= 0),
  reorder_point INTEGER DEFAULT 10,
  cost_price DECIMAL(10, 2),
  selling_price DECIMAL(10, 2),
  image_urls TEXT[] DEFAULT '{}'::text[],
  expiry_date DATE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT products_max_images CHECK (COALESCE(array_length(image_urls, 1), 0) <= 4),
  CONSTRAINT products_max_stock_gte_min CHECK (max_stock_level IS NULL OR max_stock_level >= min_stock_level)
);

CREATE TABLE stoqr.product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES stoqr.products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL,
  barcode_type TEXT NOT NULL DEFAULT 'barcode' CHECK (barcode_type IN ('barcode', 'qr')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (company_id, barcode)
);

CREATE TABLE stoqr.product_tags (
  product_id UUID NOT NULL REFERENCES stoqr.products(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES stoqr.tags(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE stoqr.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES stoqr.products(id) ON DELETE RESTRICT,
  performed_by UUID REFERENCES public.profiles(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'scan_in', 'scan_out')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scan', 'import', 'api', 'receiving')),
  quantity_change INTEGER NOT NULL,
  stock_after INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.inventory_bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('import', 'export', 'bulk_update')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

CREATE TABLE stoqr.scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  barcode TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('lookup', 'stock_in', 'stock_out')),
  quantity INTEGER,
  entry_method TEXT NOT NULL DEFAULT 'camera' CHECK (entry_method IN ('camera', 'manual')),
  scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES stoqr.inventory_transactions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME,
  recipients TEXT[] DEFAULT '{}'::text[],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  export_format TEXT NOT NULL CHECK (export_format IN ('csv', 'pdf', 'png')),
  date_range_start DATE,
  date_range_end DATE,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

CREATE TABLE stoqr.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES stoqr.suppliers(id) ON DELETE SET NULL,
  po_number SERIAL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'closed', 'cancelled')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'denied')),
  return_status TEXT NOT NULL DEFAULT 'none' CHECK (return_status IN ('none', 'awaiting_return', 'shipped', 'resolved')),
  expected_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TABLE stoqr.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES stoqr.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost DECIMAL(10, 2) DEFAULT 0,
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
);

CREATE TABLE stoqr.receiving_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  po_id UUID REFERENCES stoqr.purchase_orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  quantity_received INTEGER NOT NULL,
  received_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT
);

CREATE TABLE stoqr.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'reorder_point', 'expiration', 'custom')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_channels TEXT[] NOT NULL DEFAULT '{in_app}'::text[],
  recipients TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TABLE stoqr.alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES stoqr.alert_rules(id) ON DELETE SET NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'reorder_point', 'expiration', 'custom')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE stoqr.alert_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  alert_event_id UUID NOT NULL REFERENCES stoqr.alert_events(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push')),
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ
);

CREATE TABLE stoqr.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE stoqr.label_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  variable_fields TEXT[] NOT NULL DEFAULT '{barcode,sku,name,price,qr}'::text[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  UNIQUE (company_id, name)
);

CREATE TABLE stoqr.label_print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES stoqr.label_templates(id) ON DELETE SET NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'png')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  output_url TEXT,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

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
CREATE INDEX idx_alert_delivery_logs_event ON stoqr.alert_delivery_logs (alert_event_id);
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
          AND rp.permission_code = 'company.manage'
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
          AND rp.permission_code = 'products.manage'
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
  ORDER BY r.role_rank DESC, r.created_at
  LIMIT 1;
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

CREATE FUNCTION public.prevent_owner_role_mutation()
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

CREATE FUNCTION public.prevent_owner_role_permission_delete()
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

  INSERT INTO public.organisation_app_seats (org_id, app_code, seat_limit)
  SELECT NEW.id, a.code, CASE WHEN a.code IN ('etl', 'stoqr') THEN 1 ELSE 0 END
  FROM public.apps a
  ON CONFLICT (org_id, app_code) DO UPDATE
    SET seat_limit = GREATEST(public.organisation_app_seats.seat_limit, EXCLUDED.seat_limit);

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

CREATE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
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
        OR (
          om.role = 'admin'
          AND _permission_code IN (
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
          )
        )
        OR rp.role_id IS NOT NULL
      )
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
  current_qty INTEGER;
  qty_delta INTEGER;
BEGIN
  IF NEW.transaction_type IN ('purchase', 'return', 'adjustment') THEN
    qty_delta := NEW.quantity_change;
  ELSIF NEW.transaction_type IN ('sale', 'loss', 'scan_out') THEN
    qty_delta := -ABS(NEW.quantity_change);
  ELSIF NEW.transaction_type = 'scan_in' THEN
    qty_delta := ABS(NEW.quantity_change);
  ELSE
    RAISE EXCEPTION 'Unsupported transaction_type: %', NEW.transaction_type;
  END IF;

  SELECT quantity_on_hand
  INTO current_qty
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
  BEFORE UPDATE OR DELETE ON stoqr.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_role_mutation();

CREATE TRIGGER trg_prevent_owner_role_mutation_etl
  BEFORE UPDATE OR DELETE ON etl.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_role_mutation();

CREATE TRIGGER trg_prevent_owner_role_permission_delete_stoqr
  BEFORE DELETE ON stoqr.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_role_permission_delete();

CREATE TRIGGER trg_prevent_owner_role_permission_delete_etl
  BEFORE DELETE ON etl.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_owner_role_permission_delete();

CREATE TRIGGER trg_grant_new_permission_to_owner_roles_stoqr
  AFTER INSERT ON stoqr.app_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_new_permission_to_owner_roles();

CREATE TRIGGER trg_grant_new_permission_to_owner_roles_etl
  AFTER INSERT ON etl.app_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_new_permission_to_owner_roles();

CREATE TRIGGER on_inventory_transaction
  BEFORE INSERT ON stoqr.inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION stoqr.update_inventory_count();

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

-- Permission catalog rows are seed-managed; direct writes are intentionally denied.
CREATE POLICY "Public read app permissions" ON stoqr.app_permissions
  FOR SELECT USING (true);

CREATE POLICY "Members can view company roles" ON stoqr.roles
  FOR SELECT USING (
    public.is_org_member(company_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "Admins can manage roles" ON stoqr.roles
  FOR ALL USING (
    public.has_permission(company_id, 'roles.manage')
    AND lower(name) <> 'owner'
  )
  WITH CHECK (
    public.has_permission(company_id, 'roles.manage')
    AND lower(name) <> 'owner'
  );

CREATE POLICY "Members can view role permissions" ON stoqr.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND (public.is_org_member(r.company_id, auth.uid()) OR public.is_app_super_admin())
    )
  );

CREATE POLICY "Admins can manage role permissions" ON stoqr.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND public.has_permission(r.company_id, 'roles.manage')
        AND lower(r.name) <> 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND public.has_permission(r.company_id, 'roles.manage')
        AND lower(r.name) <> 'owner'
    )
  );

CREATE POLICY "Users can view their own memberships" ON stoqr.organisation_member_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all members" ON stoqr.organisation_member_roles
  FOR SELECT USING (public.has_permission(company_id, 'members.view'));

CREATE POLICY "Managers can update members" ON stoqr.organisation_member_roles
  FOR UPDATE USING (
    public.has_permission(company_id, 'members.manage')
    AND NOT (user_id = auth.uid() AND public.is_org_owner(company_id, auth.uid()))
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_member_roles.company_id
      )
    )
  )
  WITH CHECK (
    public.has_permission(company_id, 'members.manage')
    AND EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.org_id = organisation_member_roles.company_id
        AND om.user_id = organisation_member_roles.user_id
    )
    AND NOT (
      organisation_member_roles.user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_member_roles.company_id
      )
    )
    AND (
      organisation_member_roles.role_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.roles r
        WHERE r.id = organisation_member_roles.role_id
          AND r.company_id = organisation_member_roles.company_id
          AND lower(r.name) <> 'owner'
      )
    )
  );

CREATE POLICY "Managers can insert members" ON stoqr.organisation_member_roles
  FOR INSERT WITH CHECK (
    public.has_permission(company_id, 'members.manage')
    AND EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.org_id = organisation_member_roles.company_id
        AND om.user_id = organisation_member_roles.user_id
    )
    AND NOT (
      organisation_member_roles.user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_member_roles.company_id
      )
    )
    AND (
      organisation_member_roles.role_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.roles r
        WHERE r.id = organisation_member_roles.role_id
          AND r.company_id = organisation_member_roles.company_id
          AND lower(r.name) <> 'owner'
      )
    )
  );

CREATE POLICY "Managers can delete members" ON stoqr.organisation_member_roles
  FOR DELETE USING (
    public.has_permission(company_id, 'members.manage')
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_member_roles.company_id
      )
    )
  );

CREATE POLICY "Members can view organisation page settings" ON stoqr.organisation_page_settings
  FOR SELECT USING (
    public.is_org_member(company_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "Admins can insert organisation page settings" ON stoqr.organisation_page_settings
  FOR INSERT WITH CHECK (
    public.is_org_admin(company_id, auth.uid())
    OR public.has_permission(company_id, 'company.manage')
    OR public.is_app_super_admin()
  );

CREATE POLICY "Admins can update organisation page settings" ON stoqr.organisation_page_settings
  FOR UPDATE USING (
    public.is_org_admin(company_id, auth.uid())
    OR public.has_permission(company_id, 'company.manage')
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    public.is_org_admin(company_id, auth.uid())
    OR public.has_permission(company_id, 'company.manage')
    OR public.is_app_super_admin()
  );

CREATE POLICY "Members can view folders" ON stoqr.folders
  FOR SELECT USING (public.has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage folders" ON stoqr.folders
  FOR ALL USING (public.has_permission(company_id, 'products.manage'))
  WITH CHECK (public.has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view tags" ON stoqr.tags
  FOR SELECT USING (public.has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage tags" ON stoqr.tags
  FOR ALL USING (public.has_permission(company_id, 'products.manage'))
  WITH CHECK (public.has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view products" ON stoqr.products
  FOR SELECT USING (
    deleted_at IS NULL
    AND public.has_permission(company_id, 'products.view')
  );

CREATE POLICY "Staff can manage products" ON stoqr.products
  FOR ALL USING (public.has_permission(company_id, 'products.manage'))
  WITH CHECK (public.has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view product barcodes" ON stoqr.product_barcodes
  FOR SELECT USING (public.has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage product barcodes" ON stoqr.product_barcodes
  FOR ALL USING (public.has_permission(company_id, 'products.manage'))
  WITH CHECK (
    public.has_permission(company_id, 'products.manage')
    AND EXISTS (
      SELECT 1
      FROM stoqr.products p
      WHERE p.id = product_barcodes.product_id
        AND p.company_id = product_barcodes.company_id
    )
  );

CREATE POLICY "Members can view product tags" ON stoqr.product_tags
  FOR SELECT USING (public.has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage product tags" ON stoqr.product_tags
  FOR ALL USING (public.has_permission(company_id, 'products.manage'))
  WITH CHECK (
    public.has_permission(company_id, 'products.manage')
    AND EXISTS (
      SELECT 1
      FROM stoqr.products p
      WHERE p.id = product_tags.product_id
        AND p.company_id = product_tags.company_id
    )
    AND EXISTS (
      SELECT 1
      FROM stoqr.tags t
      WHERE t.id = product_tags.tag_id
        AND t.company_id = product_tags.company_id
    )
  );

CREATE POLICY "Members can view transactions" ON stoqr.inventory_transactions
  FOR SELECT USING (public.has_permission(company_id, 'transactions.view'));

CREATE POLICY "Staff can create transactions" ON stoqr.inventory_transactions
  FOR INSERT WITH CHECK (
    public.has_permission(company_id, 'transactions.create')
    AND EXISTS (
      SELECT 1
      FROM stoqr.products p
      WHERE p.id = inventory_transactions.product_id
        AND p.company_id = inventory_transactions.company_id
    )
  );

CREATE POLICY "Staff can manage bulk operations" ON stoqr.inventory_bulk_operations
  FOR ALL USING (public.has_permission(company_id, 'inventory.bulk_manage'))
  WITH CHECK (public.has_permission(company_id, 'inventory.bulk_manage'));

CREATE POLICY "Members can view scan events" ON stoqr.scan_events
  FOR SELECT USING (
    public.has_permission(company_id, 'scanner.use')
    OR public.has_permission(company_id, 'transactions.view')
  );

CREATE POLICY "Staff can create scan events" ON stoqr.scan_events
  FOR INSERT WITH CHECK (
    (
      public.has_permission(company_id, 'scanner.use')
      OR public.has_permission(company_id, 'transactions.create')
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.products p
        WHERE p.id = scan_events.product_id
          AND p.company_id = scan_events.company_id
      )
    )
  );

CREATE POLICY "Members can view report schedules" ON stoqr.report_schedules
  FOR SELECT USING (public.has_permission(company_id, 'reports.view'));

CREATE POLICY "Admins can manage report schedules" ON stoqr.report_schedules
  FOR ALL USING (public.has_permission(company_id, 'reports.export'))
  WITH CHECK (public.has_permission(company_id, 'reports.export'));

CREATE POLICY "Members can view report exports" ON stoqr.report_exports
  FOR SELECT USING (
    public.has_permission(company_id, 'reports.view')
    OR requested_by = auth.uid()
  );

CREATE POLICY "Staff can manage report exports" ON stoqr.report_exports
  FOR ALL USING (public.has_permission(company_id, 'reports.export'))
  WITH CHECK (public.has_permission(company_id, 'reports.export'));

CREATE POLICY "Staff can manage suppliers" ON stoqr.suppliers
  FOR ALL USING (
    public.has_permission(company_id, 'procurement.manage')
    OR public.has_permission(company_id, 'products.manage')
  )
  WITH CHECK (
    public.has_permission(company_id, 'procurement.manage')
    OR public.has_permission(company_id, 'products.manage')
  );

CREATE POLICY "Staff can manage POs" ON stoqr.purchase_orders
  FOR ALL USING (
    public.has_permission(company_id, 'procurement.manage')
    OR public.has_permission(company_id, 'products.manage')
  )
  WITH CHECK (
    public.has_permission(company_id, 'procurement.manage')
    OR public.has_permission(company_id, 'products.manage')
  );

CREATE POLICY "Staff can manage PO items" ON stoqr.purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          public.has_permission(po.company_id, 'procurement.manage')
          OR public.has_permission(po.company_id, 'products.manage')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          public.has_permission(po.company_id, 'procurement.manage')
          OR public.has_permission(po.company_id, 'products.manage')
        )
    )
  );

CREATE POLICY "Staff can view receiving logs" ON stoqr.receiving_logs
  FOR SELECT USING (
    public.has_permission(company_id, 'transactions.view')
    OR public.has_permission(company_id, 'procurement.manage')
  );

CREATE POLICY "Staff can manage receiving logs" ON stoqr.receiving_logs
  FOR INSERT WITH CHECK (
    public.has_permission(company_id, 'procurement.manage')
    OR public.has_permission(company_id, 'products.manage')
  );

CREATE POLICY "Members can view alert rules" ON stoqr.alert_rules
  FOR SELECT USING (
    public.has_permission(company_id, 'alerts.view')
    OR public.has_permission(company_id, 'alerts.manage')
  );

CREATE POLICY "Staff can manage alert rules" ON stoqr.alert_rules
  FOR ALL USING (public.has_permission(company_id, 'alerts.manage'))
  WITH CHECK (public.has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view alert events" ON stoqr.alert_events
  FOR SELECT USING (
    public.has_permission(company_id, 'alerts.view')
    OR public.has_permission(company_id, 'alerts.manage')
    OR public.has_permission(company_id, 'dashboard.view')
  );

CREATE POLICY "Staff can manage alert events" ON stoqr.alert_events
  FOR ALL USING (public.has_permission(company_id, 'alerts.manage'))
  WITH CHECK (public.has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Staff can view alert deliveries" ON stoqr.alert_delivery_logs
  FOR SELECT USING (public.has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view activity events" ON stoqr.activity_events
  FOR SELECT USING (
    public.has_permission(company_id, 'activity.view')
    OR public.has_permission(company_id, 'members.view')
  );

CREATE POLICY "Members can view label templates" ON stoqr.label_templates
  FOR SELECT USING (
    company_id IS NULL
    OR public.has_permission(company_id, 'products.view')
    OR public.has_permission(company_id, 'labels.manage')
  );

CREATE POLICY "Staff can manage label templates" ON stoqr.label_templates
  FOR ALL USING (
    company_id IS NOT NULL
    AND public.has_permission(company_id, 'labels.manage')
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND public.has_permission(company_id, 'labels.manage')
  );

CREATE POLICY "Staff can manage label print jobs" ON stoqr.label_print_jobs
  FOR ALL USING (public.has_permission(company_id, 'labels.manage'))
  WITH CHECK (public.has_permission(company_id, 'labels.manage'));

CREATE POLICY "Give users access to their company folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM stoqr.organisation_member_roles
      WHERE user_id = auth.uid()
        AND public.has_permission(company_id, 'products.manage')
    )
  );

CREATE POLICY "Users can view images from their company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM stoqr.organisation_member_roles
      WHERE user_id = auth.uid()
    )
  );

-- Operational bootstrap: StoQR product image uploads require this bucket in every environment.
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE FUNCTION public.get_inventory_stats(target_company_id UUID)
RETURNS TABLE (total_items BIGINT, low_stock_items BIGINT, total_value NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'products.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_items,
    COUNT(*) FILTER (WHERE COALESCE(p.quantity_on_hand, 0) <= COALESCE(p.reorder_point, 0))::BIGINT AS low_stock_items,
    COALESCE(SUM(COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0)), 0)::NUMERIC AS total_value
  FROM stoqr.products p
  WHERE p.company_id = target_company_id;
END;
$$;

CREATE FUNCTION public.get_stoqr_dashboard_snapshot(
  target_company_id UUID,
  p_days INTEGER DEFAULT 30,
  p_activity_limit INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_days INTEGER := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_activity_limit INTEGER := LEAST(GREATEST(COALESCE(p_activity_limit, 10), 1), 100);
  v_result JSONB;
BEGIN
  IF NOT (
    public.has_permission(target_company_id, 'dashboard.view')
    OR public.has_permission(target_company_id, 'products.view')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH product_stats AS (
    SELECT
      COALESCE(SUM(COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0)), 0)::NUMERIC AS total_inventory_value,
      COALESCE(SUM(COALESCE(p.quantity_on_hand, 0)), 0)::BIGINT AS total_stock_units,
      COUNT(*) FILTER (
        WHERE COALESCE(p.quantity_on_hand, 0) <= COALESCE(NULLIF(p.min_stock_level, 0), p.reorder_point, 0)
      )::BIGINT AS low_stock_items,
      COUNT(*) FILTER (WHERE COALESCE(p.quantity_on_hand, 0) <= 0)::BIGINT AS out_of_stock_items
    FROM stoqr.products p
    WHERE p.company_id = target_company_id
      AND p.deleted_at IS NULL
  ),
  pending_orders AS (
    SELECT COUNT(*)::BIGINT AS pending_orders
    FROM stoqr.purchase_orders po
    WHERE po.company_id = target_company_id
      AND po.status IN ('draft', 'sent', 'partial')
  ),
  alert_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE ae.status = 'open')::BIGINT AS open_alerts,
      COUNT(*) FILTER (WHERE ae.status = 'open' AND ae.alert_type = 'low_stock')::BIGINT AS low_stock_alerts,
      COUNT(*) FILTER (WHERE ae.status = 'open' AND ae.alert_type = 'reorder_point')::BIGINT AS reorder_alerts,
      COUNT(*) FILTER (WHERE ae.status = 'open' AND ae.alert_type = 'expiration')::BIGINT AS expiration_alerts,
      COUNT(*) FILTER (WHERE ae.status = 'open' AND ae.severity = 'critical')::BIGINT AS critical_alerts
    FROM stoqr.alert_events ae
    WHERE ae.company_id = target_company_id
  ),
  inventory_trend AS (
    SELECT
      date_trunc('day', it.created_at)::date AS day,
      SUM(it.quantity_change)::NUMERIC AS delta
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
      AND it.created_at >= (timezone('utc'::text, now()) - make_interval(days => v_days))
    GROUP BY 1
    ORDER BY 1
  ),
  usage_trend AS (
    SELECT
      date_trunc('day', it.created_at)::date AS day,
      SUM(ABS(it.quantity_change))::NUMERIC AS usage
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
      AND it.transaction_type IN ('sale', 'loss', 'scan_out')
      AND it.created_at >= (timezone('utc'::text, now()) - make_interval(days => v_days))
    GROUP BY 1
    ORDER BY 1
  ),
  recent_activity AS (
    SELECT jsonb_build_object(
      'id', ae.id,
      'event_type', ae.event_type,
      'entity_type', ae.entity_type,
      'entity_id', ae.entity_id,
      'message', ae.message,
      'metadata', ae.metadata,
      'created_at', ae.created_at,
      'actor', jsonb_build_object(
        'id', prof.id,
        'full_name', prof.full_name,
        'username', prof.username,
        'email', prof.email
      )
    ) AS row_json
    FROM stoqr.activity_events ae
    LEFT JOIN public.profiles prof ON prof.id = ae.actor_user_id
    WHERE ae.company_id = target_company_id
    ORDER BY ae.created_at DESC
    LIMIT v_activity_limit
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_inventory_value', ps.total_inventory_value,
      'total_stock_units', ps.total_stock_units,
      'low_stock_items', ps.low_stock_items,
      'out_of_stock_items', ps.out_of_stock_items,
      'pending_orders', po.pending_orders,
      'open_alerts', ac.open_alerts
    ),
    'alerts_summary', jsonb_build_object(
      'open_alerts', ac.open_alerts,
      'critical_alerts', ac.critical_alerts,
      'low_stock_alerts', ac.low_stock_alerts,
      'reorder_alerts', ac.reorder_alerts,
      'expiration_alerts', ac.expiration_alerts
    ),
    'charts', jsonb_build_object(
      'inventory_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', day, 'delta', delta) ORDER BY day) FROM inventory_trend), '[]'::jsonb),
      'usage_trend', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', day, 'usage', usage) ORDER BY day) FROM usage_trend), '[]'::jsonb)
    ),
    'recent_activity', COALESCE((SELECT jsonb_agg(row_json) FROM recent_activity), '[]'::jsonb)
  )
  INTO v_result
  FROM product_stats ps
  CROSS JOIN pending_orders po
  CROSS JOIN alert_counts ac;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

CREATE FUNCTION public.get_stoqr_report_inventory_valuation(target_company_id UUID)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  name TEXT,
  quantity_on_hand INTEGER,
  min_stock_level INTEGER,
  reorder_point INTEGER,
  cost_price NUMERIC,
  selling_price NUMERIC,
  inventory_value NUMERIC,
  potential_revenue NUMERIC,
  margin_per_unit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    COALESCE(p.quantity_on_hand, 0),
    COALESCE(p.min_stock_level, 0),
    COALESCE(p.reorder_point, 0),
    COALESCE(p.cost_price, 0)::NUMERIC,
    COALESCE(p.selling_price, 0)::NUMERIC,
    (COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0))::NUMERIC,
    (COALESCE(p.quantity_on_hand, 0) * COALESCE(p.selling_price, 0))::NUMERIC,
    (COALESCE(p.selling_price, 0) - COALESCE(p.cost_price, 0))::NUMERIC
  FROM stoqr.products p
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

CREATE FUNCTION public.get_stoqr_report_stock_movements(
  target_company_id UUID,
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  transaction_id UUID,
  created_at TIMESTAMPTZ,
  transaction_type TEXT,
  source TEXT,
  quantity_change INTEGER,
  stock_after INTEGER,
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  performed_by UUID,
  performer_name TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    it.id,
    it.created_at,
    it.transaction_type,
    it.source,
    it.quantity_change,
    it.stock_after,
    p.id,
    p.sku,
    p.name,
    it.performed_by,
    COALESCE(pr.full_name, pr.username, pr.email),
    it.notes
  FROM stoqr.inventory_transactions it
  JOIN stoqr.products p ON p.id = it.product_id
  LEFT JOIN public.profiles pr ON pr.id = it.performed_by
  WHERE it.company_id = target_company_id
    AND (p_start IS NULL OR it.created_at >= p_start)
    AND (p_end IS NULL OR it.created_at <= p_end)
  ORDER BY it.created_at DESC;
END;
$$;

CREATE FUNCTION public.get_stoqr_report_usage_depletion(
  target_company_id UUID,
  p_start TIMESTAMPTZ DEFAULT NULL,
  p_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  opening_stock INTEGER,
  current_stock INTEGER,
  total_inbound INTEGER,
  total_outbound INTEGER,
  net_change INTEGER,
  avg_daily_usage NUMERIC,
  days_of_stock_remaining NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_start TIMESTAMPTZ := COALESCE(p_start, timezone('utc'::text, now()) - INTERVAL '30 days');
  v_end TIMESTAMPTZ := COALESCE(p_end, timezone('utc'::text, now()));
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH tx AS (
    SELECT
      it.product_id,
      SUM(CASE WHEN it.quantity_change > 0 THEN it.quantity_change ELSE 0 END)::INTEGER AS total_inbound,
      SUM(CASE WHEN it.quantity_change < 0 THEN ABS(it.quantity_change) ELSE 0 END)::INTEGER AS total_outbound,
      SUM(it.quantity_change)::INTEGER AS net_change
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
      AND it.created_at >= v_start
      AND it.created_at <= v_end
    GROUP BY it.product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    (COALESCE(p.quantity_on_hand, 0) - COALESCE(tx.net_change, 0))::INTEGER,
    COALESCE(p.quantity_on_hand, 0)::INTEGER,
    COALESCE(tx.total_inbound, 0)::INTEGER,
    COALESCE(tx.total_outbound, 0)::INTEGER,
    COALESCE(tx.net_change, 0)::INTEGER,
    CASE
      WHEN EXTRACT(EPOCH FROM (v_end - v_start)) <= 0 THEN 0
      ELSE ROUND((COALESCE(tx.total_outbound, 0)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (v_end - v_start)) / 86400.0, 1)), 2)
    END,
    CASE
      WHEN COALESCE(tx.total_outbound, 0) <= 0 THEN NULL
      ELSE ROUND(
        COALESCE(p.quantity_on_hand, 0)::NUMERIC /
        GREATEST((COALESCE(tx.total_outbound, 0)::NUMERIC / GREATEST(EXTRACT(EPOCH FROM (v_end - v_start)) / 86400.0, 1)), 0.000001),
        2
      )
    END
  FROM stoqr.products p
  LEFT JOIN tx ON tx.product_id = p.id
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

CREATE FUNCTION public.get_stoqr_report_reorder_analysis(target_company_id UUID)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  quantity_on_hand INTEGER,
  min_stock_level INTEGER,
  reorder_point INTEGER,
  max_stock_level INTEGER,
  reorder_status TEXT,
  suggested_reorder_qty INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.sku,
    p.name,
    COALESCE(p.quantity_on_hand, 0)::INTEGER,
    COALESCE(p.min_stock_level, 0)::INTEGER,
    COALESCE(p.reorder_point, 0)::INTEGER,
    COALESCE(p.max_stock_level, COALESCE(p.reorder_point, 0))::INTEGER,
    CASE
      WHEN COALESCE(p.quantity_on_hand, 0) <= COALESCE(p.min_stock_level, 0) THEN 'critical'
      WHEN COALESCE(p.quantity_on_hand, 0) <= COALESCE(p.reorder_point, 0) THEN 'reorder'
      ELSE 'ok'
    END,
    GREATEST(COALESCE(p.max_stock_level, COALESCE(p.reorder_point, 0)) - COALESCE(p.quantity_on_hand, 0), 0)::INTEGER
  FROM stoqr.products p
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

CREATE FUNCTION public.get_stoqr_report_dead_stock(
  target_company_id UUID,
  p_inactive_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  product_id UUID,
  sku TEXT,
  product_name TEXT,
  quantity_on_hand INTEGER,
  inventory_value NUMERIC,
  last_movement_at TIMESTAMPTZ,
  days_since_last_movement INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
DECLARE
  v_inactive_days INTEGER := LEAST(GREATEST(COALESCE(p_inactive_days, 90), 1), 3650);
BEGIN
  IF NOT public.has_permission(target_company_id, 'reports.view') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH last_movement AS (
    SELECT
      it.product_id,
      MAX(it.created_at) AS last_movement_at
    FROM stoqr.inventory_transactions it
    WHERE it.company_id = target_company_id
    GROUP BY it.product_id
  )
  SELECT
    p.id,
    p.sku,
    p.name,
    COALESCE(p.quantity_on_hand, 0)::INTEGER,
    (COALESCE(p.quantity_on_hand, 0) * COALESCE(p.cost_price, 0))::NUMERIC,
    lm.last_movement_at,
    COALESCE((EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - lm.last_movement_at)) / 86400)::INTEGER, 999999)
  FROM stoqr.products p
  LEFT JOIN last_movement lm ON lm.product_id = p.id
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
    AND COALESCE(p.quantity_on_hand, 0) > 0
    AND (
      lm.last_movement_at IS NULL
      OR lm.last_movement_at <= timezone('utc'::text, now()) - make_interval(days => v_inactive_days)
    )
  ORDER BY days_since_last_movement DESC, p.name;
END;
$$;

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
  IF NOT public.has_permission(target_company_id, 'reports.export') THEN
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

CREATE FUNCTION public.get_stoqr_alert_products(target_company_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  quantity_on_hand INTEGER,
  reorder_point INTEGER,
  expiry_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF NOT (
    public.has_permission(target_company_id, 'alerts.view')
    OR public.has_permission(target_company_id, 'products.view')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sku,
    COALESCE(p.quantity_on_hand, 0)::INTEGER,
    COALESCE(p.reorder_point, 0)::INTEGER,
    p.expiry_date
  FROM stoqr.products p
  WHERE p.company_id = target_company_id
    AND p.deleted_at IS NULL
  ORDER BY p.name;
END;
$$;

GRANT SELECT ON TABLE stoqr.app_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.organisation_member_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE stoqr.organisation_page_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.product_barcodes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.product_tags TO authenticated;
GRANT SELECT, INSERT ON TABLE stoqr.inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.inventory_bulk_operations TO authenticated;
GRANT SELECT, INSERT ON TABLE stoqr.scan_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.report_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.report_exports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.purchase_order_items TO authenticated;
GRANT SELECT, INSERT ON TABLE stoqr.receiving_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.alert_events TO authenticated;
GRANT SELECT ON TABLE stoqr.alert_delivery_logs TO authenticated;
GRANT SELECT ON TABLE stoqr.activity_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.label_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.label_print_jobs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE stoqr.purchase_orders_po_number_seq TO authenticated;

GRANT ALL PRIVILEGES ON TABLE stoqr.app_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.roles TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.role_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.organisation_member_roles TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.organisation_page_settings TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.folders TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.tags TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.products TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.product_barcodes TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.product_tags TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.inventory_transactions TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.inventory_bulk_operations TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.scan_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.report_schedules TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.report_exports TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.suppliers TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.purchase_orders TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.purchase_order_items TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.receiving_logs TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_rules TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_delivery_logs TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.activity_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.label_templates TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.label_print_jobs TO service_role;
GRANT ALL PRIVILEGES ON SEQUENCE stoqr.purchase_orders_po_number_seq TO service_role;

REVOKE ALL ON FUNCTION public.map_stoqr_role_to_org_role(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pick_stoqr_role_for_org_member(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pick_next_stoqr_role(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_owner_app_roles(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_owner_role_mutation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_owner_role_permission_delete() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_new_permission_to_owner_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_org_owner_member_and_default_seats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION stoqr.update_inventory_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION stoqr.log_activity_event(UUID, TEXT, TEXT, UUID, TEXT, JSONB, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION stoqr.capture_activity_event() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_inventory_stats(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_dashboard_snapshot(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_inventory_valuation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_usage_depletion(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_reorder_analysis(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_report_dead_stock(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_stoqr_report_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_stoqr_alert_products(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.map_stoqr_role_to_org_role(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pick_stoqr_role_for_org_member(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.pick_next_stoqr_role(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_owner_app_roles(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION stoqr.log_activity_event(UUID, TEXT, TEXT, UUID, TEXT, JSONB, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_inventory_stats(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_dashboard_snapshot(UUID, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_inventory_valuation(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_usage_depletion(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_reorder_analysis(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_report_dead_stock(UUID, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_stoqr_report_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stoqr_alert_products(UUID) TO authenticated, service_role;