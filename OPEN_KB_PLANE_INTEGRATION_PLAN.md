# Open-KB Plane Integration Plan

## Baseline

Open-KB will be a new OpenSe app that reimplements Plane-style project management inside this suite. The source reference is `makeplane/plane` on the `preview` branch, with GitHub showing latest release `v1.3.1` on 2026-05-14 at planning time. Pin the implementation audit to a commit SHA before writing migrations.

OpenSe already owns identity, organisations, billing, seats, and app switching through Supabase:

- Auth users live in `auth.users`.
- Shared user profile rows live in `public.profiles`.
- Shared tenancy lives in `public.organisations`, `public.organisation_members`, app seats, and invites.
- App-specific data is already isolated by schema (`etl`, `stoqr`).

Use the same pattern for Open-KB:

- Product name: `Open-KB`.
- App key: `open-kb`.
- SQL schema: `open_kb`.
- Frontend app: `src/apps/open-kb`.
- Shared product/domain package, if needed: `src/packages/shared/src/open-kb/*`.

## Current Implementation Status

Implemented:

- Open-KB app shell in `src/apps/open-kb`, registered in the app switcher and package workspace.
- Organisation-scoped schema in `open_kb`, with projects belonging directly to `public.organisations`.
- Plane product table coverage without Plane auth/session/workspace tables.
- Open-KB roles, permissions, feature flags, app seats, storage bucket, RLS, and demo seed data.
- Project list/create/detail/settings, project members, states, labels, and role/permission settings.
- Project-level configurable tabs backed by `open_kb.project_tabs`, with shared per-project tab order, `List` as the required non-removable tab, add/remove/move controls gated by `projects.edit`, legacy `/projects/:projectId/issues` normalization to `/list`, and project routes for overview, list, board, timeline, dashboard, calendar, workflow, messages, note, gantt, workload, files, drafts, cycles, modules, estimates, pages, and settings.
- Project-scoped tab content now reuses existing issue list/board/calendar/gantt views, planning/page/settings surfaces, issue attachments for files, a project note page marker, project dashboard/workflow/workload summaries, and a local rich-text project message thread in `open_kb.project_messages`.
- Issue list, board, richer filters, saved views, create/detail/edit, draft issues, comments, labels, assignees, mentions, attachments, blockers, relations, external links, subscribers, votes, issue/comment reactions, favorites, recent visits, and activity timeline.
- Issue table, calendar, and Gantt-style views implemented on the shared filtered issue dataset, with saved-view support for every issue layout.
- Bulk issue selection and edits, plus filtered issue CSV export and selected-project CSV issue import.
- Planning surfaces for cycles, modules, estimates, intake, analytics, pages, page version history, stickies, and local rich text editor implementation using upstream Tiptap/ProseMirror packages.
- Richer analytics covering overdue and due-soon work, due-date health, completion trend, completion rate, and average completion age.
- Notification inbox, mark-read actions, activity-to-subscriber notification fanout, and per-user issue notification preference toggle.
- Organisation-level teams for grouping projects without reintroducing Plane workspaces, including team CRUD, project assignment, project list filtering, RLS hardening, and same-organisation project/team validation.
- Deploy/public boards with project-level board management, limited anonymous read-only RPCs, and a public board route that only renders active boards for public projects.
- API token UX behind the disabled-by-default feature flag, with browser-generated raw tokens, SHA-256 hash storage, copy-once display, metadata listing, and revoke controls.
- Webhook management and delivery-log review in Settings, with HTTPS endpoints, hashed signing secrets, service-role-only log writes, and authenticated log review gated by `automation.manage`.
- GitHub/Slack integration setup behind disabled-by-default feature flags, including repository/channel mapping UI, OAuth start/callback Edge Functions with signed short-lived state, hashed provider token storage, service-role-only sync event writes, and signed inbound Supabase Edge Function endpoints for GitHub and Slack events.
- Inbound GitHub/Slack endpoints now re-check organisation feature flags at ingest time; GitHub sync logs have provider-event idempotency indexes and duplicate delivery handling.
- Internal GitHub/Slack sync worker Edge Functions can process received provider events into local Open-KB issues and issue comments using idempotent external IDs, while remaining gated by worker secret and organisation feature flags.
- GitHub/Slack sync workers now keep first-class attempt counts, `next_retry_at`, `processed_at`, and `last_error_text`, select only due rows, respect provider `Retry-After` rate-limit responses, isolate per-row failures, and move exhausted rows to `failed`.
- GitHub/Slack OAuth callbacks now store provider token hashes on user-visible integration rows and encrypted provider credentials in a service-role-only `open_kb.integration_credentials` vault keyed by `OPEN_KB_INTEGRATION_CREDENTIAL_KEY`; raw provider credentials are not stored in client-readable tables.
- GitHub sync worker can process outbound comment rows (`sync_direction = 'outbound'`, `status = 'outbound_pending'`) by decrypting the stored GitHub credential, resolving the mapped GitHub issue number, posting the Open-KB comment to GitHub, and applying the same per-row retry/backoff handling.
- Open-KB issue comment creation now attempts a non-blocking outbound GitHub comment enqueue through `open_kb.enqueue_github_comment_sync(comment_id)`, a permission-checked RPC that validates the caller, feature flag, project access, repository mapping, and GitHub issue mapping before inserting a service-role-only sync row.
- Open-KB issue comment creation also attempts a non-blocking outbound Slack enqueue through `open_kb.enqueue_slack_comment_sync(comment_id)`, fanning out one queued outbound message per mapped project Slack channel with permission checks, feature-flag gating, and idempotent duplicate protection.
- Slack sync worker now separates inbound channel events from outbound message rows, decrypts the stored Slack credential, posts queued Open-KB comments via `chat.postMessage`, and records provider timestamps with the same retry/backoff handling.
- Settings now includes an outbound provider sync queue review surface for GitHub/Slack comment sync rows, including status, attempt count, next retry/processed timestamps, last error display, and a permission-checked manual retry action through `open_kb.retry_provider_sync(provider, sync_id)`.
- Settings now exposes provider connection status with reconnect and disconnect controls; disconnect uses `open_kb.disconnect_provider_integration(org_id, provider)` to revoke service-role-only encrypted credential rows, clear visible token hashes, mark the integration disconnected, and pause/disable related mappings.
- Repeatable pgTAP database tests cover Open-KB auth/workspace migration exclusions, RLS enablement, service-role-only sync writes, SECURITY DEFINER exposure, self-contained permission behavior, and attachment storage policy boundaries.
- Playwright route coverage now exercises Open-KB public board, dashboard, project, issue, draft, planning, page, intake, analytics, notification, settings, and wildcard routes with a mocked Supabase backend.
- Stateful Playwright interaction coverage now exercises organisation-scoped project creation, issue creation, issue update, rich text comment creation, auth/seat bootstrap, public-board RPC data, and mocked PostgREST mutations.
- Fixed the issue detail recent-visit effect so it no longer loops on mutation-object identity and blocks save/comment submissions.
- Expanded pgTAP role-matrix coverage now exercises Owner, Admin, Editor, Viewer, default member, no-seat, and cross-organisation users against real Open-KB RLS reads/writes for projects, issues, settings permissions, and storage assets.
- Local dev server now defaults to `127.0.0.1`, allows `OPEN_KB_DEV_HOST` / `OPEN_KB_DEV_PORT` overrides, and falls forward when port `5995` is already occupied.

