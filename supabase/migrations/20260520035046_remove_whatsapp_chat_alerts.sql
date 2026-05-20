DELETE FROM stoqr.alert_delivery_logs
WHERE channel = 'whatsapp';

DELETE FROM stoqr.alert_connectors
WHERE provider = 'whatsapp';

UPDATE stoqr.alert_rules
SET delivery_channels = array_remove(delivery_channels, 'whatsapp'),
    updated_at = timezone('utc'::text, now())
WHERE delivery_channels @> ARRAY['whatsapp']::text[];

ALTER TABLE stoqr.alert_connectors
  DROP CONSTRAINT IF EXISTS alert_connectors_provider_check;

ALTER TABLE stoqr.alert_connectors
  ADD CONSTRAINT alert_connectors_provider_check
  CHECK (provider IN ('telegram', 'mattermost'));

ALTER TABLE stoqr.alert_delivery_logs
  DROP CONSTRAINT IF EXISTS alert_delivery_logs_channel_check;

ALTER TABLE stoqr.alert_delivery_logs
  ADD CONSTRAINT alert_delivery_logs_channel_check
  CHECK (channel IN ('in_app', 'email', 'push', 'telegram', 'mattermost'));

ALTER TABLE stoqr.alert_rules
  DROP CONSTRAINT IF EXISTS alert_rules_delivery_channels_check;

ALTER TABLE stoqr.alert_rules
  ADD CONSTRAINT alert_rules_delivery_channels_check
  CHECK (delivery_channels <@ ARRAY['in_app', 'email', 'push', 'telegram', 'mattermost']::text[]);

CREATE OR REPLACE FUNCTION stoqr.evaluate_low_stock_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = stoqr, public
AS $$
DECLARE
  v_rule stoqr.alert_rules%ROWTYPE;
  v_event_id UUID;
  v_old_low BOOLEAN := false;
  v_new_low BOOLEAN := false;
  v_product stoqr.products%ROWTYPE;
  v_folder_name TEXT;
