BEGIN;

DO $$
DECLARE
  v_company_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_rule_id UUID := '0a100000-0000-4000-8000-000000000001';
  v_product_id UUID := '0a100000-0000-4000-8000-000000000002';
  v_connector_id UUID := '0a100000-0000-4000-8000-000000000003';
  v_selected_target_id UUID := '0a100000-0000-4000-8000-000000000004';
  v_unselected_target_id UUID := '0a100000-0000-4000-8000-000000000005';
  v_event_id UUID;
  v_delivery_count INTEGER;
  v_selected_delivery_count INTEGER;
BEGIN
  INSERT INTO stoqr.alert_connectors (
    id,
    company_id,
    provider,
    display_name,
    status
  )
  VALUES (
    v_connector_id,
    v_company_id,
    'mattermost',
    'SQL test Mattermost',
    'connected'
  );

  INSERT INTO stoqr.alert_connector_targets (
    id,
    connector_id,
    target_type,
    target_name,
    provider_target_id,
    enabled
  )
  VALUES
    (
      v_selected_target_id,
      v_connector_id,
      'webhook',
      'Selected webhook',
      'selected-webhook',
      true
    ),
    (
      v_unselected_target_id,
      v_connector_id,
      'webhook',
      'Unselected webhook',
      'unselected-webhook',
      true
    );

  INSERT INTO stoqr.alert_rules (
    id,
    company_id,
    name,
    alert_type,
    enabled,
    condition,
    delivery_channels,
    recipients
  )
  VALUES (
    v_rule_id,
    v_company_id,
    'SQL selected target test',
    'low_stock',
    true,
    '{"thresholdSource":"product_reorder_point"}'::jsonb,
    ARRAY['mattermost']::text[],
    ARRAY[]::text[]
  );

  INSERT INTO stoqr.alert_rule_connector_targets (
    rule_id,
    target_id
  )
  VALUES (
    v_rule_id,
    v_selected_target_id
  );

  INSERT INTO stoqr.products (
    id,
    company_id,
    name,
    sku,
    quantity_on_hand,
    reorder_point
  )
  VALUES (
    v_product_id,
    v_company_id,
    'SQL selected target reagent',
    'SQL-TARGET-TEST',
    1,
    5
  );

  SELECT ae.id
  INTO v_event_id
  FROM stoqr.alert_events ae
  WHERE ae.rule_id = v_rule_id
    AND ae.product_id = v_product_id;

  IF v_event_id IS NULL THEN
    RAISE EXCEPTION 'Expected low-stock alert event to be created';
  END IF;

  SELECT count(*)
  INTO v_delivery_count
  FROM stoqr.alert_delivery_logs adl
  WHERE adl.alert_event_id = v_event_id
    AND adl.channel = 'mattermost';

  SELECT count(*)
  INTO v_selected_delivery_count
  FROM stoqr.alert_delivery_logs adl
  WHERE adl.alert_event_id = v_event_id
    AND adl.channel = 'mattermost'
    AND adl.recipient = v_selected_target_id::text;

  IF v_delivery_count <> 1 OR v_selected_delivery_count <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one Mattermost delivery for selected target %, got total %, selected %',
      v_selected_target_id,
      v_delivery_count,
      v_selected_delivery_count;
  END IF;
END;
$$;

ROLLBACK;
