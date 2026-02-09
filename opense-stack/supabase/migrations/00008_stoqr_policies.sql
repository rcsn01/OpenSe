-- ============================================================
-- Migration 0008: StoQR Policies
-- ============================================================

-- App Permissions (public read)
CREATE POLICY "Public read app permissions" ON stoqr.app_permissions
  FOR SELECT USING (true);

-- Companies
CREATE POLICY "Authenticated users can create companies" ON stoqr.companies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Members can view their company" ON stoqr.companies
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM stoqr.company_members
      WHERE company_id = companies.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update company" ON stoqr.companies
  FOR UPDATE USING (
    deleted_at IS NULL
    AND has_permission(id, 'company.manage')
  );

-- Roles
CREATE POLICY "Members can view company roles" ON stoqr.roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stoqr.company_members
      WHERE user_id = auth.uid() AND company_id = roles.company_id
    )
  );

CREATE POLICY "Admins can manage roles" ON stoqr.roles
  FOR ALL USING (has_permission(company_id, 'roles.manage'));

-- Role Permissions
CREATE POLICY "Members can view role permissions" ON stoqr.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stoqr.roles r
      JOIN stoqr.company_members cm ON r.company_id = cm.company_id
      WHERE r.id = role_permissions.role_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage role permissions" ON stoqr.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND has_permission(r.company_id, 'roles.manage')
    )
  );

-- Products
CREATE POLICY "Members can view products" ON stoqr.products
  FOR SELECT USING (
    deleted_at IS NULL
    AND has_permission(company_id, 'products.view')
  );

CREATE POLICY "Staff can manage products" ON stoqr.products
  FOR ALL USING (has_permission(company_id, 'products.manage'));

-- Inventory Transactions
CREATE POLICY "Members can view transactions" ON stoqr.inventory_transactions
  FOR SELECT USING (has_permission(company_id, 'transactions.view'));

CREATE POLICY "Staff can create transactions" ON stoqr.inventory_transactions
  FOR INSERT WITH CHECK (has_permission(company_id, 'transactions.create'));

-- Folders
CREATE POLICY "Members can view folders" ON stoqr.folders
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage folders" ON stoqr.folders
  FOR ALL USING (has_permission(company_id, 'products.manage'));

-- Tags
CREATE POLICY "Members can view tags" ON stoqr.tags
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage tags" ON stoqr.tags
  FOR ALL USING (has_permission(company_id, 'products.manage'));

-- Company Members
CREATE POLICY "Users can view their own memberships" ON stoqr.company_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all members" ON stoqr.company_members
  FOR SELECT USING (has_permission(company_id, 'members.view'));

-- Invitations
CREATE POLICY "Managers can view and create invitations" ON stoqr.company_invitations
  FOR ALL USING (has_permission(company_id, 'members.manage'));

-- Report Schedules
CREATE POLICY "Members can view report schedules" ON stoqr.report_schedules
  FOR SELECT USING (has_permission(company_id, 'transactions.view'));

CREATE POLICY "Admins can manage report schedules" ON stoqr.report_schedules
  FOR ALL USING (has_permission(company_id, 'company.manage'))
  WITH CHECK (has_permission(company_id, 'company.manage'));

-- Suppliers
CREATE POLICY "Staff can manage suppliers" ON stoqr.suppliers
  FOR ALL USING (has_permission(company_id, 'products.manage'));

-- Purchase Orders
CREATE POLICY "Staff can manage POs" ON stoqr.purchase_orders
  FOR ALL USING (has_permission(company_id, 'products.manage'));

-- PO Items
CREATE POLICY "Staff can manage PO items" ON stoqr.purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stoqr.purchase_orders
      WHERE id = purchase_order_items.po_id
        AND has_permission(company_id, 'products.manage')
    )
  );

-- Receiving Logs
CREATE POLICY "Staff can view receiving logs" ON stoqr.receiving_logs
  FOR SELECT USING (has_permission(company_id, 'transactions.view'));

-- Storage Policies
CREATE POLICY "Give users access to their company folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM stoqr.company_members
      WHERE user_id = auth.uid()
        AND has_permission(company_id, 'products.manage')
    )
  );

CREATE POLICY "Users can view images from their company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM stoqr.company_members
      WHERE user_id = auth.uid()
    )
  );
