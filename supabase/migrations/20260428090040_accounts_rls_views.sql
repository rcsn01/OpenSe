
-- Replace read-oriented app RPCs with direct table/view access protected by RLS.

CREATE OR REPLACE VIEW public.account_org_context
WITH (security_invoker = true)
AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  om.role AS member_role,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  o.billing_name,
  o.billing_email,
  o.billing_phone,
  om.created_at AS member_created_at
FROM public.organisation_members om
JOIN public.organisations o ON o.id = om.org_id
WHERE om.user_id = auth.uid();

CREATE OR REPLACE VIEW public.account_organisation_profile
WITH (security_invoker = true)
AS
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.status,
  om.role AS member_role,
  o.owner_id AS owner_user_id,
  owner_profile.full_name AS owner_full_name,
  owner_profile.email AS owner_email,
  o.primary_contact_name,
  o.primary_contact_email,
  o.billing_name,
  o.billing_email,
  o.billing_phone,
  o.stripe_customer_id,
  o.stripe_subscription_id,
  om.created_at AS member_created_at
FROM public.organisation_members om
JOIN public.organisations o ON o.id = om.org_id
LEFT JOIN public.profiles owner_profile ON owner_profile.id = o.owner_id
WHERE om.user_id = auth.uid();

CREATE OR REPLACE VIEW public.account_org_member_app_assignments
WITH (security_invoker = true)
AS
WITH primary_org AS (
  SELECT om.org_id
  FROM public.organisation_members om
  WHERE om.user_id = auth.uid()
  ORDER BY
    CASE om.role
      WHEN 'owner' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'editor' THEN 2
      ELSE 3
    END,
    om.created_at
  LIMIT 1
)
SELECT
  om.id AS org_member_id,
  om.org_id,
  om.user_id,
  p.full_name,
  p.email,
  om.role,
  COALESCE(
    ARRAY_REMOVE(ARRAY_AGG(mas.app_code ORDER BY mas.app_code), NULL),
    ARRAY[]::TEXT[]
  ) AS assigned_apps,
  om.created_at
FROM primary_org po
JOIN public.organisation_members om ON om.org_id = po.org_id
LEFT JOIN public.profiles p ON p.id = om.user_id
LEFT JOIN public.organisation_member_app_seats mas ON mas.org_member_id = om.id
GROUP BY om.id, om.org_id, om.user_id, p.full_name, p.email, om.role, om.created_at;

CREATE OR REPLACE VIEW public.account_org_app_seat_summary
WITH (security_invoker = true)
AS
WITH primary_org AS (
  SELECT om.org_id
  FROM public.organisation_members om
  WHERE om.user_id = auth.uid()
  ORDER BY
    CASE om.role
      WHEN 'owner' THEN 0
      WHEN 'admin' THEN 1
      WHEN 'editor' THEN 2
      ELSE 3
    END,
    om.created_at
  LIMIT 1
),
assigned AS (
  SELECT om.org_id, mas.app_code, COUNT(*) AS assigned_count
  FROM public.organisation_member_app_seats mas
  JOIN public.organisation_members om ON om.id = mas.org_member_id
  JOIN primary_org po ON po.org_id = om.org_id
  GROUP BY om.org_id, mas.app_code
),
pending AS (
  SELECT oi.org_id, ias.app_code, COUNT(*) AS pending_count
  FROM public.organisation_invite_app_seats ias
  JOIN public.organisation_invites oi ON oi.id = ias.invite_id
  JOIN primary_org po ON po.org_id = oi.org_id
  WHERE oi.accepted_at IS NULL
  GROUP BY oi.org_id, ias.app_code
)
SELECT
  po.org_id,
  a.code AS app_code,
  a.name AS app_name,
  oas.seat_limit,
  (
    COALESCE(assigned.assigned_count, 0)
    + COALESCE(pending.pending_count, 0)
  )::INTEGER AS assigned_seats
FROM primary_org po
JOIN public.apps a ON TRUE
LEFT JOIN public.organisation_app_seats oas
  ON oas.org_id = po.org_id
 AND oas.app_code = a.code
LEFT JOIN assigned
  ON assigned.org_id = po.org_id
 AND assigned.app_code = a.code
LEFT JOIN pending
  ON pending.org_id = po.org_id
 AND pending.app_code = a.code;

CREATE OR REPLACE VIEW public.account_org_audit_events
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.org_id,
  e.actor_user_id,
  actor_profile.email AS actor_email,
  actor_profile.full_name AS actor_full_name,
  e.action,
  e.app_code,
  e.target_org_member_id,
  target_profile.email AS target_user_email,
  e.metadata,
  e.created_at
FROM public.organisation_audit_events e
LEFT JOIN public.profiles actor_profile ON actor_profile.id = e.actor_user_id
LEFT JOIN public.organisation_members target_member ON target_member.id = e.target_org_member_id
LEFT JOIN public.profiles target_profile ON target_profile.id = target_member.user_id;

GRANT SELECT ON public.account_org_context TO authenticated, service_role;
GRANT SELECT ON public.account_organisation_profile TO authenticated, service_role;
GRANT SELECT ON public.account_org_member_app_assignments TO authenticated, service_role;
GRANT SELECT ON public.account_org_app_seat_summary TO authenticated, service_role;
GRANT SELECT ON public.account_org_audit_events TO authenticated, service_role;
