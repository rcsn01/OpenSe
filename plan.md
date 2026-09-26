# Implementation plan: Open-KB workflow actions

## Goal

Concentrate the meaning of the five Open-KB workflow actions in one typed TypeScript model and one existing logic module. Make the editor, summaries, validation, and Supabase persistence adapter agree on each action's config shape.

This is a planning document only; it does not itself change application behavior.

## Decisions resolved with the recommended defaults

The following choices are fixed for this implementation plan.

1. **Keep the stored contract and SQL execution unchanged.** The `action_type` column remains separate from the `config` JSONB payload. Existing JSON keys, action order, workflow triggers, and `kb.apply_workflow_action` behavior do not change. No migration or data rewrite is planned.
2. **Use a typed action/config relationship.** Define each action's config fields by its `action_type`, then derive persisted and input action unions so TypeScript narrows the config when it narrows the action type. Do not put a second `action_type` inside the JSON config.
3. **Validate data when it crosses the Supabase read seam.** Parse raw action rows instead of casting them. Reject a config whose known fields do not match its action type. Do not coerce malformed data into defaults or silently drop an action. Preserve unrecognized JSON keys on otherwise valid configs through edits and saves. A subtask priority with a string value is structurally valid even when it is outside `IssuePriority`: SQL deliberately normalizes unsupported values to `none`, so the editor must preserve the original string rather than making the whole rule unloadable.
4. **Keep incomplete drafts editable.** Blank editor values are draft state, not valid save input. Validate the whole rule before calling a create or update mutation. Keep the draft key local and omit it from the payload.
5. **Deepen `workflowUtils.ts`.** Keep action defaults, config parsing, action summaries, labels, and rule validation together in the existing module. Keep JSX and field rendering in `ProjectWorkflowPanel.tsx`, and keep SQL writes in `api/workflows.ts`.
6. **Test the TypeScript model and the SQL consumer.** Add focused unit coverage for all five actions and one pgTAP regression test for the existing SQL effects. Do not change SQL implementation while adding those tests.

No `CONTEXT.md`, ADR, or installed domain-modeling skill was found. `WorkflowRule` and `WorkflowAction` are already established names in TypeScript and SQL, so this change introduces no new domain term and does not need a new glossary entry.

## Existing behavior and constraints

### Current TypeScript model

`src/apps/kb/src/types/index.ts` defines `WorkflowActionType`, `WorkflowDueDateConfig`, and `WorkflowSubtaskConfigItem`. It also defines an unused `WorkflowActionConfig` union. That union flattens the action discriminator and config fields into one object, while the database stores `action_type` and `config` separately. The actual `WorkflowRuleAction.config` and `WorkflowRuleActionInput.config` types are `Record<string, unknown>`.

`src/apps/kb/src/lib/workflowUtils.ts` owns action and trigger labels, action and trigger summaries, and rule validation. Validation accepts open records and casts subtask fields. Its tests cover summaries for only three action types and have limited validation cases.

`src/apps/kb/src/components/projects/ProjectWorkflowPanel.tsx` owns the five default config shapes in `emptyAction`, converts saved actions into editor drafts, and handles action-specific fields. It casts selected profile IDs and subtask arrays because the action/config relationship is not represented in the types. Several config updates replace the full config object, which would discard opaque fields. Save currently maps draft data into action inputs and runs `validateWorkflowRuleInput` before calling the mutation.

`src/apps/kb/src/api/workflows.ts` reads action rows, casts them to `WorkflowRuleAction[]`, groups them by rule, and writes the config JSON unchanged. This file is the Supabase persistence adapter and the right place to turn untrusted database rows into validated application values.

### SQL contract

`kb.workflow_rule_actions` has a checked `action_type` column and an unconstrained `config JSONB` column. The SQL action runner consumes these shapes:

| `action_type` | `config` JSON |
| --- | --- |
| `assign_users` | `{ "profile_ids": string[] }` |
| `assign_team` | `{ "team_id": string }` |
| `set_due_date` | `{ "mode": "absolute", "date": string }` or `{ "mode": "relative", "days": number }` |
| `add_comment` | `{ "text": string }` |
| `create_subtasks` | `{ "items": [{ "title": string, "state_id"?: string, "priority"?: string }] }` |

