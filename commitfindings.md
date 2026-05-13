# Commit Review Findings

Reviewed commit `61b9d88c` (`Add alert connectors and setup helper`).

## Critical Findings

### P1: In-app-only rules can be saved with no recipients

`AlertRuleEditorPage.tsx` only requires selected roles when email is enabled. In-app delivery also depends on role recipients, but the save payload clears recipients whenever email is off.

Impact: a user can save the default in-app-enabled low-stock rule with no selected roles, creating alerts that do not notify anyone in-app.

Suggested fix:
- Require roles when either `in_app` or `email` is enabled.
- Preserve role recipients when in-app is enabled, even if email is disabled.
- Add tests for in-app-only rules with and without selected roles.

### P1: Dispatcher can strand claimed deliveries in `sending`

`send-stoqr-alert-notifications` claims pending rows before validating SMTP configuration. If a batch contains email and SMTP config is missing, the function returns a 500 before marking claimed rows as `failed` or returning them to `pending`.

Impact: claimed rows remain stuck in `sending` and will not be picked up by the claim RPC again.

Suggested fix:
- Validate SMTP before claiming rows, or mark claimed rows as failed on configuration errors.
- Add timeout-based recovery for stale `sending` rows.
- Add a test covering SMTP misconfiguration after claim.

### P1: Direct Mattermost webhook support creates arbitrary outbound fetch risk

The Edge Functions fetch `provider_target_id` directly when it looks like an HTTP URL. Any user with alert connector management permission can store an arbitrary URL and make the Edge Function call it via test integration or real alert dispatch.

Impact: this creates an SSRF-style outbound request surface from the Supabase Edge Function environment.

Suggested fix:
- Prefer routing Mattermost dispatch through the connector gateway.
- Or add an allowlist for Mattermost hostnames/domains.
- Treat webhook URLs as secrets/config, not ordinary UI-visible target IDs.

## Operational Improvements

### Remote setup can break existing dispatch if reset fails mid-flow

`setup.sh` sets/rotates Edge Function secrets before the remote DB reset and before reinserting `stoqr.alert_dispatch_config`.

Impact: if reset or config insertion fails after secret rotation, the deployed function and DB config can disagree on the dispatch token.

Suggested fix:
- Reorder remote setup to reset DB first, then deploy functions, set secrets, and insert dispatch config last.
- Print a final verification query showing dispatch config token length and function URL.

### Setup script should have dry-run and non-interactive modes

The script now performs production-impacting actions. It should be easier to run predictably and safely.

Suggested fix:
- Add `--dry-run`.
- Add non-interactive flags for CI/repeatable ops, such as `--target remote --full-reset --yes`.
- Keep destructive confirmation for interactive mode.

## Test Gaps

- In-app-only rule validation.
- Email disabled + in-app enabled should still preserve role recipients.
- Dispatch recovery for stale `sending` rows.
- SMTP misconfiguration should not strand delivery rows.
- Mattermost webhook URL validation/allowlist behavior.
