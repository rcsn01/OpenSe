BEGIN;

DO $$
DECLARE
  v_unexpected_service_role_functions TEXT;
BEGIN
  IF NOT has_function_privilege('anon', 'public.has_users()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon should still execute the public has_users facade';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.has_users()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should still execute the public has_users facade';
  END IF;

  IF to_regprocedure('public.has_permission(uuid, text)') IS NOT NULL THEN
    RAISE EXCEPTION 'public.has_permission should not exist after the rewrite';
  END IF;

  IF has_function_privilege('authenticated', 'app_private.has_permission(uuid, text)', 'EXECUTE') THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'authenticated should execute the private permission helper';
  END IF;

  IF to_regprocedure('public.is_org_member(uuid, uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'public.is_org_member should not exist after the rewrite';
  END IF;

  IF to_regprocedure('public.is_org_owner(uuid, uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'public.is_org_owner should not exist after the rewrite';
  END IF;

  IF to_regprocedure('public.is_org_admin(uuid, uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'public.is_org_admin should not exist after the rewrite';
  END IF;

  IF to_regprocedure('public.is_org_owner_strictly(uuid, uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'public.is_org_owner_strictly should not exist after the rewrite';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.is_org_member(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the private RLS helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.is_org_owner(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the private owner helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.is_org_admin(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the private admin helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.is_org_owner_strictly(uuid, uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the private strict owner helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'app_private.has_etl_permission(uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the private ETL permission helper';
  END IF;

  IF NOT has_function_privilege('authenticated', 'stoqr.folder_path_name(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated should execute the StoQR folder path helper';
  END IF;

  IF NOT (
    SELECT prosecdef
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app_private'
      AND p.proname = 'has_permission'
      AND pg_get_function_identity_arguments(p.oid) = '_company_id uuid, _permission_code text'
  ) THEN
    RAISE EXCEPTION 'app_private.has_permission should remain SECURITY DEFINER';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.claim_stoqr_pending_email_alerts(uuid, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role should execute the StoQR email alert claim worker RPC';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.mark_stoqr_alert_email_delivery(uuid, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role should execute the StoQR email alert delivery worker RPC';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.claim_stoqr_pending_alert_notifications(uuid, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role should execute the StoQR notification claim worker RPC';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.mark_stoqr_alert_notification_delivery(uuid, text, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role should execute the StoQR notification delivery worker RPC';
  END IF;

  SELECT string_agg(
    format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
    ', '
    ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  )
  INTO v_unexpected_service_role_functions
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'app_private', 'etl', 'stoqr')
    AND has_function_privilege('service_role', p.oid, 'EXECUTE')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.classid = 'pg_proc'::regclass
        AND d.objid = p.oid
        AND d.deptype = 'e'
    )
    AND NOT (
      n.nspname = 'public'
      AND (
        (p.proname = 'claim_stoqr_pending_email_alerts' AND pg_get_function_identity_arguments(p.oid) = 'target_company_id uuid, batch_size integer')
        OR (p.proname = 'mark_stoqr_alert_email_delivery' AND pg_get_function_identity_arguments(p.oid) = 'target_delivery_id uuid, next_status text, provider_message_id text, error_message text')
        OR (p.proname = 'claim_stoqr_pending_alert_notifications' AND pg_get_function_identity_arguments(p.oid) = 'target_company_id uuid, batch_size integer')
        OR (p.proname = 'mark_stoqr_alert_notification_delivery' AND pg_get_function_identity_arguments(p.oid) = 'target_delivery_id uuid, next_status text, provider_message_id text, error_message text')
      )
    );

  IF v_unexpected_service_role_functions IS NOT NULL THEN
    RAISE EXCEPTION 'service_role should only execute alert worker RPCs, also found: %', v_unexpected_service_role_functions;
  END IF;
END;
$$;

ROLLBACK;
