Task
Implement a mandatory post-signup organisation onboarding flow in the accounts app so that every new user completes it before reaching the main settings. The flow must enforce the following steps in order:
Check organisation invitations
After signup (and email confirmation), check whether the user has any pending organisation invitations.
If the user has invitations
Show a choice screen where they can either:
Accept one of the invitations and join that organisation, or
Decline and create their own organisation instead.
If the user has no invitations
Send them directly to the organisation creation page (no choice screen).
Organisation creation
Collect organisation details such as:
Organisation name
Estimated number of people (or similar sizing fields)
App seat allocation
Let the organisation choose which apps (e.g. ETL, StoQR) to allocate seats for. The free tier provides 5 seats per app.
Invite members
Allow the organisation to invite other people (email-based invitations).
Completion
After the flow is complete, redirect the user to the main accounts settings page.
Context
Scope: All of this lives in the accounts app (opense-stack/apps/accounts). Do not move or duplicate this flow into ETL, StoQR, or other apps.
Existing structure: The accounts app already has routes for login, register, settings, organisation, billing, and seats. Invitation logic exists in the ETL app (organisation_invites, accept_invite, getPendingInvites). You may need to move or generalise invitation handling so it works from the accounts app.
Data model: Organisations, members, app seats, and invitations are already modelled. Use the existing schema and RPCs where possible.
Free tier: The free tier is 5 seats per app. Seat limits are stored in organisation_app_seats.
Future work: RBAC and organisation management will be added later. Do not implement them in this task; focus only on the onboarding flow.
What NOT to Do
Do not implement RBAC, role-based permissions, or organisation management features beyond what is needed for this flow.
Do not add this flow to the ETL or StoQR apps; keep it only in the accounts app.
Do not allow users to skip the flow or reach settings without completing it.
Do not change the free tier seat limit (5 seats); use it as defined.
Do not implement billing or paid tiers; only the free tier and seat allocation are in scope.
Do not add features beyond the steps above (e.g. advanced org settings, audit logs, or analytics).
Do not assume invitations are app-specific; treat them as organisation-level and usable from the accounts app.
Do not duplicate invitation logic across apps; centralise it in the accounts app or shared layer.
Do not implement multi-organisation switching or org selection in this flow; focus on the first organisation only.
Do not add email verification logic; assume users have already confirmed their email before entering this flow.