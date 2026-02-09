-- ============================================================
-- Migration 0007: StoQR Functions & Triggers
-- ============================================================

-- ─── StoQR Permission Helper ────────────────────────

CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM stoqr.company_members cm
    JOIN stoqr.role_permissions rp ON cm.role_id = rp.role_id
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = _company_id
      AND rp.permission_code = _permission_code
  );
END;
$$;

-- Company creation trigger - auto-assigns creator as Owner
CREATE OR REPLACE FUNCTION stoqr.add_creator_as_admin()
RETURNS TRIGGER AS $$
DECLARE
  owner_role_id UUID;
BEGIN
  INSERT INTO stoqr.roles (company_id, name, description)
  VALUES (NEW.id, 'Owner', 'Company Administrator')
  RETURNING id INTO owner_role_id;

  INSERT INTO stoqr.role_permissions (role_id, permission_code)
  SELECT owner_role_id, code FROM stoqr.app_permissions;

  INSERT INTO stoqr.company_members (user_id, company_id, role_id)
  VALUES (auth.uid(), NEW.id, owner_role_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_company_created
  AFTER INSERT ON stoqr.companies
  FOR EACH ROW EXECUTE PROCEDURE stoqr.add_creator_as_admin();

-- Inventory sync trigger (concurrency safe)
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

  -- Lock the product row to prevent race conditions
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

CREATE TRIGGER on_inventory_transaction
  BEFORE INSERT ON stoqr.inventory_transactions
  FOR EACH ROW EXECUTE PROCEDURE stoqr.update_inventory_count();
