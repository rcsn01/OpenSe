-- 0005_procurement_schema.sql

-- 1. SUPPLIERS
create table public.suppliers (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PURCHASE ORDERS (PO)
create table public.purchase_orders (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  po_number serial, -- Simple auto-increment for human readable IDs
  status text check (status in ('draft', 'sent', 'partial', 'closed', 'cancelled')) default 'draft',
  expected_date date,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- 3. PO ITEMS
create table public.purchase_order_items (
  id uuid default gen_random_uuid() primary key,
  po_id uuid references public.purchase_orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  quantity_ordered integer not null,
  quantity_received integer default 0,
  unit_cost decimal(10,2) default 0,
  total_cost decimal(10,2) generated always as (quantity_ordered * unit_cost) stored
);

-- 4. RECEIVING LOGS (Audit trail for 3-way matching)
create table public.receiving_logs (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id) on delete cascade not null,
  po_id uuid references public.purchase_orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  quantity_received integer not null,
  received_by uuid references public.profiles(id),
  received_at timestamp with time zone default timezone('utc'::text, now()) not null,
  notes text
);

-- RLS & Permissions
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.receiving_logs enable row level security;

-- Policies (Assuming products.manage permission covers procurement)
create policy "Staff can manage suppliers" on suppliers for all 
  using (has_permission(company_id, 'products.manage'));

create policy "Staff can manage POs" on purchase_orders for all 
  using (has_permission(company_id, 'products.manage'));

create policy "Staff can manage PO items" on purchase_order_items for all 
  using (exists (select 1 from purchase_orders where id = purchase_order_items.po_id and has_permission(company_id, 'products.manage')));

create policy "Staff can view receiving logs" on receiving_logs for select 
  using (has_permission(company_id, 'transactions.view'));