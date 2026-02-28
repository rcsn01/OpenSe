-- ============================================================
-- Baseline: RLS Policies (Public + ETL + StoQR + Storage)
-- ============================================================

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
DROP POLICY IF EXISTS super_admin_members_select ON public.super_admin_members;
DROP POLICY IF EXISTS super_admin_members_insert ON public.super_admin_members;
DROP POLICY IF EXISTS super_admin_members_update ON public.super_admin_members;
DROP POLICY IF EXISTS super_admin_members_delete ON public.super_admin_members;

CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY super_admin_members_select ON public.super_admin_members
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY super_admin_members_insert ON public.super_admin_members
  FOR INSERT WITH CHECK (public.is_app_super_admin());

CREATE POLICY super_admin_members_update ON public.super_admin_members
  FOR UPDATE USING (public.is_app_super_admin());

CREATE POLICY super_admin_members_delete ON public.super_admin_members
  FOR DELETE USING (public.is_app_super_admin());

DROP POLICY IF EXISTS organisations_select ON public.organisations;
DROP POLICY IF EXISTS organisations_insert ON public.organisations;
DROP POLICY IF EXISTS organisations_update ON public.organisations;
DROP POLICY IF EXISTS organisations_delete ON public.organisations;

CREATE POLICY organisations_select ON public.organisations
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.is_org_member(id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisations_insert ON public.organisations
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    OR public.is_app_super_admin()
  );

