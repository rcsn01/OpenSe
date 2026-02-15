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
  ('products.view', 'View inventory and products'),
  ('products.manage', 'Create, edit, and delete products'),
  ('transactions.view', 'View stock history'),
  ('transactions.create', 'Create stock in/out transactions')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS stoqr.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(company_id, name)
);

CREATE TABLE IF NOT EXISTS stoqr.role_permissions (
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE CASCADE NOT NULL,
  permission_code TEXT REFERENCES stoqr.app_permissions(code) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS stoqr.company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, company_id)
);

CREATE TABLE IF NOT EXISTS stoqr.company_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  email CITEXT NOT NULL,
  role_id UUID REFERENCES stoqr.roles(id) ON DELETE CASCADE NOT NULL,
  token TEXT DEFAULT gen_random_uuid()::text NOT NULL UNIQUE,
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at TIMESTAMPTZ,
  UNIQUE(company_id, email)
);

CREATE TABLE IF NOT EXISTS stoqr.subscriptions (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete')) NOT NULL,
  price_id TEXT,
  quantity INTEGER DEFAULT 1,
  cancel_at_period_end BOOLEAN DEFAULT false,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMPTZ
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
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  quantity_on_hand INTEGER DEFAULT 0,
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
  UNIQUE(company_id, sku)
);

CREATE TRIGGER handle_products_updated_at
  BEFORE UPDATE ON stoqr.products
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

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
  transaction_type TEXT CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'loss')) NOT NULL,
  quantity_change INTEGER NOT NULL,
  stock_after INTEGER,
  notes TEXT,
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

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_products_custom_fields ON stoqr.products USING gin (custom_fields);
CREATE INDEX idx_folders_company ON stoqr.folders(company_id);
CREATE INDEX idx_folders_parent ON stoqr.folders(parent_id);
CREATE INDEX idx_product_tags_product ON stoqr.product_tags(product_id);
CREATE INDEX idx_product_tags_tag ON stoqr.product_tags(tag_id);
CREATE INDEX idx_role_permissions_role ON stoqr.role_permissions(role_id);
CREATE INDEX idx_report_schedules_company ON stoqr.report_schedules(company_id);

ALTER TABLE stoqr.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.product_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stoqr.receiving_logs ENABLE ROW LEVEL SECURITY;
