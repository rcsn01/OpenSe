-- Remove database-level super-admin authorization.
--
-- Platform-owned data stays in public but is accessible only through the
-- local service-role admin API.

ALTER TABLE IF EXISTS public.admin_app_health_snapshots RENAME TO platform_app_health_snapshots;
ALTER TABLE IF EXISTS public.admin_pricing_plans RENAME TO platform_pricing_plans;
ALTER TABLE IF EXISTS public.admin_coupons RENAME TO platform_coupons;
ALTER TABLE IF EXISTS public.admin_feature_flags RENAME TO platform_feature_flags;
ALTER TABLE IF EXISTS public.admin_default_configurations RENAME TO platform_default_configurations;
ALTER TABLE IF EXISTS public.admin_release_notes RENAME TO platform_release_notes;
ALTER TABLE IF EXISTS public.platform_admin_audit_events RENAME TO platform_audit_events;

ALTER INDEX IF EXISTS admin_app_health_snapshots_app_code_measured_at_idx RENAME TO platform_app_health_snapshots_app_code_measured_at_idx;
ALTER INDEX IF EXISTS admin_pricing_plans_active_idx RENAME TO platform_pricing_plans_active_idx;
ALTER INDEX IF EXISTS admin_coupons_active_idx RENAME TO platform_coupons_active_idx;
ALTER INDEX IF EXISTS admin_feature_flags_app_code_idx RENAME TO platform_feature_flags_app_code_idx;
ALTER INDEX IF EXISTS admin_default_configurations_app_code_idx RENAME TO platform_default_configurations_app_code_idx;
ALTER INDEX IF EXISTS admin_release_notes_app_code_idx RENAME TO platform_release_notes_app_code_idx;
ALTER INDEX IF EXISTS platform_admin_audit_events_created_at_idx RENAME TO platform_audit_events_created_at_idx;

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'platform_app_health_snapshots',
    'platform_pricing_plans',
    'platform_coupons',
    'platform_feature_flags',
    'platform_default_configurations',
    'platform_release_notes',
    'platform_audit_events'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE public.%I TO service_role', v_table);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
  END LOOP;
