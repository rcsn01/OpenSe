CREATE POLICY "Report viewers can view products" ON stoqr.products
  FOR SELECT USING (
    deleted_at IS NULL
    AND (
      app_private.has_permission(company_id, 'reports.view')
      OR app_private.has_permission(company_id, 'dashboard.view')
      OR app_private.has_permission(company_id, 'alerts.view')
    )
  );

CREATE POLICY "Report viewers can view product folder stocks" ON stoqr.product_folder_stocks
  FOR SELECT USING (
    app_private.has_permission(company_id, 'reports.view')
    OR app_private.has_permission(company_id, 'dashboard.view')
    OR app_private.has_permission(company_id, 'alerts.view')
  );

CREATE POLICY "Report viewers can view transactions" ON stoqr.inventory_transactions
  FOR SELECT USING (
    app_private.has_permission(company_id, 'reports.view')
    OR app_private.has_permission(company_id, 'dashboard.view')
  );

CREATE POLICY "Dashboard viewers can view purchase orders" ON stoqr.purchase_orders
  FOR SELECT USING (app_private.has_permission(company_id, 'dashboard.view'));

CREATE POLICY "Users can view own in-app alert deliveries" ON stoqr.alert_delivery_logs
  FOR SELECT USING (
    channel = 'in_app'
    AND recipient = auth.uid()::TEXT
  );

CREATE POLICY "Alert users can view delivered alert events" ON stoqr.alert_events
  FOR SELECT USING (
    app_private.has_permission(company_id, 'alerts.use')
    OR EXISTS (
      SELECT 1
      FROM stoqr.alert_delivery_logs adl
      WHERE adl.alert_event_id = alert_events.id
        AND adl.channel = 'in_app'
        AND adl.recipient = auth.uid()::TEXT
    )
  );
CREATE POLICY "Public read app permissions" ON stoqr.app_permissions
  FOR SELECT USING (true);

CREATE POLICY "Members can view company roles" ON stoqr.roles
  FOR SELECT USING (app_private.is_org_member(company_id, auth.uid()));

CREATE POLICY "Members can view role permissions" ON stoqr.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND app_private.is_org_member(r.company_id, auth.uid())
    )
  );

CREATE POLICY "Users can view their own memberships" ON stoqr.organisation_member_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all members" ON stoqr.organisation_member_roles
  FOR SELECT USING (app_private.has_permission(company_id, 'organisation.view'));

CREATE POLICY "Managers can update members" ON stoqr.organisation_member_roles
  FOR UPDATE USING (
    app_private.has_permission(company_id, 'organisation.members.manage')
    AND NOT (user_id = auth.uid() AND app_private.is_org_owner(company_id, auth.uid()))
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_member_roles.company_id
      )
    )
  )
  WITH CHECK (
    app_private.has_permission(company_id, 'organisation.members.manage')
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
    app_private.has_permission(company_id, 'organisation.members.manage')
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
    app_private.has_permission(company_id, 'organisation.members.manage')
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_member_roles.company_id
      )
    )
  );

CREATE POLICY "Members can view organisation page settings" ON stoqr.organisation_page_settings
  FOR SELECT USING (app_private.has_permission(company_id, 'organisation.view'));

CREATE POLICY "Admins can insert organisation page settings" ON stoqr.organisation_page_settings
  FOR INSERT WITH CHECK (app_private.has_permission(company_id, 'organisation.pages.manage'));

CREATE POLICY "Admins can update organisation page settings" ON stoqr.organisation_page_settings
  FOR UPDATE USING (app_private.has_permission(company_id, 'organisation.pages.manage'))
  WITH CHECK (app_private.has_permission(company_id, 'organisation.pages.manage'));

CREATE POLICY "Members can view folders" ON stoqr.folders
  FOR SELECT USING (app_private.has_permission(company_id, 'inventory.view'));

CREATE POLICY "Staff can manage folders" ON stoqr.folders
  FOR ALL USING (app_private.has_permission(company_id, 'inventory.edit'))
  WITH CHECK (app_private.has_permission(company_id, 'inventory.edit'));

CREATE POLICY "Members can view tags" ON stoqr.tags
  FOR SELECT USING (app_private.has_permission(company_id, 'inventory.view'));

CREATE POLICY "Staff can manage tags" ON stoqr.tags
  FOR ALL USING (app_private.has_permission(company_id, 'inventory.edit'))
  WITH CHECK (app_private.has_permission(company_id, 'inventory.edit'));

