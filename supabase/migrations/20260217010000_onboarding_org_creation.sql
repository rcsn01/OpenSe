-- ============================================================
-- Onboarding: estimated_people + free tier org creation
-- ============================================================

-- Add estimated_people for organisation sizing (optional)
ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS estimated_people INTEGER;

COMMENT ON COLUMN public.organisations.estimated_people IS 'Estimated number of people in the organisation (onboarding sizing).';

-- RPC: Create free-tier organisation (5 seats per selected app)
CREATE OR REPLACE FUNCTION public.accounts_create_free_tier_organisation(
  p_name TEXT,
  p_estimated_people INTEGER DEFAULT NULL,
  p_app_codes TEXT[] DEFAULT ARRAY['etl', 'stoqr']
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_org_member_id UUID;
  v_app TEXT;
  v_free_tier_seats INTEGER := 5;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- User must not already have org membership
  IF public.get_primary_org_for_user(v_user_id) IS NOT NULL THEN
    RAISE EXCEPTION 'User already has an organisation membership';
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Organisation name is required';
  END IF;

  -- Validate app codes
  IF p_app_codes IS NULL OR array_length(p_app_codes, 1) IS NULL THEN
    p_app_codes := ARRAY['etl', 'stoqr'];
  END IF;

  FOREACH v_app IN ARRAY p_app_codes
  LOOP
    IF v_app IS NULL OR v_app NOT IN (SELECT code FROM public.apps) THEN
      RAISE EXCEPTION 'Invalid app code: %', v_app;
    END IF;
  END LOOP;

  -- Create organisation
  INSERT INTO public.organisations (name, owner_id, estimated_people)
  VALUES (trim(p_name), v_user_id, p_estimated_people)
  RETURNING id INTO v_org_id;

  -- Trigger ensures owner member + default 0 seats. Update selected apps to free tier (5 seats).
  UPDATE public.organisation_app_seats
  SET seat_limit = v_free_tier_seats
  WHERE org_id = v_org_id
    AND app_code = ANY(p_app_codes);

  -- Assign owner seats for selected apps
  SELECT id INTO v_org_member_id
  FROM public.organisation_members
  WHERE org_id = v_org_id AND user_id = v_user_id
  LIMIT 1;

  IF v_org_member_id IS NOT NULL THEN
    INSERT INTO public.organisation_member_app_seats (org_member_id, app_code)
    SELECT v_org_member_id, unnest(p_app_codes)
    ON CONFLICT (org_member_id, app_code) DO NOTHING;
  END IF;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accounts_create_free_tier_organisation(TEXT, INTEGER, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accounts_create_free_tier_organisation(TEXT, INTEGER, TEXT[]) TO authenticated;