CREATE POLICY organisations_update ON public.organisations
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.is_org_admin(id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisations_delete ON public.organisations
  FOR DELETE USING (
    owner_id = auth.uid()
    OR public.is_app_super_admin()
  );

DROP POLICY IF EXISTS organisation_members_select ON public.organisation_members;
DROP POLICY IF EXISTS organisation_members_insert ON public.organisation_members;
DROP POLICY IF EXISTS organisation_members_update ON public.organisation_members;
DROP POLICY IF EXISTS organisation_members_delete ON public.organisation_members;

CREATE POLICY organisation_members_select ON public.organisation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_members_insert ON public.organisation_members
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_members_update ON public.organisation_members
  FOR UPDATE USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_members_delete ON public.organisation_members
  FOR DELETE USING (
    (public.is_org_admin(org_id, auth.uid()) OR public.is_app_super_admin())
    AND NOT (role = 'owner' AND user_id = (SELECT owner_id FROM public.organisations o WHERE o.id = organisation_members.org_id))
  );

DROP POLICY IF EXISTS apps_select ON public.apps;
DROP POLICY IF EXISTS app_seats_select ON public.organisation_app_seats;
DROP POLICY IF EXISTS app_seats_manage ON public.organisation_app_seats;
DROP POLICY IF EXISTS member_app_seats_select ON public.organisation_member_app_seats;
DROP POLICY IF EXISTS member_app_seats_manage ON public.organisation_member_app_seats;

CREATE POLICY apps_select ON public.apps
  FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY app_seats_select ON public.organisation_app_seats
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY app_seats_manage ON public.organisation_app_seats
  FOR ALL USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY member_app_seats_select ON public.organisation_member_app_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (om.user_id = auth.uid() OR public.is_org_member(om.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  );

CREATE POLICY member_app_seats_manage ON public.organisation_member_app_seats
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (public.is_org_admin(om.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (public.is_org_admin(om.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  );

DROP POLICY IF EXISTS organisation_invites_select_own ON public.organisation_invites;
DROP POLICY IF EXISTS organisation_invites_select_admin ON public.organisation_invites;
DROP POLICY IF EXISTS organisation_invites_insert_admin ON public.organisation_invites;
DROP POLICY IF EXISTS organisation_invites_delete_admin_or_user ON public.organisation_invites;
DROP POLICY IF EXISTS subscriptions_select ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_manage ON public.subscriptions;

CREATE POLICY organisation_invites_select_own ON public.organisation_invites
  FOR SELECT USING (email = (SELECT auth.jwt() ->> 'email'));

CREATE POLICY organisation_invites_select_admin ON public.organisation_invites
  FOR SELECT USING (
    public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_invites_insert_admin ON public.organisation_invites
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY organisation_invites_delete_admin_or_user ON public.organisation_invites
  FOR DELETE USING (
    public.is_org_admin(org_id, (SELECT auth.uid()))
    OR public.is_org_owner(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
    OR email = (SELECT auth.jwt() ->> 'email')
  );

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (
    public.is_org_member(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY subscriptions_manage ON public.subscriptions
  FOR ALL USING (
    public.is_org_owner_strictly(org_id, auth.uid())
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    public.is_org_owner_strictly(org_id, auth.uid())
    OR public.is_app_super_admin()
  );

DROP POLICY IF EXISTS etl_app_permissions_select ON etl.app_permissions;
DROP POLICY IF EXISTS etl_roles_select ON etl.roles;
DROP POLICY IF EXISTS etl_roles_manage ON etl.roles;
DROP POLICY IF EXISTS etl_role_permissions_select ON etl.role_permissions;
DROP POLICY IF EXISTS etl_role_permissions_manage ON etl.role_permissions;
DROP POLICY IF EXISTS etl_member_roles_select ON etl.organisation_member_roles;
DROP POLICY IF EXISTS etl_member_roles_manage ON etl.organisation_member_roles;
DROP POLICY IF EXISTS workflows_select_unified ON etl.workflows;
DROP POLICY IF EXISTS workflows_insert_owner_only ON etl.workflows;
DROP POLICY IF EXISTS workflows_update_owner_or_member ON etl.workflows;
DROP POLICY IF EXISTS workflows_delete_owner_or_member ON etl.workflows;
DROP POLICY IF EXISTS workflow_executions_select_unified ON etl.workflow_executions;
DROP POLICY IF EXISTS workflow_executions_insert_self ON etl.workflow_executions;
DROP POLICY IF EXISTS workflow_executions_super_admin_select ON etl.workflow_executions;
DROP POLICY IF EXISTS versions_select ON etl.workflow_versions;
DROP POLICY IF EXISTS versions_insert ON etl.workflow_versions;
DROP POLICY IF EXISTS notifications_select ON etl.notification_settings;
DROP POLICY IF EXISTS notifications_insert ON etl.notification_settings;
DROP POLICY IF EXISTS notifications_update ON etl.notification_settings;
DROP POLICY IF EXISTS notifications_delete ON etl.notification_settings;

CREATE POLICY etl_app_permissions_select ON etl.app_permissions
  FOR SELECT USING (true);

CREATE POLICY etl_roles_select ON etl.roles
  FOR SELECT USING (
    public.is_org_member(roles.org_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY etl_roles_manage ON etl.roles
  FOR ALL USING (
    public.has_etl_permission(org_id, 'roles.manage')
    OR public.is_app_super_admin()
  )
  WITH CHECK (
    public.has_etl_permission(org_id, 'roles.manage')
    OR public.is_app_super_admin()
  );

CREATE POLICY etl_role_permissions_select ON etl.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND (public.is_org_member(r.org_id, auth.uid()) OR public.is_app_super_admin())
    )
  );

CREATE POLICY etl_role_permissions_manage ON etl.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND (public.has_etl_permission(r.org_id, 'roles.manage') OR public.is_app_super_admin())
    )
  );

CREATE POLICY etl_member_roles_select ON etl.organisation_member_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND (om.user_id = auth.uid() OR public.has_etl_permission(om.org_id, 'roles.manage') OR public.is_app_super_admin())
    )
  );

CREATE POLICY etl_member_roles_manage ON etl.organisation_member_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND (public.has_etl_permission(om.org_id, 'roles.manage') OR public.is_app_super_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND (public.has_etl_permission(om.org_id, 'roles.manage') OR public.is_app_super_admin())
    )
  );

CREATE POLICY workflows_select_unified ON etl.workflows
  FOR SELECT USING (
    (org_id IS NULL AND owner_id = (SELECT auth.uid()))
    OR public.has_etl_permission(org_id, 'workflows.view')
    OR public.is_app_super_admin()
  );

CREATE POLICY workflows_insert_owner_only ON etl.workflows
  FOR INSERT WITH CHECK (
    (org_id IS NULL AND (SELECT auth.uid()) = owner_id)
    OR (org_id IS NOT NULL AND public.has_etl_permission(org_id, 'workflows.manage'))
    OR public.is_app_super_admin()
  );

CREATE POLICY workflows_update_owner_or_member ON etl.workflows
  FOR UPDATE USING (
    (SELECT auth.uid()) = owner_id
    OR public.has_etl_permission(org_id, 'workflows.manage')
    OR public.is_app_super_admin()
  );

CREATE POLICY workflows_delete_owner_or_member ON etl.workflows
  FOR DELETE USING (
    (SELECT auth.uid()) = owner_id
    OR public.has_etl_permission(org_id, 'workflows.manage')
    OR public.is_app_super_admin()
  );

CREATE POLICY workflow_executions_select_unified ON etl.workflow_executions
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.has_etl_permission(org_id, 'executions.view')
    OR public.is_app_super_admin()
  );

CREATE POLICY workflow_executions_insert_self ON etl.workflow_executions
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      org_id IS NULL
      OR public.has_etl_permission(org_id, 'executions.run')
      OR public.is_app_super_admin()
    )
  );

CREATE POLICY workflow_executions_super_admin_select ON etl.workflow_executions
  FOR SELECT USING (public.is_app_super_admin());

CREATE POLICY versions_select ON etl.workflow_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR public.has_etl_permission(w.org_id, 'workflows.view')
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY versions_insert ON etl.workflow_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR public.has_etl_permission(w.org_id, 'workflows.manage')
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY notifications_select ON etl.notification_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY notifications_insert ON etl.notification_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY notifications_update ON etl.notification_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
          OR public.is_app_super_admin()
        )
    )
  );

