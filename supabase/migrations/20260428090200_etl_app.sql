-- ETL application baseline.

CREATE TABLE etl.app_permissions (
  code TEXT PRIMARY KEY,
  description TEXT
);

INSERT INTO etl.app_permissions (code, description)
VALUES
  ('workflows.view', 'View ETL workflows'),
  ('workflows.manage', 'Create and edit ETL workflows'),
  ('executions.view', 'View workflow execution history'),
  ('executions.run', 'Run workflows'),
  ('notifications.manage', 'Manage workflow notifications'),
  ('roles.manage', 'Manage ETL custom roles')
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;

CREATE TABLE etl.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_rank INTEGER NOT NULL DEFAULT 100 CHECK (role_rank >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_id, name)
);

CREATE UNIQUE INDEX etl_roles_org_id_name_lower_uidx
  ON etl.roles (org_id, lower(name));

CREATE TABLE etl.role_permissions (
  role_id UUID NOT NULL REFERENCES etl.roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES etl.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE etl.organisation_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id UUID NOT NULL REFERENCES public.organisation_members(id) ON DELETE CASCADE,
  role_id UUID REFERENCES etl.roles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (org_member_id)
);

CREATE TABLE etl.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  description TEXT,
  graph_data JSONB,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  is_template BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX workflows_org_idx ON etl.workflows (org_id);
CREATE INDEX workflows_owner_idx ON etl.workflows (owner_id);
CREATE INDEX workflows_is_template_idx ON etl.workflows (is_template) WHERE is_template = true;
CREATE INDEX workflows_created_at_idx ON etl.workflows (created_at);

CREATE TABLE etl.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES etl.workflows(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX workflow_executions_org_idx ON etl.workflow_executions (org_id);
CREATE INDEX workflow_executions_user_idx ON etl.workflow_executions (user_id);
CREATE INDEX workflow_executions_workflow_idx ON etl.workflow_executions (workflow_id);
CREATE INDEX workflow_executions_status_idx ON etl.workflow_executions (status);

CREATE TABLE etl.workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES etl.workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  graph_data JSONB NOT NULL,
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_summary TEXT,
  UNIQUE (workflow_id, version_number)
);

CREATE TABLE etl.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES etl.workflows(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'webhook')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, channel)
);

ALTER TABLE etl.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.organisation_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etl.notification_settings ENABLE ROW LEVEL SECURITY;

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

CREATE FUNCTION public.has_etl_permission(_org_id UUID, _permission_code TEXT)
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
    AND EXISTS (
      SELECT 1
      FROM etl.workflows w
      WHERE w.id = workflow_executions.workflow_id
        AND (
          (w.org_id IS NULL AND workflow_executions.org_id IS NULL AND w.owner_id = auth.uid())
          OR (
            w.org_id IS NOT NULL
            AND workflow_executions.org_id = w.org_id
            AND public.has_etl_permission(w.org_id, 'executions.run')
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

CREATE FUNCTION public.get_org_member_usage_stats(target_org_id UUID)
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

CREATE FUNCTION public.get_org_active_users(target_org_id UUID)
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

CREATE FUNCTION public.get_personal_usage_stats()
RETURNS TABLE (daily_date DATE, daily_total BIGINT, daily_success BIGINT, daily_failed BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  RETURN QUERY
  SELECT
    we.started_at::DATE,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE we.status = 'success')::BIGINT,
    COUNT(*) FILTER (WHERE we.status = 'failed')::BIGINT
  FROM etl.workflow_executions we
  JOIN etl.workflows w ON w.id = we.workflow_id
  WHERE w.owner_id = auth.uid()
    AND w.org_id IS NULL
    AND we.started_at >= now() - INTERVAL '30 days'
  GROUP BY we.started_at::DATE
  ORDER BY daily_date;
END;
$$;

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
REVOKE ALL ON FUNCTION public.has_etl_permission(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION etl.enforce_template_immutability() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_org_member_usage_stats(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_org_active_users(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_personal_usage_stats() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.pick_next_etl_role(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_etl_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_member_usage_stats(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_org_active_users(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_personal_usage_stats() TO authenticated, service_role;
