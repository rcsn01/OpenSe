# Accounts App Feature Plan

## Approved Tab Changes

### Profile
- Manage personal identity details.
- Include full name, email display, username, avatar, and profile metadata used across OpenSe apps.
- Move the existing profile-name form out of the current Account Settings page into this tab.

### Security
- Manage sign-in and account protection.
- Include password changes, two-factor authentication status/setup, active sessions/devices, recovery details, and account export/deletion controls.
- Move the existing password-change form out of the current Account Settings page into this tab.

### Organisation
- Manage organisation-level identity and ownership context.
- Include organisation name, status, owner, primary contact, ownership transfer, and rename organisation flow.
- Keep role-aware controls: normal members should see organisation context, while owner/admin-only actions should be gated.

### Billing
- Rename the current "Billing & Limits" tab to "Billing".
- Keep billing controls owner/admin gated.
- Include subscription status, seat limits, checkout/plan changes, invoices, payment method, and billing contact when supported.

### Activity Log
- Add a dedicated organisation audit trail tab.
- Include invites, seat changes, billing changes, role changes, profile/security changes, and other account-level events.
- Move the existing recent billing/seat activity out of the Billing tab into this dedicated tab.

### Preferences
- Manage user-level app preferences.
- Include theme, timezone, locale, notification preferences, and default landing app.
- Move the current General appearance toggle into this tab.