The issue trigger is `AFTER INSERT OR UPDATE OF state_id`. On insert it runs matching enabled, nondeleted `issue_created` rules whose state is unset or equals the new issue state. On update it runs matching enabled, nondeleted `state_entered` rules only when the state actually changes, and only for the destination state. Deleted issues are ignored. Rules and actions are ordered by `sort_order, created_at`; the transaction-local skip flag suppresses nested workflow runs caused by actions, including creation of child issues.

The runner adds only missing active assignees (and casts profile IDs to UUID); a missing `profile_ids` key means an empty array. `assign_team` is a no-op for a missing, null, or empty `team_id`; otherwise it casts and updates the issue, and the issue-team trigger rejects deleted or cross-organisation teams. Absolute due dates are cast to `DATE` only when nonempty; relative offsets run only when their text matches a signed integer, then cast to PostgreSQL `integer` and add to `CURRENT_DATE`. Other modes or non-integer offset text are no-ops. An in-range integer can still overflow PostgreSQL's `DATE` range during addition. Comments and subtask titles are trimmed, and blank values are skipped. Subtask `state_id` missing, null, or empty becomes SQL `NULL`—the workflow runner does not choose a project default state—while a nonempty value is cast to UUID. Missing or empty priority falls back to the parent priority (then `none`); any unsupported nonempty priority, including whitespace, becomes `none` (SQL does not trim priority before that check). Invalid UUID/date casts and valid-format IDs that fail foreign-key or team-scope checks can abort issue processing. Keep these execution rules unchanged.

### Test coverage today

- `src/apps/kb/src/lib/__tests__/workflowUtils.test.ts` tests a few summaries and a small set of rule validation cases.
- `src/tests/tests/apps/kb/interactions.spec.ts` creates one `add_comment` rule against a mocked Supabase fixture. It does not execute the SQL workflow trigger.
- `supabase/tests/open_kb_schema_invariants_test.sql` checks that workflow tables exist. There is no SQL action-execution test.
- `pnpm db:test` runs the Supabase SQL test suite from `src/package.json`.

## Target design

### 1. Make the action types describe the stored shape

In `src/apps/kb/src/types/index.ts`:

- Define one config map keyed by `WorkflowActionType`. The map's values are payload-only configs. Keep `action_type` outside each payload.
- Derive `WorkflowActionType` from the map keys so adding or removing an action has one source of truth.
- Derive a discriminated action payload union in which each `action_type` selects exactly one config type. Use that union for `WorkflowRuleAction` and `WorkflowRuleActionInput`, adding the existing row metadata or optional `sort_order` around it.
- Keep the existing subtask `state_id` and `priority` fields in the type even though the current editor does not expose a priority control. Type stored priority as `string | null`, not `IssuePriority`: SQL accepts any string and maps unsupported nonempty values to `none`, so narrowing or rejecting them would block editing a rule whose existing execution is defined. Do not add a priority UI field.
- Remove the unused `WorkflowActionConfig` export. A repository-wide search found no imports, and retaining a compatibility alias would keep an unnecessary second public type.
- Add a separate editor draft type that combines the typed action payload with its ephemeral key. A draft may contain empty strings, empty arrays, or an empty subtask title. Those values remain subject to save-time validation.

The resulting relationship should be equivalent to:

```ts
type WorkflowActionConfigByType = {
  assign_users: { profile_ids: string[] }
  assign_team: { team_id: string }
  set_due_date: WorkflowDueDateConfig
  add_comment: { text: string }
  create_subtasks: { items: WorkflowSubtaskConfigItem[] }
}

type WorkflowActionPayload = {
  [K in keyof WorkflowActionConfigByType]: {
    action_type: K
    config: WorkflowActionConfigByType[K]
  }
}[keyof WorkflowActionConfigByType]
```