CREATE POLICY "Members can view products" ON stoqr.products
  FOR SELECT USING (
    deleted_at IS NULL
    AND app_private.has_permission(company_id, 'inventory.view')
  );

CREATE POLICY "Staff can create products" ON stoqr.products
  FOR INSERT WITH CHECK (app_private.has_permission(company_id, 'inventory.create'));

CREATE POLICY "Staff can edit products" ON stoqr.products
  FOR UPDATE USING (
    app_private.has_permission(company_id, 'inventory.edit')
    OR app_private.has_permission(company_id, 'inventory.adjust')
    OR app_private.has_permission(company_id, 'inventory.import_export')
  )
  WITH CHECK (
    app_private.has_permission(company_id, 'inventory.edit')
    OR app_private.has_permission(company_id, 'inventory.adjust')
    OR app_private.has_permission(company_id, 'inventory.import_export')
  );

CREATE POLICY "Staff can delete products" ON stoqr.products
  FOR DELETE USING (app_private.has_permission(company_id, 'inventory.delete'));

CREATE POLICY "Members can view product barcodes" ON stoqr.product_barcodes
  FOR SELECT USING (app_private.has_permission(company_id, 'inventory.view'));

CREATE POLICY "Staff can manage product barcodes" ON stoqr.product_barcodes
  FOR ALL USING (app_private.has_permission(company_id, 'inventory.edit'))
  WITH CHECK (
    app_private.has_permission(company_id, 'inventory.edit')
    AND EXISTS (
      SELECT 1
      FROM stoqr.products p
      WHERE p.id = product_barcodes.product_id
        AND p.company_id = product_barcodes.company_id
    )
  );

CREATE POLICY "Members can view product tags" ON stoqr.product_tags
  FOR SELECT USING (app_private.has_permission(company_id, 'inventory.view'));

CREATE POLICY "Staff can manage product tags" ON stoqr.product_tags
  FOR ALL USING (app_private.has_permission(company_id, 'inventory.edit'))
  WITH CHECK (
    app_private.has_permission(company_id, 'inventory.edit')
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

CREATE POLICY "Members can view product folder stocks" ON stoqr.product_folder_stocks
  FOR SELECT USING (app_private.has_permission(company_id, 'inventory.view'));

CREATE POLICY "Staff can manage product folder stocks" ON stoqr.product_folder_stocks
  FOR ALL USING (
    app_private.has_permission(company_id, 'inventory.edit')
    OR app_private.has_permission(company_id, 'inventory.adjust')
    OR app_private.has_permission(company_id, 'inventory.import_export')
  )
  WITH CHECK (
    (
      app_private.has_permission(company_id, 'inventory.edit')
      OR app_private.has_permission(company_id, 'inventory.adjust')
      OR app_private.has_permission(company_id, 'inventory.import_export')
    )
    AND EXISTS (
      SELECT 1
      FROM stoqr.products p
      WHERE p.id = product_folder_stocks.product_id
        AND p.company_id = product_folder_stocks.company_id
    )
    AND EXISTS (
      SELECT 1
      FROM stoqr.folders f
      WHERE f.id = product_folder_stocks.folder_id
        AND f.company_id = product_folder_stocks.company_id
    )
  );

CREATE POLICY "Members can view transactions" ON stoqr.inventory_transactions
  FOR SELECT USING (app_private.has_permission(company_id, 'inventory.use'));

CREATE POLICY "Staff can create transactions" ON stoqr.inventory_transactions
  FOR INSERT WITH CHECK (
    app_private.has_permission(company_id, 'inventory.adjust')
    AND EXISTS (
      SELECT 1
      FROM stoqr.products p
      WHERE p.id = inventory_transactions.product_id
        AND p.company_id = inventory_transactions.company_id
    )
    AND (
      folder_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.folders f
        WHERE f.id = inventory_transactions.folder_id
          AND f.company_id = inventory_transactions.company_id
      )
    )
  );

CREATE POLICY "Staff can manage bulk operations" ON stoqr.inventory_bulk_operations
  FOR ALL USING (app_private.has_permission(company_id, 'inventory.import_export'))
  WITH CHECK (app_private.has_permission(company_id, 'inventory.import_export'));

CREATE POLICY "Members can view scan events" ON stoqr.scan_events
  FOR SELECT USING (
    app_private.has_permission(company_id, 'scanner.view')
    OR app_private.has_permission(company_id, 'inventory.use')
  );

