-- ============================================================
-- Baseline: StoQR Schema Tables (Canonical Org FK)
-- ============================================================

CREATE TABLE IF NOT EXISTS stoqr.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT
);

INSERT INTO stoqr.app_permissions (code, description) VALUES
  ('company.manage', 'Manage company details and settings'),
  ('billing.manage', 'Manage subscription and billing'),
  ('members.view', 'View company members'),
  ('members.manage', 'Invite and manage members'),
  ('roles.manage', 'Create and edit custom roles'),
  ('dashboard.view', 'View dashboard KPIs, trends, and alerts summary'),
  ('products.view', 'View inventory and products'),
  ('products.manage', 'Create, edit, and delete products'),
  ('inventory.bulk_manage', 'Import, export, and bulk update inventory records'),
  ('scanner.use', 'Use scanner workflows and scan history'),
  ('labels.manage', 'Manage label templates and print jobs'),
  ('reports.view', 'View reports and analytics data'),
  ('reports.export', 'Export reports to CSV/PDF/PNG'),
  ('procurement.manage', 'Manage suppliers, purchase orders, and receiving'),
  ('alerts.view', 'View inventory and system alerts'),
  ('alerts.manage', 'Manage alert rules and delivery settings'),
  ('activity.view', 'View company activity logs'),
  ('transactions.view', 'View stock history'),
  ('transactions.create', 'Create stock in/out transactions')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS stoqr.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS stoqr_roles_company_id_name_lower_uidx
  ON stoqr.roles (company_id, lower(name));

CREATE TABLE IF NOT EXISTS stoqr.role_permissions (
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE CASCADE NOT NULL,
  permission_code TEXT REFERENCES stoqr.app_permissions(code) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS stoqr.organisation_member_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, company_id)
);

CREATE TABLE IF NOT EXISTS stoqr.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES stoqr.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stoqr.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#64748b',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS stoqr.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  folder_id UUID REFERENCES stoqr.folders(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  primary_barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  quantity_on_hand INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0 CHECK (min_stock_level >= 0),
  max_stock_level INTEGER CHECK (max_stock_level IS NULL OR max_stock_level >= 0),
  reorder_point INTEGER DEFAULT 10,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  image_urls TEXT[] DEFAULT '{}'::text[],
  expiry_date DATE,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT products_max_images CHECK (coalesce(array_length(image_urls, 1), 0) <= 4),
  CONSTRAINT products_max_stock_gte_min CHECK (max_stock_level IS NULL OR max_stock_level >= min_stock_level),
  UNIQUE(company_id, sku)
);

CREATE TRIGGER handle_products_updated_at
  BEFORE UPDATE ON stoqr.products
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS stoqr.product_barcodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE CASCADE NOT NULL,
  barcode TEXT NOT NULL,
  barcode_type TEXT NOT NULL DEFAULT 'barcode' CHECK (barcode_type IN ('barcode', 'qr')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, barcode)
);

CREATE TABLE IF NOT EXISTS stoqr.product_tags (
  product_id UUID REFERENCES stoqr.products(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES stoqr.tags(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS stoqr.inventory_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE RESTRICT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'scan_in', 'scan_out')) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scan', 'import', 'api', 'receiving')),
  quantity_change INTEGER NOT NULL,
  stock_after INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stoqr.inventory_bulk_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('import', 'export', 'bulk_update')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stoqr.scan_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  barcode TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('lookup', 'stock_in', 'stock_out')),
  quantity INTEGER,
  entry_method TEXT NOT NULL DEFAULT 'camera' CHECK (entry_method IN ('camera', 'manual')),
  scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES stoqr.inventory_transactions(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stoqr.report_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL,
  cadence TEXT CHECK (cadence IN ('daily', 'weekly', 'monthly')) NOT NULL,
  day_of_week INTEGER,
  day_of_month INTEGER,
  time_of_day TIME,
  recipients TEXT[] DEFAULT '{}'::text[],
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stoqr.report_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  report_type TEXT NOT NULL,
  export_format TEXT NOT NULL CHECK (export_format IN ('csv', 'pdf', 'png')),
  date_range_start DATE,
  date_range_end DATE,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stoqr.suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stoqr.purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES stoqr.suppliers(id) ON DELETE SET NULL,
  po_number SERIAL,
  status TEXT CHECK (status IN ('draft', 'sent', 'partial', 'closed', 'cancelled')) DEFAULT 'draft',
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  return_status TEXT CHECK (return_status IN ('none', 'awaiting_return', 'shipped', 'resolved')) DEFAULT 'none',
  expected_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stoqr.purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID REFERENCES stoqr.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED
);

