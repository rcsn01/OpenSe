CREATE FUNCTION public.pick_next_etl_role(p_org_id UUID, p_excluded_role_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, etl
AS $$
  SELECT r.id
  FROM etl.roles r
  WHERE r.org_id = p_org_id
    AND lower(r.name) <> 'owner'
    AND (p_excluded_role_id IS NULL OR r.id <> p_excluded_role_id)
  ORDER BY r.role_rank DESC, r.created_at
  LIMIT 1;
$$;

CREATE FUNCTION app_private.has_etl_permission(_org_id UUID, _permission_code TEXT)
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

CREATE FUNCTION etl.enforce_template_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = etl, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_template = true THEN
    IF NEW.name IS DISTINCT FROM OLD.name
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.graph_data IS DISTINCT FROM OLD.graph_data THEN
      RAISE EXCEPTION 'Template workflows are immutable. Clone or demote before editing.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_template_immutability
  BEFORE UPDATE ON etl.workflows
  FOR EACH ROW
  EXECUTE FUNCTION etl.enforce_template_immutability();

-- Permission catalog rows are migration-owned; direct writes are intentionally denied.
CREATE POLICY etl_app_permissions_select ON etl.app_permissions
  FOR SELECT USING (true);

CREATE POLICY etl_roles_select ON etl.roles
  FOR SELECT USING (app_private.is_org_member(org_id, auth.uid()));

CREATE POLICY etl_roles_manage ON etl.roles
  FOR ALL USING (
    app_private.has_etl_permission(org_id, 'roles.manage')
    AND lower(name) <> 'owner'
  )
  WITH CHECK (
    app_private.has_etl_permission(org_id, 'roles.manage')
    AND lower(name) <> 'owner'
  );

CREATE POLICY etl_role_permissions_select ON etl.role_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND app_private.is_org_member(r.org_id, auth.uid())
    )
  );

CREATE POLICY etl_role_permissions_manage ON etl.role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND app_private.has_etl_permission(r.org_id, 'roles.manage')
        AND lower(r.name) <> 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM etl.roles r
      WHERE r.id = role_permissions.role_id
        AND app_private.has_etl_permission(r.org_id, 'roles.manage')
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
          OR app_private.has_etl_permission(om.org_id, 'roles.manage')
        )
    )
  );

CREATE POLICY etl_member_roles_manage ON etl.organisation_member_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.organisation_members om
      WHERE om.id = organisation_member_roles.org_member_id
        AND app_private.has_etl_permission(om.org_id, 'roles.manage')
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
        AND app_private.has_etl_permission(om.org_id, 'roles.manage')
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
    OR app_private.has_etl_permission(org_id, 'workflows.view')
  );

CREATE POLICY workflows_insert_owned_or_managed ON etl.workflows
  FOR INSERT WITH CHECK (
    COALESCE(is_template, false) = false
    AND owner_id = auth.uid()
    AND (
      org_id IS NULL
      OR app_private.has_etl_permission(org_id, 'workflows.manage')
    )
  );

CREATE POLICY workflows_update_non_template_owner_or_member ON etl.workflows
  FOR UPDATE USING (
    is_template = false
    AND (
      (org_id IS NULL AND owner_id = auth.uid())
      OR (org_id IS NOT NULL AND (owner_id = auth.uid() OR app_private.has_etl_permission(org_id, 'workflows.manage')))
    )
  )
  WITH CHECK (
    is_template = false
    AND (
      (org_id IS NULL AND owner_id = auth.uid())
      OR (org_id IS NOT NULL AND (owner_id = auth.uid() OR app_private.has_etl_permission(org_id, 'workflows.manage')))
    )
  );

CREATE POLICY workflows_delete_non_template_owner_or_member ON etl.workflows
  FOR DELETE USING (
    is_template = false
    AND (
      (org_id IS NULL AND owner_id = auth.uid())
      OR (org_id IS NOT NULL AND (owner_id = auth.uid() OR app_private.has_etl_permission(org_id, 'workflows.manage')))
    )
  );