CREATE POLICY "Staff can create scan events" ON stoqr.scan_events
  FOR INSERT WITH CHECK (
    (
      app_private.has_permission(company_id, 'scanner.use')
      OR app_private.has_permission(company_id, 'inventory.adjust')
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
    AND (
      folder_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.folders f
        WHERE f.id = scan_events.folder_id
          AND f.company_id = scan_events.company_id
      )
    )
    AND (
      transaction_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.inventory_transactions it
        WHERE it.id = scan_events.transaction_id
          AND it.company_id = scan_events.company_id
      )
    )
  );

CREATE POLICY "Members can view report schedules" ON stoqr.report_schedules
  FOR SELECT USING (app_private.has_permission(company_id, 'reports.view'));

CREATE POLICY "Admins can manage report schedules" ON stoqr.report_schedules
  FOR ALL USING (app_private.has_permission(company_id, 'reports.export'))
  WITH CHECK (app_private.has_permission(company_id, 'reports.export'));

CREATE POLICY "Members can view report exports" ON stoqr.report_exports
  FOR SELECT USING (
    app_private.has_permission(company_id, 'reports.view')
    OR (
      requested_by = auth.uid()
      AND app_private.is_org_member(company_id, auth.uid())
    )
  );

CREATE POLICY "Staff can manage report exports" ON stoqr.report_exports
  FOR ALL USING (app_private.has_permission(company_id, 'reports.export'))
  WITH CHECK (app_private.has_permission(company_id, 'reports.export'));

CREATE POLICY "Members can view suppliers" ON stoqr.suppliers
  FOR SELECT USING (app_private.has_permission(company_id, 'procurement.view'));

CREATE POLICY "Staff can create suppliers" ON stoqr.suppliers
  FOR INSERT WITH CHECK (app_private.has_permission(company_id, 'procurement.create'));

CREATE POLICY "Staff can manage suppliers" ON stoqr.suppliers
  FOR UPDATE USING (app_private.has_permission(company_id, 'procurement.manage'))
  WITH CHECK (app_private.has_permission(company_id, 'procurement.manage'));

CREATE POLICY "Staff can delete suppliers" ON stoqr.suppliers
  FOR DELETE USING (app_private.has_permission(company_id, 'procurement.manage'));

CREATE POLICY "Members can view POs" ON stoqr.purchase_orders
  FOR SELECT USING (app_private.has_permission(company_id, 'procurement.view'));

CREATE POLICY "Staff can create POs" ON stoqr.purchase_orders
  FOR INSERT WITH CHECK (
    app_private.has_permission(company_id, 'procurement.create')
    AND (
      supplier_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.suppliers s
        WHERE s.id = purchase_orders.supplier_id
          AND s.company_id = purchase_orders.company_id
      )
    )
  );

CREATE POLICY "Staff can manage POs" ON stoqr.purchase_orders
  FOR UPDATE USING (
    app_private.has_permission(company_id, 'procurement.manage')
    OR app_private.has_permission(company_id, 'procurement.receive')
  )
  WITH CHECK (
    (
      app_private.has_permission(company_id, 'procurement.manage')
      OR app_private.has_permission(company_id, 'procurement.receive')
    )
    AND (
      supplier_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.suppliers s
        WHERE s.id = purchase_orders.supplier_id
          AND s.company_id = purchase_orders.company_id
      )
    )
  );

CREATE POLICY "Staff can delete POs" ON stoqr.purchase_orders
  FOR DELETE USING (app_private.has_permission(company_id, 'procurement.manage'));

CREATE POLICY "Members can view PO items" ON stoqr.purchase_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND app_private.has_permission(po.company_id, 'procurement.view')
    )
  );

CREATE POLICY "Staff can create PO items" ON stoqr.purchase_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND app_private.has_permission(po.company_id, 'procurement.create')
        AND (
          purchase_order_items.product_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM stoqr.products p
            WHERE p.id = purchase_order_items.product_id
              AND p.company_id = po.company_id
          )
        )
    )
  );

CREATE POLICY "Staff can manage PO items" ON stoqr.purchase_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          app_private.has_permission(po.company_id, 'procurement.manage')
          OR app_private.has_permission(po.company_id, 'procurement.receive')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND (
          app_private.has_permission(po.company_id, 'procurement.manage')
          OR app_private.has_permission(po.company_id, 'procurement.receive')
        )
        AND (
          purchase_order_items.product_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM stoqr.products p
            WHERE p.id = purchase_order_items.product_id
              AND p.company_id = po.company_id
          )
        )
    )
  );