CREATE POLICY notifications_delete ON etl.notification_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          w.owner_id = auth.uid()
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
          OR public.is_app_super_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Public read app permissions" ON stoqr.app_permissions;
DROP POLICY IF EXISTS "Members can view company roles" ON stoqr.roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON stoqr.roles;
DROP POLICY IF EXISTS "Members can view role permissions" ON stoqr.role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON stoqr.role_permissions;
DROP POLICY IF EXISTS "Members can view products" ON stoqr.products;
DROP POLICY IF EXISTS "Staff can manage products" ON stoqr.products;
DROP POLICY IF EXISTS "Members can view categories" ON stoqr.product_categories;
DROP POLICY IF EXISTS "Staff can manage categories" ON stoqr.product_categories;
DROP POLICY IF EXISTS "Members can view locations" ON stoqr.inventory_locations;
DROP POLICY IF EXISTS "Staff can manage locations" ON stoqr.inventory_locations;
DROP POLICY IF EXISTS "Members can view product barcodes" ON stoqr.product_barcodes;
DROP POLICY IF EXISTS "Staff can manage product barcodes" ON stoqr.product_barcodes;
DROP POLICY IF EXISTS "Members can view transactions" ON stoqr.inventory_transactions;
DROP POLICY IF EXISTS "Staff can create transactions" ON stoqr.inventory_transactions;
DROP POLICY IF EXISTS "Staff can manage bulk operations" ON stoqr.inventory_bulk_operations;
DROP POLICY IF EXISTS "Members can view scan events" ON stoqr.scan_events;
DROP POLICY IF EXISTS "Staff can create scan events" ON stoqr.scan_events;
DROP POLICY IF EXISTS "Members can view folders" ON stoqr.folders;
DROP POLICY IF EXISTS "Staff can manage folders" ON stoqr.folders;
DROP POLICY IF EXISTS "Members can view tags" ON stoqr.tags;
DROP POLICY IF EXISTS "Staff can manage tags" ON stoqr.tags;
DROP POLICY IF EXISTS "Users can view their own memberships" ON stoqr.organisation_member_roles;
DROP POLICY IF EXISTS "Managers can view all members" ON stoqr.organisation_member_roles;
DROP POLICY IF EXISTS "Members can view report schedules" ON stoqr.report_schedules;
DROP POLICY IF EXISTS "Admins can manage report schedules" ON stoqr.report_schedules;
DROP POLICY IF EXISTS "Members can view report exports" ON stoqr.report_exports;
DROP POLICY IF EXISTS "Staff can manage report exports" ON stoqr.report_exports;
DROP POLICY IF EXISTS "Staff can manage suppliers" ON stoqr.suppliers;
DROP POLICY IF EXISTS "Staff can manage POs" ON stoqr.purchase_orders;
DROP POLICY IF EXISTS "Staff can manage PO items" ON stoqr.purchase_order_items;
DROP POLICY IF EXISTS "Staff can view receiving logs" ON stoqr.receiving_logs;
DROP POLICY IF EXISTS "Staff can manage receiving logs" ON stoqr.receiving_logs;
DROP POLICY IF EXISTS "Members can view alert rules" ON stoqr.alert_rules;
DROP POLICY IF EXISTS "Staff can manage alert rules" ON stoqr.alert_rules;
DROP POLICY IF EXISTS "Members can view alert events" ON stoqr.alert_events;
DROP POLICY IF EXISTS "Staff can manage alert events" ON stoqr.alert_events;
DROP POLICY IF EXISTS "Staff can view alert deliveries" ON stoqr.alert_delivery_logs;
DROP POLICY IF EXISTS "Members can view activity events" ON stoqr.activity_events;
DROP POLICY IF EXISTS "Members can view label templates" ON stoqr.label_templates;
DROP POLICY IF EXISTS "Staff can manage label templates" ON stoqr.label_templates;
DROP POLICY IF EXISTS "Staff can manage label print jobs" ON stoqr.label_print_jobs;
DROP POLICY IF EXISTS "Give users access to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view images from their company" ON storage.objects;