Keep action metadata such as `id`, `rule_id`, `sort_order`, and timestamps on the saved row type. Keep `sort_order` optional on inputs as it is today.

### 2. Put action-specific decisions in `workflowUtils.ts`

Deepen the existing module rather than adding a wrapper module. Keep its interface small and behavior-focused. It should own:

- The action and trigger labels already used by the panel.
- A typed factory for the initial config for each action. The panel may continue to generate the ephemeral draft key locally.
- A parser that takes the raw `action_type` and `config` values from a database row and returns a typed action payload or throws a clear, action-specific error.
- The existing summary behavior, updated to accept the discriminated action union and handle every variant exhaustively.
- Rule validation, updated to inspect each typed config without casts while preserving the existing user-facing messages exactly: `Rule name is required`, `Select a status for this trigger`, `Add at least one action`, `Select at least one user to assign`, `Select a team to assign`, `Select a due date`, `Enter a due date offset`, `Comment text is required`, and `Add at least one subtask title`. Use `Select a due date` for blank/invalid absolute dates and `Enter a due date offset` for non-integer/out-of-range relative values.

The parser should reject an unknown action type, a non-object config, a root-level `action_type` key inside config, an invalid due-date mode, a `set_due_date` config containing the inactive mode's known field (`days` in absolute mode or `date` in relative mode), a missing required field, or a known field with the wrong runtime type. It must not fill missing fields with defaults. Validate formats for values the SQL casts: every `profile_ids` entry and every nonempty `team_id` or `state_id` must use the canonical hyphenated UUID spelling emitted by Supabase; a nonempty absolute date must be a real four-digit `YYYY-MM-DD` calendar date; and `days` must be an integer within PostgreSQL's integer range. The canonical UUID/date spelling is the existing editor's stored contract; reject alternate PostgreSQL-parseable spellings rather than normalizing them. Accept and preserve `null` or empty optional subtask `state_id` values without normalization because SQL treats them as absent. Validate every subtask item's known fields even when its title is blank: SQL skips a blank-title item before casting its state ID, but the read parser intentionally rejects malformed known fields instead of passing them into an editable draft. Do not require a database lookup for referenced IDs. Require a subtask `priority` value, when present, to be a string or `null`, but preserve any string verbatim; the SQL runner's existing fallback to `none` for unsupported nonempty priorities is part of the stored behavior. Preserve extra JSON keys on an otherwise valid config by copying the original object and replacing only validated known fields. Unknown keys remain opaque to the UI and SQL, but must survive an edit/save round trip.

Keep structural parsing separate from save validation. Parsing answers whether the stored value has the expected shape and cast-safe formats. Rule validation answers whether the draft is usable, such as requiring a team, a selected user, a nonblank comment, a valid date, or at least one nonblank subtask title. Save validation must independently reject an invalid absolute date and a relative `days` value that is not an integer within PostgreSQL's integer range; the read parser does not validate newly edited drafts. Do not add new action behavior or restrictions such as a due-date range. Keep signed integer day offsets supported by the SQL contract, even though the current editor input has `min={0}`. Keep all other accepted values consistent with the existing editor and SQL runner.

### 3. Parse database rows in the persistence adapter

In `src/apps/kb/src/api/workflows.ts`:

- Treat action rows returned from Supabase as raw data at the adapter. Do not cast `actions` directly to `WorkflowRuleAction[]`.
- For each row, pass `action_type` and `config` through the parser, then attach the validated action to the existing typed metadata and group it under its rule.
- Keep ordering, deleted-row filtering, rule normalization, soft-delete behavior, insert columns, and mutation sequencing unchanged.
- Continue writing `action_type` as its own database column and `config` as the payload object. Never serialize the editor key or nest `action_type` inside config.
- Preserve opaque extra config keys when a user edits another field. In the panel, update known fields by spreading the existing config first. For subtask edits, also spread the existing item so `priority` and any unrecognized item keys survive.

If parsing fails, allow the query to fail with a useful error that identifies the action and problem field without logging the raw config. Do not silently skip the row or partially load the rule list.

