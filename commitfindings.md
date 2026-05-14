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

---

Reviewed commits:
- `bec24846` Prefix Mattermost messages with @all
- `35f133b4` Create commitfindings.md
- `61b9d88c` Add alert connectors and setup helper

## Additional Findings From Three-Commit Review

### P1: Rule-selected connector targets are ignored at dispatch creation

`stoqr.evaluate_low_stock_alerts()` stores pending chat deliveries for every enabled organisation target matching the rule's enabled provider. It does not join through `stoqr.alert_rule_connector_targets`, so the per-rule connector target selection made by the editor is ignored.

Impact: a rule intended to notify one Telegram, Mattermost, or WhatsApp destination can fan out to all enabled organisation targets for that provider.

Suggested fix:
- Join `stoqr.alert_rule_connector_targets` when creating chat delivery rows.
- Keep `alert_rules.delivery_channels` as the provider-level enable/disable switch.
- Treat `alert_rule_connector_targets` as the destination allowlist for the rule.
- Add SQL or API coverage proving a rule only creates deliveries for selected targets.

### P1: Documentation uses shared placeholder dispatch and gateway tokens

The chat connector and email setup docs show `CONNECTOR_GATEWAY_TOKEN='change-me'` and `STOQR_ALERT_DISPATCH_TOKEN='change-me-too'` in deployable command snippets.

Impact: because `send-stoqr-alert-notifications` has JWT verification disabled and relies on the dispatch token, copy-pasted placeholder tokens would expose alert dispatch to anyone who learns or guesses the placeholder. The setup script generates a dispatch token, but it does not generate or enforce a gateway token.

Suggested fix:
- Replace deployable placeholder token snippets with generated-token commands.
- Extend setup automation to generate and set `CONNECTOR_GATEWAY_TOKEN`.
- Add a startup check or docs warning that production must not run with placeholder tokens.

### P2: New Edge Functions lack direct tests

Frontend API tests assert calls to `send-stoqr-alert-notifications` and `manage-stoqr-alert-connectors`, but there are no direct tests for the Edge Function auth, claim/mark behavior, provider failure paths, Mattermost webhook handling, or returned errors.

Impact: regressions in the dispatch and connector management boundary can ship with only frontend invocation coverage.

Suggested fix:
- Add direct function tests with mocked `fetch`, `Deno.env`, and SMTP/gateway behavior.
- Cover authorized and unauthorized calls, successful dispatch, provider failure, and marking failed rows.

### P2: Connector gateway accepts unbounded bodies and returns raw errors

The connector gateway buffers request bodies without a size limit and returns raw provider/library error messages in 500 responses.

Impact: a public gateway has a memory pressure risk and can leak operational/provider details through API responses.

Suggested fix:
- Add a modest JSON body limit.
- Return generic client-safe errors while logging detailed provider errors server-side.
- Validate dispatch payload shape before provider calls.

### P3: WhatsApp dependency brings maintenance and supply-chain risk

The connector app depends on deprecated `@whiskeysockets/baileys`, which pulls GitHub tarball transitive dependencies.

Impact: this increases maintenance and supply-chain risk for a production service that stores WhatsApp linked-device sessions.

Suggested fix:
- Evaluate migration to the renamed `baileys` package.
- Pin and audit transitive dependencies.
- Document that WhatsApp support is operationally sensitive and session storage must be protected.