Still to implement for fuller Plane parity:

- Broader outbound provider sync coverage: GitHub issue/repository writes, Slack channel management writes, scheduled worker deployment, and real provider sandbox testing, still hidden behind disabled-by-default feature flags until production review is complete.

## Non-Negotiables

1. Do not import Plane as a black-box app. Rebuild the UI and data access in OpenSe style.
2. Do not copy Plane's auth model. Supabase remains the only login/session authority.
3. Copy Plane's product schema coverage into `open_kb`, excluding tables that conflict with OpenSe auth/session ownership or duplicate OpenSe's organisation tenancy layer.
4. Every Plane `User` foreign key becomes a reference to `public.profiles(id)` or, when access is membership-scoped, `public.organisation_members(id)`.
5. Do not create an Open-KB workspace concept. Plane uses workspaces as its tenant boundary; OpenSe already has `public.organisations`, so every Plane workspace-scoped table must be collapsed to organisation scope.
6. Open-KB projects belong directly to `public.organisations`.

## Database Migration Strategy

Create migrations in this order:

1. `supabase/migrations/<timestamp>_open_kb_schema_roles.sql`
   - `CREATE SCHEMA open_kb;`
   - Add `('open-kb', 'Open-KB')` to `public.apps`.
   - Add Open-KB app permissions, roles, and default role grants using the same structure as `etl` and `stoqr`.
   - Add helper functions such as `open_kb.is_org_member(org_id uuid)` and `open_kb.has_project_access(project_id uuid)`.