### 4. Make the editor use the typed draft

In `src/apps/kb/src/components/projects/ProjectWorkflowPanel.tsx`:

- Replace the local open-record `DraftAction` with the typed draft union plus `key`.
- Replace the local config switch in `emptyAction` with the factory from `workflowUtils.ts`; keep `nextDraftActionKey` local.
- Let `action.action_type` narrow the config in each editor branch. Remove the casts around `profile_ids` and `items` and the `Array.isArray` fallback branches that compensate for open records.
- Preserve extra config and subtask-item keys when editing a field. When switching the due-date mode, remove the inactive known `date`/`days` field, initialize the active mode's field, and retain unrelated opaque keys. Switching an action type intentionally creates the new action's defaults and does not carry the old action's config across types. Keep an empty subtask state as `state_id: null`; the current “Default state” option does not cause SQL to select a project default state.
- Keep blank and incomplete drafts editable. On save, build the persisted input explicitly from `action_type`, `config`, and computed `sort_order`; do not spread the draft object into the payload. This keeps `key` out of persistence.
- Keep validation before the mutation call and preserve existing toast behavior.
- Read and display the workflow query error. A malformed row or network failure must show a load error, not the current empty-rules state. Include a Retry button wired to the query's existing `refetch`; it requires no new query abstraction. Disable rule creation/editing and saving while the query is in its failed state so stale or missing rules cannot be overwritten.

Do not change the project shell, spacing, action labels, or form layout. This work does not need a layout exception or shared UI changes.

## Implementation sequence

### Phase 1: Lock the contract with tests

Update `workflowUtils.test.ts` first. Add fixtures that use the existing SQL JSON shape and cover every action type. Add failing tests for the typed config map, action defaults, summary coverage, save validation, and raw-config parsing before changing implementation.

The test cases should include:

- One valid config for each action, including both due-date modes and subtask `state_id`/`priority` fields.
- Incomplete editor drafts that remain editable, with blank values rejected at save while the default relative due date of seven days remains valid. Test save validation independently from structural parsing: empty config fields can parse as correctly typed drafts, but cannot pass save validation. Save validation rejects blank/invalid absolute dates, fractional or out-of-integer-range relative offsets, and accepts signed integer endpoints without imposing an extra date-range cap.
- For every required config field in every action type, test both omission and a wrong runtime type. Also test malformed UUID/date/integer values, and a config that is `null`, an array, or a primitive JSON value; test a root-level `config.action_type` key, both date-mode mismatches (including both keys present), an invalid due-date mode, and an unsupported action type. Each malformed value must fail clearly without coercion. Test canonical valid UUID/date boundary cases as well: valid leap date versus invalid calendar dates, canonical UUID syntax independent of UUID version/variant, and PostgreSQL integer min/max versus values just outside that range. Empty optional state IDs remain `null` or empty in parsed config and both mean no override; an empty team ID parses structurally but fails save validation. A blank-title item with a malformed known optional field still fails parsing even though SQL would skip that row before consuming those fields. Unsupported nonempty priority strings are the exception: they parse and round-trip unchanged because SQL maps them to `none`.
- Blank subtask rows alongside a nonblank row remain in the payload and do not make save validation fail; the validator does not filter or rewrite the array. SQL's handling of blank titles is asserted in the pgTAP test, not inferred from a TypeScript unit test.
- Extra config and subtask-item keys survive parsing and serialization; verify actual edit-style preservation in the panel interaction test, not by testing object-spread behavior in a utility test.
- Summaries for all five actions and action labels for the full `WorkflowActionType` set. Preserve summary semantics: user/subtask counts describe configured IDs/items, not effects actually performed by SQL; in particular, assert that a subtask summary counts a blank row and that duplicate configured user IDs remain counted even though SQL does not add duplicate assignments.
- Compile-time examples for all five valid discriminated variants. The application typecheck must reject a config paired with the wrong action type.

Keep the tests focused on the public behavior of `workflowUtils.ts`, not its private helpers.

### Phase 2: Type and utility implementation