CREATE POLICY "Public read app permissions" ON stoqr.app_permissions
  FOR SELECT USING (true);

CREATE POLICY "Members can view company roles" ON stoqr.roles
  FOR SELECT USING (
    public.is_org_member(roles.company_id, auth.uid())
    OR public.is_app_super_admin()
  );

CREATE POLICY "Admins can manage roles" ON stoqr.roles
  FOR ALL USING (has_permission(company_id, 'roles.manage'));

CREATE POLICY "Members can view role permissions" ON stoqr.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND (public.is_org_member(r.company_id, auth.uid()) OR public.is_app_super_admin())
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

CREATE POLICY "Members can view products" ON stoqr.products
  FOR SELECT USING (
    deleted_at IS NULL
    AND has_permission(company_id, 'products.view')
  );

CREATE POLICY "Staff can manage products" ON stoqr.products
  FOR ALL USING (has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view categories" ON stoqr.product_categories
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage categories" ON stoqr.product_categories
  FOR ALL USING (has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view locations" ON stoqr.inventory_locations
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage locations" ON stoqr.inventory_locations
  FOR ALL USING (has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view product barcodes" ON stoqr.product_barcodes
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage product barcodes" ON stoqr.product_barcodes
  FOR ALL USING (has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view transactions" ON stoqr.inventory_transactions
  FOR SELECT USING (has_permission(company_id, 'transactions.view'));

CREATE POLICY "Staff can create transactions" ON stoqr.inventory_transactions
  FOR INSERT WITH CHECK (has_permission(company_id, 'transactions.create'));

CREATE POLICY "Staff can manage bulk operations" ON stoqr.inventory_bulk_operations
  FOR ALL USING (has_permission(company_id, 'inventory.bulk_manage'));

CREATE POLICY "Members can view scan events" ON stoqr.scan_events
  FOR SELECT USING (
    has_permission(company_id, 'scanner.use')
    OR has_permission(company_id, 'transactions.view')
  );

CREATE POLICY "Staff can create scan events" ON stoqr.scan_events
  FOR INSERT WITH CHECK (
    has_permission(company_id, 'scanner.use')
    OR has_permission(company_id, 'transactions.create')
  );

CREATE POLICY "Members can view folders" ON stoqr.folders
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage folders" ON stoqr.folders
  FOR ALL USING (has_permission(company_id, 'products.manage'));

CREATE POLICY "Members can view tags" ON stoqr.tags
  FOR SELECT USING (has_permission(company_id, 'products.view'));

CREATE POLICY "Staff can manage tags" ON stoqr.tags
  FOR ALL USING (has_permission(company_id, 'products.manage'));

CREATE POLICY "Users can view their own memberships" ON stoqr.organisation_member_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view all members" ON stoqr.organisation_member_roles
  FOR SELECT USING (has_permission(company_id, 'members.view'));

CREATE POLICY "Members can view report schedules" ON stoqr.report_schedules
  FOR SELECT USING (has_permission(company_id, 'reports.view'));

CREATE POLICY "Admins can manage report schedules" ON stoqr.report_schedules
  FOR ALL USING (has_permission(company_id, 'reports.export'))
  WITH CHECK (has_permission(company_id, 'reports.export'));

CREATE POLICY "Members can view report exports" ON stoqr.report_exports
  FOR SELECT USING (
    has_permission(company_id, 'reports.view')
    OR requested_by = auth.uid()
  );

CREATE POLICY "Staff can manage report exports" ON stoqr.report_exports
  FOR ALL USING (has_permission(company_id, 'reports.export'))
  WITH CHECK (has_permission(company_id, 'reports.export'));

CREATE POLICY "Staff can manage suppliers" ON stoqr.suppliers
  FOR ALL USING (
    has_permission(company_id, 'procurement.manage')
    OR has_permission(company_id, 'products.manage')
  );

CREATE POLICY "Staff can manage POs" ON stoqr.purchase_orders
  FOR ALL USING (
    has_permission(company_id, 'procurement.manage')
    OR has_permission(company_id, 'products.manage')
  );

CREATE POLICY "Staff can manage PO items" ON stoqr.purchase_order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stoqr.purchase_orders
      WHERE id = purchase_order_items.po_id
        AND (
          has_permission(company_id, 'procurement.manage')
          OR has_permission(company_id, 'products.manage')
        )
    )
  );

CREATE POLICY "Staff can view receiving logs" ON stoqr.receiving_logs
  FOR SELECT USING (
    has_permission(company_id, 'transactions.view')
    OR has_permission(company_id, 'procurement.manage')
  );

CREATE POLICY "Staff can manage receiving logs" ON stoqr.receiving_logs
  FOR INSERT WITH CHECK (
    has_permission(company_id, 'procurement.manage')
    OR has_permission(company_id, 'products.manage')
  );

CREATE POLICY "Members can view alert rules" ON stoqr.alert_rules
  FOR SELECT USING (
    has_permission(company_id, 'alerts.view')
    OR has_permission(company_id, 'alerts.manage')
  );

CREATE POLICY "Staff can manage alert rules" ON stoqr.alert_rules
  FOR ALL USING (has_permission(company_id, 'alerts.manage'))
  WITH CHECK (has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view alert events" ON stoqr.alert_events
  FOR SELECT USING (
    has_permission(company_id, 'alerts.view')
    OR has_permission(company_id, 'alerts.manage')
    OR has_permission(company_id, 'dashboard.view')
  );

CREATE POLICY "Staff can manage alert events" ON stoqr.alert_events
  FOR ALL USING (has_permission(company_id, 'alerts.manage'))
  WITH CHECK (has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Staff can view alert deliveries" ON stoqr.alert_delivery_logs
  FOR SELECT USING (has_permission(company_id, 'alerts.manage'));

CREATE POLICY "Members can view activity events" ON stoqr.activity_events
  FOR SELECT USING (
    has_permission(company_id, 'activity.view')
    OR has_permission(company_id, 'members.view')
  );

CREATE POLICY "Members can view label templates" ON stoqr.label_templates
  FOR SELECT USING (
    company_id IS NULL
    OR has_permission(company_id, 'products.view')
  );

CREATE POLICY "Staff can manage label templates" ON stoqr.label_templates
  FOR ALL USING (
    company_id IS NOT NULL
    AND has_permission(company_id, 'labels.manage')
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND has_permission(company_id, 'labels.manage')
  );

CREATE POLICY "Staff can manage label print jobs" ON stoqr.label_print_jobs
  FOR ALL USING (has_permission(company_id, 'labels.manage'))
  WITH CHECK (has_permission(company_id, 'labels.manage'));

CREATE POLICY "Give users access to their company folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM stoqr.organisation_member_roles
      WHERE user_id = auth.uid()
        AND has_permission(company_id, 'products.manage')
    )
  );

CREATE POLICY "Users can view images from their company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM stoqr.organisation_member_roles
      WHERE user_id = auth.uid()
    )
  );