2. `supabase/migrations/<timestamp>_open_kb_plane_tables.sql`
   - Create all non-auth, non-workspace product tables under `open_kb`.
   - Keep Plane UUID primary keys and audit columns.
   - Use `created_at`, `updated_at`, `deleted_at`, `created_by`, `updated_by` consistently.
   - Replace every Plane `workspace_id` relationship with `organisation_id uuid not null references public.organisations(id)`.
   - Make `open_kb.projects.organisation_id` the root tenancy relationship for all project-scoped rows.
   - Replace Plane `project_members.member`, `issue_assignees.assignee`, `owned_by`, `actor`, `user`, `receiver`, and similar user references with `profile_id uuid references public.profiles(id)`.

3. `supabase/migrations/<timestamp>_open_kb_rls.sql`
   - Enable RLS on every `open_kb` table.
   - Read policy: current user must have an assigned Open-KB seat and organisation membership.
   - Write policy: current user must have an Open-KB role permission for the action and belong to the table's organisation.
   - Keep service-role-only policies for import/export, webhook delivery logs, and integration sync logs.

4. `supabase/migrations/<timestamp>_open_kb_storage.sql`
   - Add storage buckets/policies for attachments and rich-text assets.
   - Use paths rooted by organisation/project IDs.

5. `supabase/seeds/<timestamp>_open_kb_demo.sql`
   - Seed a minimal organisation-scoped project, states, labels, cycles, modules, pages, and issues for tests only.

## Auth Conflict Rules

Do not create or copy these Plane auth/session tables:

- `users`
- `profiles`
- `accounts`
- `sessions`
- `social_login_connections`
- `devices`
- `device_sessions`

Rationale:

- `users`, `profiles`, and `accounts` duplicate Supabase Auth plus OpenSe `public.profiles`.
- `sessions`, `devices`, and `device_sessions` duplicate session/device tracking owned by Supabase/Auth client code.
- `social_login_connections` overlaps OAuth account linking and should stay in the current auth surface.

Tables that contain user references but are still product data should be migrated, with all user columns remapped to OpenSe profile/member references. Examples: `project_members`, `issue_assignees`, `issue_mentions`, `issue_subscribers`, `notifications`, `user_favorites`, `user_recent_visits`, user preference tables, reactions, votes, and audit/activity actors.

Auth-adjacent token tables need implementation guardrails:

- `api_tokens` may be migrated only as `open_kb.api_tokens` with hashed tokens, `profile_id`, optional `bot_profile_id`, explicit scopes, expiry, and RLS/service-role restrictions. Do not expose raw Plane token behavior.
- `api_activity_logs` can be migrated as product audit data, but it must not become an auth source.

## Plane Tables To Migrate Into `open_kb`

The table inventory below comes from Plane Django `db_table` metadata. Before implementation, regenerate this list from the pinned Plane commit and diff it against this plan.

Core organisation/project tables:

- `projects`, `project_member_invites`, `project_members`, `project_identifiers`, `project_deploy_boards`, `project_public_members`, `project_user_properties`
- `organisation_themes`, `organisation_user_properties`, `organisation_user_links`, `organisation_home_preferences`, `organisation_user_preferences`, adapted from Plane tenant-level preference tables
- `teams`, implemented as optional organisation-level project groupings with no workspace semantics

Plane tenant tables that must not be created:

- `workspaces`
- `workspace_members`
- `workspace_member_invites`

These conflict with OpenSe's existing organisation and organisation-member system. Their relationships should be represented by `public.organisations`, `public.organisation_members`, and Open-KB project membership tables.

Work item planning tables:

- `issues`, `issue_blockers`, `issue_relations`, `issue_mentions`, `issue_assignees`, `issue_links`, `issue_attachments`, `issue_activities`, `issue_comments`, `issue_labels`, `issue_sequences`, `issue_subscribers`, `issue_reactions`, `comment_reactions`, `issue_votes`, `issue_versions`, `issue_description_versions`
- `states`, `labels`, `issue_types`, `project_issue_types`
- `cycles`, `cycle_issues`, `cycle_user_properties`
- `modules`, `module_members`, `module_issues`, `module_links`, `module_user_properties`
- `estimates`, `estimate_points`
- `draft_issues`, `draft_issue_assignees`, `draft_issue_labels`, `draft_issue_modules`, `draft_issue_cycles`

Docs, knowledge, and views:

- `pages`, `page_logs`, `page_labels`, `project_pages`, `page_versions`
- `descriptions`, `description_versions`
- `issue_views`, `analytic_views`
- `stickies`
- `user_favorites`, `user_recent_visits`

Intake, deployment, import/export:

- `intakes`, `intake_issues`
- `deploy_boards`
- `importers`, `exporters`
- `file_assets`

Notifications, webhooks, and integrations:

- `notifications`, `user_notification_preferences`, `email_notification_logs`
- `webhooks`, `webhook_logs`, `project_webhooks`
- `integrations`, `organisation_integrations`, adapted from Plane tenant integration tables
- `integration_credentials`, service-role-only encrypted provider credential storage for OAuth-backed provider API writes
- `github_repositories`, `github_repository_syncs`, `github_issue_syncs`, `github_comment_syncs`
- `slack_project_syncs`
- `api_activity_logs`
- `api_tokens`, only with the guardrails above

GitHub and Slack integration tables may exist in the first migration, but the product integration UI, sync workers, OAuth/token exchange, and webhook endpoints must be hidden behind a disabled-by-default feature flag until security review and operational testing are complete.

## Schema Adaptation Details

Do not create `open_kb.workspaces`. Use `public.organisations` as the tenant boundary and make `open_kb.projects` the first Open-KB-owned level:

- `open_kb.projects.organisation_id uuid not null references public.organisations(id) on delete cascade`
- `open_kb.projects.identifier` unique per organisation, not globally.
- `open_kb.projects.name` unique per organisation only if the product should prevent duplicate project names inside an organisation.
- Plane `Project.workspace_id` becomes `organisation_id`.

Use OpenSe membership for organisation access:

- Do not create a separate Open-KB organisation membership table.
- Organisation-level access comes from `public.organisation_members`.
- App access comes from `public.organisation_member_app_seats` with `app_code = 'open-kb'`.
- Project-level overrides live in `open_kb.project_members`.

Keep Plane project membership tables, but use OpenSe profile/member references:

- `project_members.profile_id`
- `project_public_members.profile_id`
- `project_user_properties.profile_id`

For every Plane table that had both `workspace_id` and `project_id`:

- Drop `workspace_id`.
- Keep `project_id`.
- Add or derive `organisation_id` from `open_kb.projects.organisation_id` for RLS and indexing.

For every Plane table that only had tenant scope and no project:

- Replace its tenant reference with `organisation_id`.
- Rename it to organisation terminology where the original name included Plane tenant wording. Examples: `organisation_user_preferences`, `organisation_home_preferences`, `organisation_integrations`.

For every table with `created_by`, `updated_by`, `owned_by`, `actor`, `receiver`, `user`, `member`, `assignee`, `mention`, `subscriber`, `lead`, or `initiated_by`, use one of:

- `profile_id`, when the row describes a person.
- `actor_profile_id`, when it records an action.
- `owned_by_profile_id`, when it records ownership.
- `organisation_member_id`, when role enforcement needs membership context.

Use `ON DELETE SET NULL` for historical actors and `ON DELETE CASCADE` only for true ownership/membership join rows.

## UI Reimplementation Strategy

Create `src/apps/open-kb` as a Vite React app, matching `etl` and `stoqr` structure:

- React 19, React Router, TanStack Query, Supabase client.
- Import `@repo/ui/styles`.
- Use `@repo/shared/auth/context`, shared Supabase helpers, runtime config, and switchable app registration.
- Add `open-kb` to `src/packages/shared/src/switchable-apps.ts`, default local URL `http://localhost:5995`, and app switcher icon in `AppBrandIcons.tsx`.
- Add Open-KB app scripts to `src/package.json` and register the app package in `src/pnpm-workspace.yaml` if needed.

Use shared UI components first:

- Shell/layout: `AppLayout`, `SwitchAppTopBar`, `SideNav`, `Sidebar`, `Breadcrumb`, `Tabs`.
- Primitive controls: `Button`, `Input`, `Checkbox`, `Dropdown`, `Dialog`, `SideSheet`, `Tooltip`, `Toast`, `Badge`, `StatusBadge`, `Avatar`, `Progress`.
- Data display: `Table`, `DataTable`, `Pagination`, `EmptyState`.
- Analytics: shared analytics primitives and charts where the existing API fits.

Build app-specific components inside `src/apps/open-kb/src/components` when the behavior is domain-specific:

- Work item board/list/calendar/Gantt/spreadsheet views.
- Rich text editor and page editor shell.
- Issue detail drawer and activity timeline.
- Cycle and module planning panels.
- Intake/triage inbox.
- Project settings, workflow state editor, estimate scale editor.
- Integration sync configuration.

Extract to `@repo/ui` only after a second OpenSe app needs the exact same component shape. Good extraction candidates after implementation: split panes, command palette, kanban primitives, rich filter builder, property chips, and activity timeline primitives.

Do not copy Plane CSS/components verbatim. Recreate the workflows with OpenSe tokens, shared components, and accessible React components. Plane is AGPL-3.0, so any source-derived implementation should receive license review before code is copied or closely ported.

Rich text editor implementation:

- Re-implement the editor inside `src/apps/open-kb/src/components/editor`.
- Do not depend on `@plane/editor`, any other `@plane/*` package, or copied Plane editor source.
- Use upstream editor dependencies directly, preferably Tiptap/ProseMirror packages such as `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-mention`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-task-list`, and `@tiptap/extension-task-item`.
- Use the editor for issue descriptions, issue comments, project/module/page descriptions, knowledge-base pages, stickies, and versioned description history.
- Support structured document JSON storage, rendered HTML, searchable plain text, markdown paste/shortcuts, mentions, links, images/attachments, task lists, keyboard navigation, and read-only rendering.
- Store structured JSON plus rendered/searchable text/HTML where the migrated Plane schema expects those shapes, so search, activity logs, and version history can work without parsing editor state on every read.
- Keep the first implementation local to Open-KB. Extract shared editor primitives to `@repo/ui` only after another OpenSe app needs the same editor behavior.

## Feature Build Order

1. App shell and auth gate
   - Register Open-KB in app switcher and account seats.
   - Add route coverage and smoke tests.

2. Organisation/project foundation
   - Organisation selector using existing OpenSe account context.
   - Project list, project create/edit, project members.
   - Default states and labels.

3. Work items
   - Issue create/edit/detail.
   - List and board views.
   - Assignees, labels, priorities, state transitions, comments.

4. Planning
   - Cycles.
   - Modules.
   - Estimates and saved views.

5. Knowledge base
   - Pages and project pages.
   - Rich text assets and version history.
   - Stickies and favorites.

6. Intake, analytics, and automation
   - Intake inbox and voting.
   - Analytics views.
   - Webhooks, imports, exports, GitHub/Slack sync.
   - API tokens only after auth/security review.

## Testing And Verification

Database:

- Add migration tests that assert no `open_kb` table references Plane `users`, `profiles`, `accounts`, or `sessions`.
- Add RLS tests for owner/admin/member/guest and cross-organisation denial.
- Add tests for seat assignment: no Open-KB seat means no Open-KB table access.

Frontend:

- Unit test route guards, data mappers, and app-specific interaction components.
- Playwright route coverage for `/dashboard`, organisation/project routes, issue board/list/detail, pages, cycles, modules, settings.
- Visual checks at desktop and mobile widths for sidebar/topbar layout.

Operational:

- Add seed data only under test/demo seeds.
- Add storage policy tests for attachments.
- Add secret-leak checks for integration tokens and API tokens.

## Open Questions Before Implementation

Resolved decision: Open-KB has no workspace layer. Projects belong directly to OpenSe organisations.

Resolved decision: GitHub/Slack tables can be migrated, but UI and sync behavior stay hidden behind a disabled-by-default feature flag.

Resolved decision: re-implement the rich text editor for Open-KB. Use upstream Tiptap/ProseMirror dependencies directly, keep the code local to Open-KB initially, and do not use `@plane/editor`, any `@plane/*` dependency, or copied Plane editor source.