END $$;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE COALESCE(qual, '') ILIKE '%is_app_super_admin%'
       OR COALESCE(with_check, '') ILIKE '%is_app_super_admin%'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_app_seat_limits(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_org_admin(p_org_id, p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org_member_app_seats(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT public.is_org_admin(p_org_id, p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.accounts_invite_organisation_member(p_org_id UUID, p_email TEXT)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := LOWER(BTRIM(p_email));
  v_invite public.organisation_invites%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation id is required';
  END IF;

  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Invite email is required';
  END IF;

  IF NOT (
    public.is_org_admin(p_org_id, v_user_id)
    OR public.is_org_owner(p_org_id, v_user_id)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.organisation_members om ON om.user_id = p.id
    WHERE LOWER(p.email) = v_email
      AND om.org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organisation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.organisation_members om ON om.user_id = p.id
    WHERE LOWER(p.email) = v_email
  ) THEN
    RAISE EXCEPTION 'User already belongs to an organisation';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.organisation_invites oi
  WHERE oi.org_id = p_org_id
    AND LOWER(oi.email::TEXT) = v_email
  LIMIT 1;

  IF v_invite.id IS NULL THEN
    INSERT INTO public.organisation_invites (org_id, email, invited_by)
    VALUES (p_org_id, v_email, v_user_id)
    RETURNING *
    INTO v_invite;
  END IF;

  RETURN QUERY
  SELECT
    v_invite.id,
    v_invite.org_id,
    v_invite.email::TEXT,
    v_invite.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_etl_permission(_org_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, etl
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organisation_members om
    LEFT JOIN etl.organisation_member_roles emr ON emr.org_member_id = om.id
    LEFT JOIN etl.role_permissions rp
      ON rp.role_id = emr.role_id
     AND rp.permission_code = _permission_code
    WHERE om.org_id = _org_id
      AND om.user_id = auth.uid()
      AND (
        om.role = 'owner'
        OR rp.role_id IS NOT NULL
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_company_id UUID, _permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
BEGIN
  RETURN EXISTS (
    WITH current_membership AS (
      SELECT om.org_id, om.user_id, om.role AS org_role, cm.role_id
      FROM public.organisation_members om
      LEFT JOIN stoqr.organisation_member_roles cm
        ON cm.company_id = om.org_id
       AND cm.user_id = om.user_id
      WHERE om.org_id = _company_id
        AND om.user_id = auth.uid()
    ),
    assigned_permissions AS (
      SELECT ap.code AS permission_code
      FROM current_membership cm
      JOIN stoqr.app_permissions ap ON TRUE
      WHERE cm.org_role = 'owner'
      UNION
      SELECT rp.permission_code
      FROM current_membership cm
      JOIN stoqr.role_permissions rp ON rp.role_id = cm.role_id
      WHERE cm.org_role <> 'owner'
    ),
    permission_edges(source_code, implied_code) AS (
      VALUES
        ('inventory.use', 'inventory.view'),
        ('inventory.create', 'inventory.view'),
        ('inventory.create', 'inventory.use'),
        ('inventory.edit', 'inventory.view'),
        ('inventory.edit', 'inventory.use'),
        ('inventory.adjust', 'inventory.view'),
        ('inventory.adjust', 'inventory.use'),
        ('inventory.delete', 'inventory.view'),
        ('inventory.delete', 'inventory.use'),
        ('inventory.import_export', 'inventory.view'),
        ('inventory.import_export', 'inventory.use'),
        ('scanner.use', 'scanner.view'),
        ('labels.use', 'labels.view'),
        ('labels.manage', 'labels.view'),
        ('labels.manage', 'labels.use'),
        ('reports.export', 'reports.view'),
        ('procurement.create', 'procurement.view'),
        ('procurement.receive', 'procurement.view'),
        ('procurement.manage', 'procurement.view'),
        ('procurement.manage', 'procurement.create'),
        ('procurement.manage', 'procurement.receive'),
        ('alerts.use', 'alerts.view'),
        ('alerts.manage', 'alerts.view'),
        ('alerts.manage', 'alerts.use'),
        ('organisation.members.manage', 'organisation.view'),
        ('organisation.roles.manage', 'organisation.view'),
        ('organisation.pages.manage', 'organisation.view'),
        ('organisation.activity.view', 'organisation.view'),
        ('organisation.company.manage', 'organisation.view'),
        ('organisation.billing.manage', 'organisation.view'),
        ('products.view', 'inventory.view'),
        ('products.view', 'inventory.use'),
        ('products.manage', 'inventory.create'),
        ('products.manage', 'inventory.edit'),
        ('products.manage', 'inventory.adjust'),
        ('products.manage', 'inventory.delete'),
        ('products.manage', 'inventory.view'),
        ('products.manage', 'inventory.use'),
        ('inventory.bulk_manage', 'inventory.import_export'),
        ('inventory.bulk_manage', 'inventory.view'),
        ('inventory.bulk_manage', 'inventory.use'),
        ('transactions.view', 'inventory.use'),
        ('transactions.view', 'inventory.view'),
        ('transactions.create', 'inventory.adjust'),
        ('transactions.create', 'scanner.use'),
        ('transactions.create', 'inventory.use'),
        ('transactions.create', 'inventory.view'),
        ('transactions.create', 'scanner.view'),
        ('company.manage', 'organisation.company.manage'),
        ('billing.manage', 'organisation.billing.manage'),
        ('members.view', 'organisation.view'),
        ('members.manage', 'organisation.members.manage'),
        ('roles.manage', 'organisation.roles.manage'),
        ('activity.view', 'organisation.activity.view'),
        ('inventory.view', 'products.view'),
        ('inventory.edit', 'products.manage'),
        ('inventory.create', 'products.manage'),
        ('inventory.adjust', 'transactions.create'),
        ('inventory.use', 'transactions.view'),
        ('inventory.import_export', 'inventory.bulk_manage'),
        ('scanner.use', 'transactions.create'),
        ('organisation.company.manage', 'company.manage'),
        ('organisation.billing.manage', 'billing.manage'),
        ('organisation.view', 'members.view'),
        ('organisation.members.manage', 'members.manage'),
        ('organisation.roles.manage', 'roles.manage'),
        ('organisation.activity.view', 'activity.view')
    ),
    expanded_permissions AS (
      SELECT permission_code AS code
      FROM assigned_permissions
      UNION
      SELECT pe.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe ON pe.source_code = ap.permission_code
      UNION
      SELECT pe2.implied_code
      FROM assigned_permissions ap
      JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
      JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
    )
    SELECT 1
    FROM expanded_permissions ep
    WHERE ep.code = _permission_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_stoqr_my_permissions(target_company_id UUID)
RETURNS TABLE (code TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, stoqr
AS $$
  WITH current_membership AS (
    SELECT om.org_id, om.user_id, om.role AS org_role, cm.role_id
    FROM public.organisation_members om
    LEFT JOIN stoqr.organisation_member_roles cm
      ON cm.company_id = om.org_id
     AND cm.user_id = om.user_id
    WHERE om.org_id = target_company_id
      AND om.user_id = auth.uid()
  ),
  assigned_permissions AS (
    SELECT ap.code AS permission_code
    FROM current_membership cm
    JOIN stoqr.app_permissions ap ON TRUE
    WHERE cm.org_role = 'owner'
    UNION
    SELECT rp.permission_code
    FROM current_membership cm
    JOIN stoqr.role_permissions rp ON rp.role_id = cm.role_id
    WHERE cm.org_role <> 'owner'
  ),
  permission_edges(source_code, implied_code) AS (
    VALUES
      ('inventory.use', 'inventory.view'),
      ('inventory.create', 'inventory.view'),
      ('inventory.create', 'inventory.use'),
      ('inventory.edit', 'inventory.view'),
      ('inventory.edit', 'inventory.use'),
      ('inventory.adjust', 'inventory.view'),
      ('inventory.adjust', 'inventory.use'),
      ('inventory.delete', 'inventory.view'),
      ('inventory.delete', 'inventory.use'),
      ('inventory.import_export', 'inventory.view'),
      ('inventory.import_export', 'inventory.use'),
      ('scanner.use', 'scanner.view'),
      ('labels.use', 'labels.view'),
      ('labels.manage', 'labels.view'),
      ('labels.manage', 'labels.use'),
      ('reports.export', 'reports.view'),
      ('procurement.create', 'procurement.view'),
      ('procurement.receive', 'procurement.view'),
      ('procurement.manage', 'procurement.view'),
      ('procurement.manage', 'procurement.create'),
      ('procurement.manage', 'procurement.receive'),
      ('alerts.use', 'alerts.view'),
      ('alerts.manage', 'alerts.view'),
      ('alerts.manage', 'alerts.use'),
      ('organisation.members.manage', 'organisation.view'),
      ('organisation.roles.manage', 'organisation.view'),
      ('organisation.pages.manage', 'organisation.view'),
      ('organisation.activity.view', 'organisation.view'),
      ('organisation.company.manage', 'organisation.view'),
      ('organisation.billing.manage', 'organisation.view'),
      ('products.view', 'inventory.view'),
      ('products.view', 'inventory.use'),
      ('products.manage', 'inventory.create'),
      ('products.manage', 'inventory.edit'),
      ('products.manage', 'inventory.adjust'),
      ('products.manage', 'inventory.delete'),
      ('products.manage', 'inventory.view'),
      ('products.manage', 'inventory.use'),
      ('inventory.bulk_manage', 'inventory.import_export'),
      ('inventory.bulk_manage', 'inventory.view'),
      ('inventory.bulk_manage', 'inventory.use'),
      ('transactions.view', 'inventory.use'),
      ('transactions.view', 'inventory.view'),
      ('transactions.create', 'inventory.adjust'),
      ('transactions.create', 'scanner.use'),
      ('transactions.create', 'inventory.use'),
      ('transactions.create', 'inventory.view'),
      ('transactions.create', 'scanner.view'),
      ('company.manage', 'organisation.company.manage'),
      ('billing.manage', 'organisation.billing.manage'),
      ('members.view', 'organisation.view'),
      ('members.manage', 'organisation.members.manage'),
      ('roles.manage', 'organisation.roles.manage'),
      ('activity.view', 'organisation.activity.view')
  ),
  expanded_permissions AS (
    SELECT permission_code AS code
    FROM assigned_permissions
    UNION
    SELECT pe.implied_code
    FROM assigned_permissions ap
    JOIN permission_edges pe ON pe.source_code = ap.permission_code
    UNION
    SELECT pe2.implied_code
    FROM assigned_permissions ap
    JOIN permission_edges pe1 ON pe1.source_code = ap.permission_code
    JOIN permission_edges pe2 ON pe2.source_code = pe1.implied_code
  )
  SELECT DISTINCT ep.code
  FROM expanded_permissions ep
  JOIN stoqr.app_permissions ap ON ap.code = ep.code
  WHERE ap.hidden = false
  ORDER BY ep.code;
$$;

CREATE OR REPLACE FUNCTION public.get_org_member_usage_stats(target_org_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  success_count BIGINT,
  failed_count BIGINT,
  daily_date DATE,
  daily_total BIGINT,
  daily_success BIGINT,
  daily_failed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_org_member(target_org_id, auth.uid())
     AND NOT public.is_org_owner(target_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT,
    COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT,
    we.started_at::DATE AS daily_date,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT,
    COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT
  FROM etl.workflow_executions we
  JOIN etl.workflows w ON w.id = we.workflow_id
  WHERE w.org_id = target_org_id
    AND we.started_at >= now() - INTERVAL '30 days'
  GROUP BY we.started_at::DATE
  ORDER BY daily_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_active_users(target_org_id UUID)
RETURNS TABLE (user_id UUID, email TEXT, full_name TEXT, execution_count BIGINT, last_active TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_org_member(target_org_id, auth.uid())
     AND NOT public.is_org_owner(target_org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    we.user_id,
    p.email,
    p.full_name,
    COUNT(*)::BIGINT AS execution_count,
    MAX(we.started_at) AS last_active
  FROM etl.workflow_executions we
  JOIN etl.workflows w ON w.id = we.workflow_id
  JOIN public.profiles p ON p.id = we.user_id
  WHERE w.org_id = target_org_id
    AND we.started_at >= now() - INTERVAL '30 days'
  GROUP BY we.user_id, p.email, p.full_name
  ORDER BY execution_count DESC;
END;
$$;

CREATE POLICY organisations_select ON public.organisations
  FOR SELECT USING (
    owner_id = auth.uid()
    OR public.is_org_member(id, auth.uid())
  );

CREATE POLICY organisations_insert ON public.organisations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY organisations_update ON public.organisations
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR public.is_org_admin(id, auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR public.is_org_admin(id, auth.uid())
  );

CREATE POLICY organisations_delete ON public.organisations
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY organisation_members_select ON public.organisation_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_org_member(org_id, auth.uid())
  );

CREATE POLICY organisation_members_insert ON public.organisation_members
  FOR INSERT WITH CHECK (public.is_org_admin(org_id, auth.uid()));

CREATE POLICY organisation_members_update ON public.organisation_members
  FOR UPDATE USING (
    public.is_org_admin(org_id, auth.uid())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
    )
  )
  WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
      AND role <> 'owner'
    )
  );

CREATE POLICY organisation_members_delete ON public.organisation_members
  FOR DELETE USING (
    public.is_org_admin(org_id, auth.uid())
    AND NOT (
      user_id = (
        SELECT o.owner_id
        FROM public.organisations o
        WHERE o.id = organisation_members.org_id
      )
    )
  );

CREATE POLICY app_seats_select ON public.organisation_app_seats
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY member_app_seats_select ON public.organisation_member_app_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_app_seats.org_member_id
        AND (
          om.user_id = auth.uid()
          OR public.is_org_member(om.org_id, auth.uid())
        )
    )
  );

CREATE POLICY organisation_invites_select_admin ON public.organisation_invites
  FOR SELECT USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_org_owner(org_id, auth.uid())
  );

CREATE POLICY organisation_invites_insert_admin ON public.organisation_invites
  FOR INSERT WITH CHECK (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_org_owner(org_id, auth.uid())
  );

CREATE POLICY organisation_invites_delete_admin_or_user ON public.organisation_invites
  FOR DELETE USING (
    public.is_org_admin(org_id, auth.uid())
    OR public.is_org_owner(org_id, auth.uid())
    OR email = auth.jwt() ->> 'email'
  );

CREATE POLICY subscriptions_select ON public.subscriptions
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY subscriptions_manage ON public.subscriptions
  FOR ALL USING (public.is_org_owner_strictly(org_id, auth.uid()))
  WITH CHECK (public.is_org_owner_strictly(org_id, auth.uid()));

CREATE POLICY organisation_audit_events_select ON public.organisation_audit_events
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY account_preferences_select_self ON public.account_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY account_preferences_insert_self ON public.account_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY account_preferences_update_self ON public.account_preferences
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY etl_roles_select ON etl.roles
  FOR SELECT USING (public.is_org_member(org_id, auth.uid()));

CREATE POLICY etl_roles_manage ON etl.roles
  FOR ALL USING (
    public.has_etl_permission(org_id, 'roles.manage')
    AND lower(name) <> 'owner'
  )
  WITH CHECK (
    public.has_etl_permission(org_id, 'roles.manage')
    AND lower(name) <> 'owner'
  );

CREATE POLICY etl_role_permissions_select ON etl.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND public.is_org_member(r.org_id, auth.uid())
    )
  );

CREATE POLICY etl_role_permissions_manage ON etl.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND public.has_etl_permission(r.org_id, 'roles.manage')
        AND lower(r.name) <> 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND public.has_etl_permission(r.org_id, 'roles.manage')
        AND lower(r.name) <> 'owner'
    )
  );

CREATE POLICY etl_member_roles_select ON etl.organisation_member_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND (
          om.user_id = auth.uid()
          OR public.has_etl_permission(om.org_id, 'roles.manage')
        )
    )
  );

