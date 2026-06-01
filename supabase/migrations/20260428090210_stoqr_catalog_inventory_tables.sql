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

CREATE TABLE stoqr.product_folder_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES stoqr.products(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES stoqr.folders(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  max_stock_level INTEGER CHECK (max_stock_level IS NULL OR max_stock_level >= 0),
  updated_at TIMESTAMPTZ,
  CONSTRAINT product_folder_stocks_max_stock_gte_min CHECK (max_stock_level IS NULL OR max_stock_level >= min_stock_level),
  UNIQUE (company_id, product_id, folder_id)
);

CREATE TABLE stoqr.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES stoqr.products(id) ON DELETE RESTRICT,
  folder_id UUID REFERENCES stoqr.folders(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES public.profiles(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'adjustment', 'return', 'loss', 'scan_in', 'scan_out', 'transfer_in', 'transfer_out')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scan', 'import', 'api', 'receiving')),
  quantity_change INTEGER NOT NULL,
  stock_after INTEGER,
  transfer_group_id UUID,
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
  folder_id UUID REFERENCES stoqr.folders(id) ON DELETE SET NULL,
  barcode TEXT,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('lookup', 'stock_in', 'stock_out')),
  quantity INTEGER,
  entry_method TEXT NOT NULL DEFAULT 'camera' CHECK (entry_method IN ('camera', 'manual')),
  scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES stoqr.inventory_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