CREATE POLICY "Staff can delete PO items" ON stoqr.purchase_order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM stoqr.purchase_orders po
      WHERE po.id = purchase_order_items.po_id
        AND app_private.has_permission(po.company_id, 'procurement.manage')
    )
  );

CREATE POLICY "Staff can view receiving logs" ON stoqr.receiving_logs
  FOR SELECT USING (
    app_private.has_permission(company_id, 'procurement.view')
  );

CREATE POLICY "Staff can manage receiving logs" ON stoqr.receiving_logs
  FOR INSERT WITH CHECK (
    app_private.has_permission(company_id, 'procurement.receive')
    AND (
      po_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.purchase_orders po
        WHERE po.id = receiving_logs.po_id
          AND po.company_id = receiving_logs.company_id
      )
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.products p
        WHERE p.id = receiving_logs.product_id
          AND p.company_id = receiving_logs.company_id
      )
    )
  );

CREATE POLICY "Members can view alert rules" ON stoqr.alert_rules
  FOR SELECT USING (
    app_private.has_permission(company_id, 'alerts.view')
    OR app_private.has_permission(company_id, 'alerts.manage')
  );

CREATE POLICY "Staff can manage alert rules" ON stoqr.alert_rules
  FOR ALL USING (app_private.has_permission(company_id, 'alerts.manage'))
  WITH CHECK (app_private.has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view alert events" ON stoqr.alert_events
  FOR SELECT USING (
    app_private.has_permission(company_id, 'alerts.view')
    OR app_private.has_permission(company_id, 'alerts.manage')
    OR app_private.has_permission(company_id, 'dashboard.view')
  );

CREATE POLICY "Staff can manage alert events" ON stoqr.alert_events
  FOR ALL USING (
    app_private.has_permission(company_id, 'alerts.manage')
    OR app_private.has_permission(company_id, 'alerts.use')
  )
  WITH CHECK (
    (
      app_private.has_permission(company_id, 'alerts.manage')
      OR app_private.has_permission(company_id, 'alerts.use')
    )
    AND (
      rule_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.alert_rules ar
        WHERE ar.id = alert_events.rule_id
          AND ar.company_id = alert_events.company_id
      )
    )
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.products p
        WHERE p.id = alert_events.product_id
          AND p.company_id = alert_events.company_id
      )
    )
    AND (
      folder_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.folders f
        WHERE f.id = alert_events.folder_id
          AND f.company_id = alert_events.company_id
      )
    )
  );

CREATE POLICY "Staff can view alert deliveries" ON stoqr.alert_delivery_logs
  FOR SELECT USING (app_private.has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view alert connectors" ON stoqr.alert_connectors
  FOR SELECT USING (
    app_private.has_permission(company_id, 'alerts.view')
    OR app_private.has_permission(company_id, 'alerts.manage')
  );

CREATE POLICY "Staff can manage alert connectors" ON stoqr.alert_connectors
  FOR ALL USING (app_private.has_permission(company_id, 'alerts.manage'))
  WITH CHECK (app_private.has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view alert connector targets" ON stoqr.alert_connector_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM stoqr.alert_connectors ac
      WHERE ac.id = alert_connector_targets.connector_id
        AND (
          app_private.has_permission(ac.company_id, 'alerts.view')
          OR app_private.has_permission(ac.company_id, 'alerts.manage')
        )
    )
  );

CREATE POLICY "Staff can manage alert connector targets" ON stoqr.alert_connector_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM stoqr.alert_connectors ac
      WHERE ac.id = alert_connector_targets.connector_id
        AND app_private.has_permission(ac.company_id, 'alerts.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.alert_connectors ac
      WHERE ac.id = alert_connector_targets.connector_id
        AND app_private.has_permission(ac.company_id, 'alerts.manage')
    )
  );

CREATE POLICY "Members can view alert rule connector targets" ON stoqr.alert_rule_connector_targets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM stoqr.alert_rules ar
      WHERE ar.id = alert_rule_connector_targets.rule_id
        AND (
          app_private.has_permission(ar.company_id, 'alerts.view')
          OR app_private.has_permission(ar.company_id, 'alerts.manage')
        )
    )
  );

