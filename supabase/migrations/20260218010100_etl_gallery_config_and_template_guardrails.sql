-- ============================================================
-- ETL Gallery Config + Template Guardrails
-- ============================================================

DROP POLICY IF EXISTS workflows_select_unified ON etl.workflows;
DROP POLICY IF EXISTS workflows_insert_owner_only ON etl.workflows;
DROP POLICY IF EXISTS workflows_update_owner_or_member ON etl.workflows;
DROP POLICY IF EXISTS workflows_update_non_template_owner_or_member ON etl.workflows;
DROP POLICY IF EXISTS workflows_update_template_super_admin_toggle ON etl.workflows;
DROP POLICY IF EXISTS workflows_delete_owner_or_member ON etl.workflows;
DROP POLICY IF EXISTS workflows_delete_non_template_owner_or_member ON etl.workflows;
DROP POLICY IF EXISTS workflows_delete_template_super_admin_only ON etl.workflows;

CREATE POLICY workflows_select_unified ON etl.workflows
  FOR SELECT USING (
    is_template = true
    OR (org_id IS NULL AND owner_id = (SELECT auth.uid()))
    OR public.is_org_member(org_id, (SELECT auth.uid()))
    OR public.is_app_super_admin()
  );

CREATE POLICY workflows_insert_owner_only ON etl.workflows
  FOR INSERT WITH CHECK (
    (
      (SELECT auth.uid()) = owner_id
      AND COALESCE(is_template, false) = false
    )
    OR public.is_app_super_admin()
  );

CREATE POLICY workflows_update_non_template_owner_or_member ON etl.workflows
  FOR UPDATE USING (
    is_template = false
    AND (
      (SELECT auth.uid()) = owner_id
      OR public.is_org_member(org_id, (SELECT auth.uid()))
      OR public.is_app_super_admin()
    )
  )
  WITH CHECK (
    is_template = false
    AND (
      (SELECT auth.uid()) = owner_id
      OR public.is_org_member(org_id, (SELECT auth.uid()))
      OR public.is_app_super_admin()
    )
  );

CREATE POLICY workflows_update_template_super_admin_toggle ON etl.workflows
  FOR UPDATE USING (
    is_template = true
    AND public.is_app_super_admin()
  )
  WITH CHECK (public.is_app_super_admin());

CREATE POLICY workflows_delete_non_template_owner_or_member ON etl.workflows
  FOR DELETE USING (
    is_template = false
    AND (
      (SELECT auth.uid()) = owner_id
      OR public.is_org_member(org_id, (SELECT auth.uid()))
      OR public.is_app_super_admin()
    )
  );

CREATE POLICY workflows_delete_template_super_admin_only ON etl.workflows
  FOR DELETE USING (
    is_template = true
    AND public.is_app_super_admin()
  );

CREATE OR REPLACE FUNCTION etl.enforce_template_immutability()
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

DROP TRIGGER IF EXISTS trg_enforce_template_immutability ON etl.workflows;
CREATE TRIGGER trg_enforce_template_immutability
  BEFORE UPDATE ON etl.workflows
  FOR EACH ROW
  EXECUTE FUNCTION etl.enforce_template_immutability();

CREATE OR REPLACE FUNCTION public.admin_list_etl_workflows(p_only_templates BOOLEAN DEFAULT false)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  owner_id UUID,
  org_id UUID,
  is_template BOOLEAN,
  node_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, etl
AS $$
BEGIN
  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    w.created_at,
    w.owner_id,
    w.org_id,
    w.is_template,
    COALESCE(jsonb_array_length(COALESCE(w.graph_data->'nodes', '[]'::jsonb)), 0)::INTEGER AS node_count
  FROM etl.workflows w
  WHERE (NOT p_only_templates) OR w.is_template = true
  ORDER BY w.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_etl_workflow_template_status(
  p_workflow_id UUID,
  p_is_template BOOLEAN
)
RETURNS TABLE (
  id UUID,
  is_template BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, etl
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_app_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Super Admin only';
  END IF;

  RETURN QUERY
  UPDATE etl.workflows w
  SET is_template = p_is_template
  WHERE w.id = p_workflow_id
  RETURNING w.id, w.is_template;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_etl_workflows(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_etl_workflow_template_status(UUID, BOOLEAN) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_list_etl_workflows(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_etl_workflow_template_status(UUID, BOOLEAN) TO authenticated;