BEGIN
  SELECT *
  INTO v_product
  FROM stoqr.products
  WHERE id = NEW.product_id
    AND company_id = NEW.company_id;

  IF v_product.id IS NULL OR v_product.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_folder_name := COALESCE(stoqr.folder_path_name(NEW.folder_id), 'Unassigned');

  v_new_low := COALESCE(NEW.reorder_point, 0) > 0
    AND COALESCE(NEW.quantity_on_hand, 0) <= COALESCE(NEW.reorder_point, 0);

  IF TG_OP = 'UPDATE' THEN
    v_old_low := COALESCE(OLD.reorder_point, 0) > 0
      AND COALESCE(OLD.quantity_on_hand, 0) <= COALESCE(OLD.reorder_point, 0);
  END IF;

  IF NOT v_new_low OR v_old_low THEN
    RETURN NEW;
  END IF;

  FOR v_rule IN
    SELECT *
    FROM stoqr.alert_rules
    WHERE company_id = NEW.company_id
      AND alert_type = 'low_stock'
      AND enabled = true
      AND delivery_channels && ARRAY['in_app', 'email', 'telegram', 'mattermost']::text[]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM stoqr.alert_events existing
      WHERE existing.company_id = NEW.company_id
        AND existing.rule_id = v_rule.id
        AND existing.product_id = NEW.product_id
        AND existing.folder_id = NEW.folder_id
        AND existing.status = 'open'
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO stoqr.alert_events (
      company_id,
      rule_id,
      product_id,
      folder_id,
      alert_type,
      severity,
      status,
      message,
      metadata
    )
    VALUES (
      NEW.company_id,
      v_rule.id,
      NEW.product_id,
      NEW.folder_id,
      'low_stock',
      CASE WHEN COALESCE(NEW.quantity_on_hand, 0) <= 0 THEN 'critical' ELSE 'high' END,
      'open',
      format(
        '%s in %s is at %s units, at or below its Low Stock Alert level of %s.',
        v_product.name,
        v_folder_name,
        COALESCE(NEW.quantity_on_hand, 0),
        COALESCE(NEW.reorder_point, 0)
      ),
      jsonb_build_object(
        'folder_id', NEW.folder_id,
        'folder_name', v_folder_name,
        'quantity_on_hand', COALESCE(NEW.quantity_on_hand, 0),
        'reorder_point', COALESCE(NEW.reorder_point, 0),
        'recipient_roles', COALESCE(v_rule.recipients, ARRAY[]::text[])
      )
    )
    RETURNING id INTO v_event_id;

    INSERT INTO stoqr.alert_delivery_logs (
      company_id,
      alert_event_id,
      channel,
      recipient,
      status,
      sent_at
    )
    SELECT DISTINCT
      NEW.company_id,
      v_event_id,
      'in_app',
      omr.user_id::text,
      'sent',
      timezone('utc'::text, now())
    FROM unnest(COALESCE(v_rule.recipients, ARRAY[]::text[])) AS recipient_token(token)
    JOIN stoqr.organisation_member_roles omr
      ON omr.company_id = NEW.company_id
     AND omr.role_id = replace(recipient_token.token, 'role:', '')::uuid
    WHERE v_rule.delivery_channels @> ARRAY['in_app']::text[]
      AND recipient_token.token ~* '^role:[0-9a-f-]{36}$';

    INSERT INTO stoqr.alert_delivery_logs (
      company_id,
      alert_event_id,
      channel,
      recipient,
      status
    )
    SELECT DISTINCT
      NEW.company_id,
      v_event_id,
      'email',
      NULLIF(p.email, ''),
      'pending'
    FROM unnest(COALESCE(v_rule.recipients, ARRAY[]::text[])) AS recipient_token(token)
    JOIN stoqr.organisation_member_roles omr
      ON omr.company_id = NEW.company_id
     AND omr.role_id = replace(recipient_token.token, 'role:', '')::uuid
    JOIN public.profiles p ON p.id = omr.user_id
    WHERE v_rule.delivery_channels @> ARRAY['email']::text[]
      AND recipient_token.token ~* '^role:[0-9a-f-]{36}$'
      AND NULLIF(p.email, '') IS NOT NULL;

    INSERT INTO stoqr.alert_delivery_logs (
      company_id,
      alert_event_id,
      channel,
      recipient,
      status
    )
    SELECT DISTINCT
      NEW.company_id,
      v_event_id,
      ac.provider,
      act.id::text,
      'pending'
    FROM stoqr.alert_rule_connector_targets arct
    JOIN stoqr.alert_connector_targets act ON act.id = arct.target_id
    JOIN stoqr.alert_connectors ac
      ON ac.id = act.connector_id
     AND ac.company_id = NEW.company_id
     AND ac.provider = ANY(v_rule.delivery_channels)
    WHERE arct.rule_id = v_rule.id
      AND ac.provider IN ('telegram', 'mattermost')
      AND ac.status = 'connected'
      AND act.enabled = true;

    PERFORM public.request_stoqr_alert_notification_dispatch(NEW.company_id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_stoqr_pending_alert_notifications(target_company_id UUID, batch_size INTEGER DEFAULT 25)
RETURNS TABLE (
  delivery_id UUID,
  company_id UUID,
  alert_event_id UUID,
  channel TEXT,
  recipient TEXT,
  connector_id UUID,
  connector_provider TEXT,
  target_id UUID,
  target_name TEXT,
  target_type TEXT,
  provider_target_id TEXT,
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  triggered_at TIMESTAMPTZ,
  product_name TEXT,
  product_sku TEXT,
  folder_name TEXT,
  organisation_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT adl.id
    FROM stoqr.alert_delivery_logs adl
    JOIN stoqr.alert_events ae ON ae.id = adl.alert_event_id
    WHERE adl.company_id = target_company_id
      AND adl.channel IN ('email', 'telegram', 'mattermost')
      AND adl.status = 'pending'
      AND NULLIF(adl.recipient, '') IS NOT NULL
    ORDER BY ae.triggered_at ASC, adl.id ASC
    LIMIT LEAST(GREATEST(COALESCE(batch_size, 25), 1), 100)
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE stoqr.alert_delivery_logs adl
    SET status = 'sending',
        error_message = NULL
    FROM claimed
    WHERE adl.id = claimed.id
    RETURNING adl.id, adl.company_id, adl.alert_event_id, adl.channel, adl.recipient
  )
  SELECT
    updated.id,
    updated.company_id,
    updated.alert_event_id,
    updated.channel,
    updated.recipient,
    ac.id,
    ac.provider,
    act.id,
    act.target_name,
    act.target_type,
    act.provider_target_id,
    ae.alert_type,
    ae.severity,
    ae.message,
    ae.triggered_at,
    p.name,
    p.sku,
    stoqr.folder_path_name(ae.folder_id),
    o.name
  FROM updated
  JOIN stoqr.alert_events ae ON ae.id = updated.alert_event_id
  JOIN public.organisations o ON o.id = updated.company_id
  LEFT JOIN stoqr.products p ON p.id = ae.product_id
  LEFT JOIN stoqr.alert_connector_targets act
    ON act.id = CASE
      WHEN updated.channel IN ('telegram', 'mattermost')
       AND updated.recipient ~* '^[0-9a-f-]{36}$'
      THEN updated.recipient::uuid
      ELSE NULL::uuid
    END
  LEFT JOIN stoqr.alert_connectors ac ON ac.id = act.connector_id
  ORDER BY ae.triggered_at ASC, updated.id ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_stoqr_alert_notification_delivery(
  target_delivery_id UUID,
  next_status TEXT,
  provider_message_id TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, stoqr
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF next_status NOT IN ('sent', 'failed') THEN
    RAISE EXCEPTION 'Invalid alert delivery status';
  END IF;

  UPDATE stoqr.alert_delivery_logs
  SET status = next_status,
      provider_message_id = mark_stoqr_alert_notification_delivery.provider_message_id,
      error_message = mark_stoqr_alert_notification_delivery.error_message,
      sent_at = CASE WHEN next_status = 'sent' THEN timezone('utc'::text, now()) ELSE sent_at END
  WHERE id = target_delivery_id
    AND channel IN ('email', 'telegram', 'mattermost');
END;
$$;