CREATE POLICY etl_member_roles_manage ON etl.organisation_member_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND public.has_etl_permission(om.org_id, 'roles.manage')
        AND NOT (om.user_id = auth.uid() AND om.role = 'owner')
        AND NOT (
          om.user_id = (
            SELECT o.owner_id
            FROM public.organisations o
            WHERE o.id = om.org_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND public.has_etl_permission(om.org_id, 'roles.manage')
        AND NOT (om.user_id = auth.uid() AND om.role = 'owner')
        AND NOT (
          om.user_id = (
            SELECT o.owner_id
            FROM public.organisations o
            WHERE o.id = om.org_id
          )
        )
        AND (
          organisation_member_roles.role_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM etl.roles r
            WHERE r.id = organisation_member_roles.role_id
              AND r.org_id = om.org_id
              AND lower(r.name) <> 'owner'
          )
        )
    )
  );

CREATE POLICY workflows_select_unified ON etl.workflows
  FOR SELECT USING (
    is_template = true
    OR (org_id IS NULL AND owner_id = auth.uid())
    OR public.has_etl_permission(org_id, 'workflows.view')
  );

CREATE POLICY workflows_insert_owned_or_managed ON etl.workflows
  FOR INSERT WITH CHECK (
    COALESCE(is_template, false) = false
    AND owner_id = auth.uid()
    AND (
      org_id IS NULL
      OR public.has_etl_permission(org_id, 'workflows.manage')
    )
  );