Implement the type map and correlated unions in `types/index.ts`. Then update `workflowUtils.ts` to use those types, add the action config factory/parser, make summary handling exhaustive, and validate each action without `Record<string, unknown>` casts. Keep trigger logic unchanged; make only the type adjustments required to compile.

### Phase 3: Adapt reads and writes

Update `api/workflows.ts` to parse raw rows and return typed actions. Keep the JSON values and keys unchanged for supported configs. Do not add a separate adapter-test mocking framework: the existing Playwright Supabase route fixture handles workflow action reads, inserts, and updates, so exercise the real adapter through that fixture. Verify `createWorkflowRule` and `updateWorkflowRule` still write the same separate `action_type` and `config` fields and retain `sort_order`.

### Phase 4: Type the editor and load errors

Update the draft conversion, action editor branches, field update handlers, and payload construction in `ProjectWorkflowPanel.tsx`. Add the query error state so a failed parse cannot look like an empty project. Extend the existing mocked Playwright workflow test and route fixture (seed one selectable team) with these three scenarios:

1. Create a rule containing all five action types and both due-date modes. Capture the `workflow_rule_actions` insert body and verify the six action rows retain the existing JSON payload shapes, contain no draft keys or nested action discriminator, and have the expected `sort_order` values.
2. Seed a valid saved rule with config-level and subtask-item opaque keys, including an unsupported priority string such as `critical`. Reopen/edit/reload it, edit a known field at each level, and switch a due-date action between modes. Assert opaque keys and the priority string survive in the saved request while the inactive known `date`/`days` field is removed.
3. Seed both a malformed action response and a network error response. For each failure type, verify it shows the load-error state with no Add/Edit/Save path. The app constructs `QueryClient` with no retry override, so browser queries make the initial request plus three automatic retries by default. Serve failures for all four attempts and make the response valid only for the manual Retry; do not disable retries globally for the test. Verify Retry recovers and the rules render.

### Phase 5: Add SQL contract coverage

Add `supabase/tests/open_kb_workflow_actions_test.sql` as a pgTAP test. Use transactional fixtures for an organization, project, issues, profiles, team, states, workflow rules, and actions. Exercise both trigger paths: an `issue_created` rule on insert (including its optional state filter, with matching and nonmatching initial states) and a `state_entered` rule that fires only on a change to its destination state, not on an update that leaves the state unchanged. Assert the resulting assignments, team, absolute and safe positive/negative relative due dates, trimmed nonblank comment insertion, blank-comment skipping, and child-issue creation without recursive workflow execution. For subtasks, assert blank titles are skipped before SQL attempts to cast an invalid state ID, and nonblank titles are trimmed; missing/null/empty state IDs produce SQL `NULL` (not a project default state); missing/null/empty priority inherits the parent priority, and unsupported nonempty priority—including whitespace-only text—becomes `none`. Assert a previously active assignment is not duplicated. Use in-scope profile/team/state IDs so the regression test verifies the action payload contract rather than unrelated reference failures. Roll the fixtures back with the test transaction.

This test protects the TypeScript model from drifting away from the real JSON consumer. It does not authorize edits to `kb.apply_workflow_action`, its triggers, table constraints, or migrations in this work.

## Verification and acceptance

Run these checks after implementation:

```sh
pnpm --dir src/apps/kb exec vitest run src/lib/__tests__/workflowUtils.test.ts
pnpm --dir src/apps/kb test
pnpm --dir src/apps/kb typecheck
pnpm --dir src/apps/kb exec eslint src/types/index.ts src/lib/workflowUtils.ts src/lib/__tests__/workflowUtils.test.ts src/api/workflows.ts src/components/projects/ProjectWorkflowPanel.tsx
pnpm --dir src test:e2e -- tests/tests/apps/kb/interactions.spec.ts --grep workflow
pnpm --dir src db:test
```

The change is complete when:

