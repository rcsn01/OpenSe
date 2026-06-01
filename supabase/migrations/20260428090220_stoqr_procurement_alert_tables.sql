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
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'not_started', 'awaiting_supplier', 'in_transit', 'partial_receipt', 'received', 'cancelled', 'denied', 'awaiting_return', 'shipped_to_vendor', 'return_resolved')),
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
  updated_at TIMESTAMPTZ,
  CONSTRAINT alert_rules_delivery_channels_check
    CHECK (delivery_channels <@ ARRAY['in_app', 'email', 'push', 'telegram', 'mattermost']::text[])
);

CREATE TABLE stoqr.alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES stoqr.alert_rules(id) ON DELETE SET NULL,
  product_id UUID REFERENCES stoqr.products(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES stoqr.folders(id) ON DELETE SET NULL,
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
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'push', 'telegram', 'mattermost')),
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ
);

CREATE TABLE stoqr.alert_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram', 'mattermost')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'pairing', 'connected', 'error')),
  health_status TEXT,
  last_error TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ
);

CREATE TABLE stoqr.alert_connector_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES stoqr.alert_connectors(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL DEFAULT 'chat' CHECK (target_type IN ('chat', 'group', 'channel', 'webhook')),
  target_name TEXT NOT NULL,
  provider_target_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ,
  UNIQUE (connector_id, provider_target_id)
);

CREATE TABLE stoqr.alert_rule_connector_targets (
  rule_id UUID NOT NULL REFERENCES stoqr.alert_rules(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES stoqr.alert_connector_targets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (rule_id, target_id)
);

CREATE TABLE stoqr.alert_dispatch_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  function_url TEXT NOT NULL,
  dispatch_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
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