CREATE POLICY workflows_update_non_template_owner_or_member ON etl.workflows
  FOR UPDATE USING (
    is_template = false
    AND (
      (org_id IS NULL AND owner_id = auth.uid())
      OR (org_id IS NOT NULL AND (owner_id = auth.uid() OR public.has_etl_permission(org_id, 'workflows.manage')))
    )
  )
  WITH CHECK (
    is_template = false
    AND (
      (org_id IS NULL AND owner_id = auth.uid())
      OR (org_id IS NOT NULL AND (owner_id = auth.uid() OR public.has_etl_permission(org_id, 'workflows.manage')))
    )
  );

CREATE POLICY workflows_delete_non_template_owner_or_member ON etl.workflows
  FOR DELETE USING (
    is_template = false
    AND (
      (org_id IS NULL AND owner_id = auth.uid())
      OR (org_id IS NOT NULL AND (owner_id = auth.uid() OR public.has_etl_permission(org_id, 'workflows.manage')))
    )
  );

CREATE POLICY workflow_executions_select_unified ON etl.workflow_executions
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_etl_permission(org_id, 'executions.view')
  );

CREATE POLICY workflow_executions_insert_self ON etl.workflow_executions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      org_id IS NULL
      OR public.has_etl_permission(org_id, 'executions.run')
    )
  );