CREATE POLICY "Staff can manage alert rule connector targets" ON stoqr.alert_rule_connector_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM stoqr.alert_rules ar
      WHERE ar.id = alert_rule_connector_targets.rule_id
        AND app_private.has_permission(ar.company_id, 'alerts.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM stoqr.alert_rules ar
      JOIN stoqr.alert_connector_targets act ON act.id = alert_rule_connector_targets.target_id
      JOIN stoqr.alert_connectors ac ON ac.id = act.connector_id
      WHERE ar.id = alert_rule_connector_targets.rule_id
        AND ar.company_id = ac.company_id
        AND app_private.has_permission(ar.company_id, 'alerts.manage')
    )
  );

CREATE POLICY "Members can view activity events" ON stoqr.activity_events
  FOR SELECT USING (
    app_private.has_permission(company_id, 'organisation.activity.view')
    OR app_private.has_permission(company_id, 'organisation.view')
  );

CREATE POLICY "Members can view label templates" ON stoqr.label_templates
  FOR SELECT USING (
    company_id IS NULL
    OR app_private.has_permission(company_id, 'labels.view')
  );

CREATE POLICY "Staff can manage label templates" ON stoqr.label_templates
  FOR ALL USING (
    company_id IS NOT NULL
    AND app_private.has_permission(company_id, 'labels.manage')
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND app_private.has_permission(company_id, 'labels.manage')
  );

CREATE POLICY "Staff can manage label print jobs" ON stoqr.label_print_jobs
  FOR ALL USING (
    app_private.has_permission(company_id, 'labels.use')
    OR app_private.has_permission(company_id, 'labels.manage')
  )
  WITH CHECK (
    (
      app_private.has_permission(company_id, 'labels.use')
      OR app_private.has_permission(company_id, 'labels.manage')
    )
    AND (
      template_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM stoqr.label_templates lt
        WHERE lt.id = label_print_jobs.template_id
          AND (lt.company_id IS NULL OR lt.company_id = label_print_jobs.company_id)
      )
    )
  );

CREATE POLICY "Give users access to their company folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text
      FROM stoqr.organisation_member_roles
      WHERE user_id = auth.uid()
        AND (
          app_private.has_permission(company_id, 'inventory.create')
          OR app_private.has_permission(company_id, 'inventory.edit')
        )
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
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.product_folder_stocks TO authenticated;
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
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.alert_connectors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.alert_connector_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE stoqr.alert_rule_connector_targets TO authenticated;
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
GRANT ALL PRIVILEGES ON TABLE stoqr.product_folder_stocks TO service_role;
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
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_connectors TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_connector_targets TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_rule_connector_targets TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.alert_dispatch_config TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.activity_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.label_templates TO service_role;
GRANT ALL PRIVILEGES ON TABLE stoqr.label_print_jobs TO service_role;
GRANT ALL PRIVILEGES ON SEQUENCE stoqr.purchase_orders_po_number_seq TO service_role;

REVOKE ALL ON FUNCTION public.map_stoqr_role_to_org_role(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pick_stoqr_role_for_org_member(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pick_next_stoqr_role(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_stoqr_guest_role(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_owner_app_roles(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.prevent_owner_role_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.prevent_owner_role_permission_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_new_permission_to_owner_roles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_org_owner_member_and_default_seats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.has_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.update_inventory_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.folder_path_name(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.sync_product_stock_total() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.evaluate_low_stock_alerts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.log_activity_event(UUID, TEXT, TEXT, UUID, TEXT, JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.capture_activity_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_stoqr_report_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_stoqr_pending_email_alerts(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_stoqr_alert_email_delivery(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_stoqr_alert_notification_dispatch(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_stoqr_pending_alert_notifications(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_stoqr_alert_notification_delivery(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION app_private.has_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION stoqr.folder_path_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_stoqr_report_export(UUID, TEXT, TEXT, DATE, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stoqr_pending_email_alerts(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_stoqr_alert_email_delivery(UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_stoqr_pending_alert_notifications(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_stoqr_alert_notification_delivery(UUID, TEXT, TEXT, TEXT) TO service_role;

-- These StoQR functions are trigger-only helpers for product identity bookkeeping.
-- Direct Data API/RPC execution is intentionally blocked for client roles.
REVOKE ALL ON FUNCTION stoqr.normalize_product_identity_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION stoqr.sync_product_barcode_identities() FROM PUBLIC, anon, authenticated;

-- Future functions in exposed schemas should opt in to client EXECUTE grants explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA etl REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA stoqr REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

CREATE POLICY alert_dispatch_config_deny_client_access
ON stoqr.alert_dispatch_config
FOR ALL
USING (false)
WITH CHECK (false);