- TypeScript callers cannot pair an action type with another action's config.
- Raw database config is parsed before it reaches the editor; no direct cast remains at the read adapter.
- No `profile_ids` or subtask-array casts remain in the workflow editor.
- The five action payloads still match the current SQL keys and stay in the same separate-column/JSON shape.
- Opaque extra JSON keys survive an edit/save; the editor key never reaches the database.
- Malformed stored config produces a visible load error, not an empty-state message or an automatically repaired record.
- Unit, browser, and database tests cover the relevant workflow path.
- No schema migration or SQL execution change is needed for this typed-action refactor; the pre-existing reference-scope security gap described below remains outside its implementation scope.

The baseline command `pnpm --dir src/apps/kb typecheck` currently reports three existing diagnostics: `ProjectWorkflowPanel.tsx(502,33)` (`Dialog.onOpenChange` is not a `DialogProps` member), `ProjectWorkflowPanel.tsx(502,48)` (implicit `open` parameter), and `ProjectDetailPage.tsx(249,9)` (unused `labels`). Do not fold those unrelated fixes into this work. Require that implementation adds no diagnostics; if typecheck remains red, report these exact baseline failures separately.

## Risks and exclusions

- The database constrains `action_type` but not the JSON shape. The read parser prevents malformed stored actions from reaching the editor; panel save validation checks drafts, while the SQL runner remains the execution authority. Direct SQL writes can still create malformed configs; database-side constraints are outside this plan. The strict editor parser intentionally accepts only canonical UUID/date spellings emitted by the current UI, although PostgreSQL may cast other spellings.
- TypeScript can validate UUID syntax but cannot establish that an ID still exists or is usable in this organization/project. Missing profiles/states/teams can fail foreign keys; a deleted or cross-organisation team can fail the issue-team trigger. More importantly, current SQL checks only profile existence when assigning a user, not organization membership, and it does not check that a subtask state belongs to the parent project. The action table also has only a foreign key on `rule_id`, while its write RLS checks the row's organization/project and the workflow trigger loads actions by `rule_id` alone. An authorized editor who knows another rule's UUID can therefore write an action row scoped to their own project but linked to that other rule; the other rule will execute it. `workflow_rule_actions` RLS allows authorized project editors to write arbitrary JSON, while `kb.apply_workflow_action` is `SECURITY DEFINER`; crafted requests with an existing cross-organisation profile or another project's state can bypass the TypeScript UI entirely and still be accepted by SQL. These are pre-existing trust-boundary gaps that the typed refactor does not fix. Do not describe UI selectors or the read parser as enforcement. Track SQL-side validation of action/rule organization and project consistency, same-organization/open-KB-seat profile validation, and same-project state validation as a separate security change before relying on these configs against untrusted project editors. Cover valid same-scope references in this plan's SQL regression test.
- Relative offsets within PostgreSQL's integer range are not necessarily safe for `CURRENT_DATE + days`: values near the integer extremes can overflow PostgreSQL's `DATE` range. The existing UI/SQL behavior has no due-date cap; preserve it and document this remaining execution failure rather than adding a new arbitrary offset limit or duplicating date arithmetic in TypeScript.
- The SQL runner casts IDs and absolute dates. Configs with malformed values can break a later issue operation. Use UI-selected IDs and valid date inputs for this regression test, while treating the UI controls as usability constraints rather than a security boundary. Do not add a second, divergent SQL validator in TypeScript; the separate SQL-side scope-validation follow-up above is required to enforce tenant boundaries.
- Preserving unknown keys requires every editor update to copy the existing config or subtask item before changing a known field. Tests must cover both config-level and item-level preservation.
- The first strict parse may expose pre-existing malformed rows. The panel must identify a load failure without silently changing saved data. A repair or migration tool is a separate task.
- Adding a sixth action later requires coordinated changes to the type map, editor defaults and fields, validation, summaries, the database action-type check, SQL execution, and tests. Keep that checklist in the implementation review.

Out of scope: moving action execution from SQL to TypeScript; changing JSON keys or table columns; adding an action type or editor field; changing workflow triggers, action order, blank-comment/subtask handling, due-date rules, or priority fallback; fixing unrelated package diagnostics; and changing app layout.