CREATE TABLE IF NOT EXISTS stoqr.receiving_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  po_id UUID REFERENCES stoqr.purchase_orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  quantity_received INTEGER NOT NULL,
  received_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS stoqr.alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'reorder_point', 'expiration', 'custom')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_channels TEXT[] NOT NULL DEFAULT '{in_app}'::text[],
  recipients TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ
);

CREATE TRIGGER handle_alert_rules_updated_at
  BEFORE UPDATE ON stoqr.alert_rules
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS stoqr.alert_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES stoqr.alert_rules(id) ON DELETE SET NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'reorder_point', 'expiration', 'custom')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stoqr.alert_delivery_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  alert_event_id UUID REFERENCES stoqr.alert_events(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push')),
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS stoqr.activity_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS stoqr.label_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  variable_fields TEXT[] NOT NULL DEFAULT '{barcode,sku,name,price,qr}'::text[],
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ,
  UNIQUE(company_id, name)
);

CREATE TRIGGER handle_label_templates_updated_at
  BEFORE UPDATE ON stoqr.label_templates
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TABLE IF NOT EXISTS stoqr.label_print_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES stoqr.label_templates(id) ON DELETE SET NULL,
  format TEXT NOT NULL CHECK (format IN ('pdf', 'png')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  output_url TEXT,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMPTZ
);

INSERT INTO stoqr.label_templates (company_id, name, is_system, layout, variable_fields)
VALUES
  (NULL, 'Standard Product Barcode', true, '{}'::jsonb, '{barcode,sku,name,price,qr}'::text[]),
  (NULL, 'Warehouse Bin Locator', true, '{}'::jsonb, '{barcode,name,qr}'::text[]),
  (NULL, 'B2B Shipping Label (4x6)', true, '{}'::jsonb, '{barcode,sku,name,qr}'::text[])
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_products_custom_fields ON stoqr.products USING gin (custom_fields);
CREATE UNIQUE INDEX idx_products_company_primary_barcode_unique
  ON stoqr.products(company_id, primary_barcode)
  WHERE primary_barcode IS NOT NULL;
CREATE INDEX idx_folders_company ON stoqr.folders(company_id);
CREATE INDEX idx_folders_parent ON stoqr.folders(parent_id);
CREATE INDEX idx_product_tags_product ON stoqr.product_tags(product_id);
CREATE INDEX idx_product_tags_tag ON stoqr.product_tags(tag_id);
CREATE INDEX idx_role_permissions_role ON stoqr.role_permissions(role_id);
CREATE INDEX idx_report_schedules_company ON stoqr.report_schedules(company_id);
CREATE INDEX idx_products_company_stock_levels ON stoqr.products(company_id, quantity_on_hand, min_stock_level, reorder_point);
CREATE INDEX idx_product_barcodes_product ON stoqr.product_barcodes(product_id);
CREATE INDEX idx_product_barcodes_company_type ON stoqr.product_barcodes(company_id, barcode_type);
CREATE INDEX idx_inventory_bulk_operations_company_created ON stoqr.inventory_bulk_operations(company_id, created_at DESC);
CREATE INDEX idx_scan_events_company_created ON stoqr.scan_events(company_id, created_at DESC);
CREATE INDEX idx_scan_events_product_created ON stoqr.scan_events(product_id, created_at DESC);
CREATE INDEX idx_report_exports_company_created ON stoqr.report_exports(company_id, created_at DESC);
CREATE INDEX idx_purchase_orders_company_status ON stoqr.purchase_orders(company_id, status, created_at DESC);
CREATE INDEX idx_alert_rules_company_type ON stoqr.alert_rules(company_id, alert_type);
CREATE INDEX idx_alert_events_company_status ON stoqr.alert_events(company_id, status, triggered_at DESC);
CREATE INDEX idx_alert_events_product ON stoqr.alert_events(product_id, triggered_at DESC);
CREATE INDEX idx_alert_delivery_logs_event ON stoqr.alert_delivery_logs(alert_event_id);
CREATE INDEX idx_activity_events_company_created ON stoqr.activity_events(company_id, created_at DESC);
CREATE INDEX idx_label_templates_company ON stoqr.label_templates(company_id);
CREATE UNIQUE INDEX idx_label_templates_global_name_unique
  ON stoqr.label_templates(name)
  WHERE company_id IS NULL;
CREATE INDEX idx_label_print_jobs_company_status ON stoqr.label_print_jobs(company_id, status, created_at DESC);

ALTER TABLE stoqr.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.organisation_member_roles ENABLE ROW LEVEL SECURITY;
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