CREATE POLICY workflow_executions_select_unified ON etl.workflow_executions
  FOR SELECT USING (
    user_id = auth.uid()
    OR app_private.has_etl_permission(org_id, 'executions.view')
  );

CREATE POLICY workflow_executions_insert_self ON etl.workflow_executions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = workflow_executions.workflow_id
        AND (
          (w.org_id IS NULL AND workflow_executions.org_id IS NULL AND w.owner_id = auth.uid())
          OR (
            w.org_id IS NOT NULL
            AND workflow_executions.org_id = w.org_id
            AND app_private.has_etl_permission(w.org_id, 'executions.run')
          )
        )
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
          OR app_private.has_etl_permission(w.org_id, 'workflows.view')
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
          OR app_private.has_etl_permission(w.org_id, 'workflows.manage')
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
          OR app_private.has_etl_permission(w.org_id, 'notifications.manage')
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
          OR app_private.has_etl_permission(w.org_id, 'notifications.manage')
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
          OR app_private.has_etl_permission(w.org_id, 'notifications.manage')
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
          OR app_private.has_etl_permission(w.org_id, 'notifications.manage')
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
          OR app_private.has_etl_permission(w.org_id, 'notifications.manage')
        )
    )
  );




GRANT SELECT ON TABLE etl.app_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE etl.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE etl.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE etl.organisation_member_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE etl.workflows TO authenticated;
GRANT SELECT, INSERT ON TABLE etl.workflow_executions TO authenticated;
GRANT SELECT, INSERT ON TABLE etl.workflow_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE etl.notification_settings TO authenticated;

GRANT ALL PRIVILEGES ON TABLE etl.app_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.roles TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.role_permissions TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.organisation_member_roles TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.workflows TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.workflow_executions TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.workflow_versions TO service_role;
GRANT ALL PRIVILEGES ON TABLE etl.notification_settings TO service_role;

REVOKE ALL ON FUNCTION public.pick_next_etl_role(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.has_etl_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION etl.enforce_template_immutability() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION app_private.has_etl_permission(UUID, TEXT) TO authenticated;
CREATE VIEW etl.personal_usage_stats
WITH (security_invoker = true)
AS
SELECT
  we.user_id,
  we.started_at::DATE AS daily_date,
  COUNT(*)::BIGINT AS daily_total,
  COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT AS daily_success,
  COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT AS daily_failed
FROM etl.workflow_executions we
JOIN etl.workflows w ON w.id = we.workflow_id
WHERE w.owner_id = auth.uid()
  AND w.org_id IS NULL
  AND we.started_at >= now() - INTERVAL '30 days'
GROUP BY we.user_id, we.started_at::DATE;

CREATE VIEW etl.org_member_usage_stats
WITH (security_invoker = true)
AS
SELECT
  w.org_id,
  we.started_at::DATE AS daily_date,
  COUNT(*)::BIGINT AS daily_total,
  COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT AS daily_success,
  COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT AS daily_failed
FROM etl.workflow_executions we
JOIN etl.workflows w ON w.id = we.workflow_id
WHERE w.org_id IS NOT NULL
  AND we.started_at >= now() - INTERVAL '30 days'
GROUP BY w.org_id, we.started_at::DATE;

CREATE VIEW etl.org_active_users
WITH (security_invoker = true)
AS
SELECT
  w.org_id,
  we.user_id,
  p.email,
  p.full_name,
  COUNT(*)::BIGINT AS execution_count,
  MAX(we.started_at) AS last_active
FROM etl.workflow_executions we
JOIN etl.workflows w ON w.id = we.workflow_id
JOIN public.profiles p ON p.id = we.user_id
WHERE w.org_id IS NOT NULL
  AND we.started_at >= now() - INTERVAL '30 days'
GROUP BY w.org_id, we.user_id, p.email, p.full_name;

GRANT SELECT ON etl.personal_usage_stats TO authenticated, service_role;
GRANT SELECT ON etl.org_member_usage_stats TO authenticated, service_role;
GRANT SELECT ON etl.org_active_users TO authenticated, service_role;