CREATE POLICY versions_select ON etl.workflow_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'workflows.view')
        )
    )
  );

CREATE POLICY versions_insert ON etl.workflow_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = workflow_versions.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'workflows.manage')
        )
    )
  );

CREATE POLICY notifications_select ON etl.notification_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
        )
    )
  );

CREATE POLICY notifications_insert ON etl.notification_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
        )
    )
  );

CREATE POLICY notifications_update ON etl.notification_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
        )
    )
  );

CREATE POLICY notifications_delete ON etl.notification_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = notification_settings.workflow_id
        AND (
          (w.org_id IS NULL AND w.owner_id = auth.uid())
          OR public.has_etl_permission(w.org_id, 'notifications.manage')
        )
    )
  );

CREATE POLICY "Members can view company roles" ON stoqr.roles
  FOR SELECT USING (public.is_org_member(company_id, auth.uid()));

CREATE POLICY "Members can view role permissions" ON stoqr.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM stoqr.roles r
      WHERE r.id = role_permissions.role_id
        AND public.is_org_member(r.company_id, auth.uid())
    )
  );

CREATE POLICY "Members can view organisation page settings" ON stoqr.organisation_page_settings
  FOR SELECT USING (public.has_permission(company_id, 'organisation.view'));

CREATE POLICY "Admins can insert organisation page settings" ON stoqr.organisation_page_settings
  FOR INSERT WITH CHECK (public.has_permission(company_id, 'organisation.pages.manage'));

CREATE POLICY "Admins can update organisation page settings" ON stoqr.organisation_page_settings
  FOR UPDATE USING (public.has_permission(company_id, 'organisation.pages.manage'))
  WITH CHECK (public.has_permission(company_id, 'organisation.pages.manage'));

DROP FUNCTION IF EXISTS public.log_platform_admin_event(TEXT, JSONB) CASCADE;

DO $$
DECLARE
  v_function RECORD;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure AS identity
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'admin\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', v_function.identity);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.get_org_usage_stats(UUID);
DROP FUNCTION IF EXISTS public.get_user_usage_stats(UUID);
DROP FUNCTION IF EXISTS public.get_all_orgs_usage_stats();
DROP FUNCTION IF EXISTS public.get_all_users_usage_stats();

DROP FUNCTION IF EXISTS public.get_super_admin_status();
DROP FUNCTION IF EXISTS public.is_app_super_admin();
DROP TABLE IF EXISTS public.super_admin_members;
