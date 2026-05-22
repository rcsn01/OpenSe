# UI Implementation Guide

## Purpose

This document explains how to build, edit, and verify UI across OpenSe. StoQR is the current reference implementation for authenticated app screens: compact, data-dense, search-first, tab-driven, and built around the shared app shell.

The visual rules live in [../design/Design Guide.md](../design/Design%20Guide.md). This guide explains how to turn those rules into maintainable code.

---

## 1. Implementation Hierarchy

Work from the top of this stack downward:

1. **Shared tokens and primitives in `@repo/ui`**
2. **Shared app patterns and layout wrappers**
3. **Route-owned page composition**
4. **Feature-owned component composition**
5. **Owner-scoped styling for complex surfaces**

If a problem can be solved by reusing `@repo/ui`, do that first. If it needs app-specific composition, solve it in the route page or feature owner. Use owner-scoped CSS only when the surface is too complex for shared primitives and utility classes to express clearly.

---

## 2. Canonical App Shell

Authenticated product apps should follow StoQR's shell structure:

- `AppShellLayout` from `@repo/ui` owns the sidebar, brand slot, grouped navigation, mobile sidebar behavior, top bar, profile menu, and scrollable main content area.
- Apps pass nav groups, current path, brand details, profile actions, and route-specific children.
- The app shell should stay mounted while child routes change.
- Route content renders through `Outlet`.

Current reference:

- `apps/stoqr/src/layouts/AppLayout.tsx`
- `packages/ui/src/components/layout/AppShellLayout.tsx`
- `packages/ui/src/components/layout/AppLayout.tsx`
- `packages/ui/src/components/ui/SideNav.tsx`

Do not build a second sidebar/topbar system inside an app. If Accounts, ETL, StoQR, or another app needs the same shell behavior, extend `AppShellLayout` instead of cloning StoQR's layout.

---

## 3. Page Shells

StoQR route pages usually use one of these wrappers:

- `StoqrPageShell` for normal StoQR pages that need company empty-state handling and optional top-bar search registration.
- `BasePage` for older/simple pages or pages that need more direct layout control.
- A feature-owned surface component for complex internals, rendered inside the route page.

Default StoQR page surfaces are tight and full-height:

- content area uses compact padding.
- tabbed pages are usually `flex`, `min-h-0`, and `overflow-hidden`.
- scroll belongs to the content pane that needs it, not random descendants.

Prefer this shape for new StoQR-like pages:

```tsx
<StoqrPageShell companyId={companyId} search={searchConfig}>
  <ContentTabs
    activeTab={activeTab}
    onTabChange={(nextTab) => navigate(`/route/${nextTab}`)}
    bottomSpacing
    tabs={tabs}
  />
</StoqrPageShell>
```

---

## 4. Search Pattern

StoQR uses shared page-owned top-bar search. The layout renders the control; each page owns search meaning.

Use:

- `usePageTopBarSearch(...)` to register the active page search config.
- `useTopBarSearchValue()` when a page or tab needs the current query.
- `StoqrPageShell search={searchConfig}` when the page-level shell can register search for you.

The page owns:

- placeholder text.
- default suggestions.
- dynamic suggestions.
- selection behavior.
- whether search filters visible data or navigates to another route.

Do not:

- add a second top-bar search implementation.
- pass search state through unrelated layout props.
- add duplicate local page search bars when top-bar search is the intended pattern.

---

## 5. Route Tabs

Route-level tabs should use `ContentTabs` from `@repo/ui`. In StoQR, major tabs are usually backed by the URL so refreshes, deep links, tests, and search suggestions land on the right view.

Use route-backed tabs for:

- Inventory views.
- Scanner actions/history.
- Label Studio templates/preview.
- Reports.
- Procurement.
- Alerts.
- Organisation settings.

Use local state tabs only for small internal panels that do not need a shareable URL.

---

## 6. Styling Decision Tree

### Use `@repo/ui` First

Use shared primitives for:

- App shell layout.
- Buttons.
- Cards and panels.
- Dialogs and sheets.
- Badges and status labels.
- Empty states.
- Pagination.
- Tabs.
- Data tables.
- Inputs and controls.
- Analytics primitives when they fit the design.

For compact StoQR-style app tables, use `DataTable variant="operational"` instead of repeating raw table chrome classes such as white uppercase headers, `#d9e2ef` row borders, and `px-4` cell padding in every feature.

If a reusable primitive is missing, add or extend it in `packages/ui` instead of cloning a component inside an app.

### Use Tailwind Utilities Second

For page-level composition, utility classes are the default:

- flex/grid layout.
- spacing.
- alignment.
- min/max sizing.
- overflow behavior.
- responsive layout.
- simple active/open/selected states.
- token-based colour usage.

### Use Owner-Scoped CSS When Necessary

Owner-scoped CSS is appropriate for:

- large selector-heavy migrated surfaces.
- complex responsive table/list switching.
- scanner/camera surfaces.
- label preview/designer/print surfaces.
- dense analytics layouts that are not yet covered by shared primitives.
- a migration bridge where rewriting everything at once is too risky.

Owner-scoped CSS must be:

- imported by the owning route or feature component.
- namespaced to that feature.
- treated as feature-owned, not a global dependency.
- kept aligned with the existing local visual rhythm.

---

## 7. Current StoQR Surface Ownership

These current StoQR surfaces are intentionally owner-scoped:

- `apps/stoqr/src/components/Inventory/InventorySurface.css`
- `apps/stoqr/src/components/LabelStudio/LabelStudioSurface.css`
- `apps/stoqr/src/components/Scan/ScanSurface.css`
- `apps/stoqr/src/pages/DashboardPage.module.css`

These files are valid current design sources for their screens. Do not copy them into new features by default, and do not rewrite them during unrelated changes just because they contain raw colours or non-token spacing.

When editing one:

- identify the owning route and feature component first.
- keep selectors namespaced.
- preserve the compact StoQR visual rhythm.
- move repeated patterns into `@repo/ui` only when the extraction is clear and tested.

---

## 8. Visual Implementation Rules

### Typography

New shared components should use typography tokens or existing `@repo/ui` typography primitives. Existing StoQR surfaces often use direct compact sizes. Match the local pattern before migrating.

Typical app scale:

- KPI values: large but not hero-style, often 24-32px.
- Section labels: 11-12px uppercase, muted, wider tracking.
- Table and body text: 13-14px.
- Metadata: 11-12px muted.
- Controls: 13-14px medium.

Avoid marketing-scale headings inside authenticated app pages.

### Colour

Use tokens for new shared code. Existing StoQR CSS may use raw slate/status values. Preserve current design unless the task is specifically a token migration.

Common token targets:

- `var(--color-background)`
- `var(--color-foreground)`
- `var(--color-muted-foreground)`
- `var(--color-border)`
- `var(--color-primary)`
- `var(--color-card)`
- `var(--color-surface-subtle)`

### Spacing

Shared primitives should use token spacing. StoQR pages use compact operational spacing:

- tight page padding.
- 24-28px major dashboard/report gaps.
- 16-18px section internals.
- 8-12px dense table/control spacing.

Do not add arbitrary spacing in many places to chase a screenshot. Find the owner and adjust the page or shared primitive coherently.

---

## 9. What Not To Do

Do **not**:

- create another app shell when `AppShellLayout` can be extended.
- wrap every section in a card by default.
- add marketing-style page heroes inside operational apps.
- create global feature styles in an app stylesheet.
- introduce generic global classes such as `.button`, `.card`, or `.input`.
- copy-paste a component from StoQR when the right fix is to make the shared version reusable.
- hardcode new colours when a token already represents the role.
- use inline `style={{ ... }}` for static styling unless the existing owner surface already does this and a wider cleanup is out of scope.
- verify visual work only by reading code.

---

## 10. Building New UI

### Step 1: Identify States

Before styling, identify:

- default state.
- loading state.
- empty state.
- error state.
- mobile state.
- search/filter state.
- selected/active state.
- permission-disabled state, when relevant.

### Step 2: Choose the Page Shape

Pick the StoQR page shape that fits:

- metric strip + analytic panels.
- toolbar + table.
- routed tabs + tab content.
- split explorer/detail layout.
- editor surface.
- scanner/action surface.

### Step 3: Compose With Shared Pieces

Start with:

- `AppShellLayout`
- `StoqrPageShell` or `BasePage`
- `ContentTabs`
- `DataTable`
- `Button`
- `Dialog`
- `Card`
- `Badge`
- `EmptyState`
- `Pagination`

Then add page-owned layout and feature-owned internals.

### Step 4: Match Existing Interaction Patterns

Examples:

- Searchable pages register top-bar search.
- Route-level tabs use `ContentTabs` and navigate on tab change.
- Confirmations use `Dialog`.
- Tables use `DataTable` unless a feature-specific surface already owns the table pattern.
- Toasts use the existing app toast system.

The right implementation is the one that matches the product's established behavior, not necessarily the shortest code.

---

## 11. Editing Existing UI Safely

Before changing a StoQR UI surface:

1. Open the route in the browser when practical.
2. Identify the route page.
3. Identify the feature component rendered by the route.
4. Identify whether styling comes from `@repo/ui`, Tailwind utilities, a CSS module, or an owner surface file.
5. Make the smallest coherent change at the owner level.
6. Verify the actual route.

Do not patch random descendants until the page looks close. That makes ownership impossible to reason about.

If the surface is mid-migration:

- preserve the owner boundary.
- avoid mixing a major visual rewrite with a folder restructure.
- prefer one clear migration step over many half-patterns in the same file.

---

## 12. Migration Rules

When moving a legacy or owner-scoped surface toward shared UI:

1. Identify repeated patterns, not just similar class names.
2. Extract one coherent primitive or wrapper at a time.
3. Keep the old route visually stable.
4. Add tests for behavior and the shared contract.
5. Verify the real route in the browser.

Do not:

- move raw CSS into `@repo/ui` without a clear component API.
- change the compact StoQR visual language as a side effect of cleanup.
- remove owner-scoped CSS before the shared replacement covers the same states and responsive behavior.

---

## 13. Responsive Rules

Every UI change should answer:

- What happens on narrow screens?
- What stacks?
- What scrolls?
- What remains visible?
- Are primary actions reachable?
- Does the empty state fit?
- Do table rows become scrollable, simplified, or card-like?

For dense surfaces like inventory, reports, scanner, and label tools:

- stack complex secondary panels earlier than expected.
- preserve workflow meaning, not just geometry.
- keep action controls reachable without forcing awkward horizontal overflow.

---

## 14. Verification

### Tests

Good tests assert:

- the user sees the right content.
- the right route renders.
- search filters or navigates correctly.
- selecting a row/item navigates correctly.
- tabs show the right content.
- empty/loading/error states appear when expected.

Avoid tests that assert class names or internal implementation details unless the class is part of a deliberate styling contract.

### Usual StoQR UI Checks

```bash
pnpm --dir opense-stack/apps/stoqr test -- --run <affected tests>
pnpm --dir opense-stack/apps/stoqr typecheck
pnpm --dir opense-stack/apps/stoqr build
```

Then verify the changed route in the browser. For visually sensitive changes, browser verification is required even when tests pass.

---

## 15. Reference Patterns

Use these as starting points:

- Shared app shell: `packages/ui/src/components/layout/AppShellLayout.tsx`
- StoQR app layout: `apps/stoqr/src/layouts/AppLayout.tsx`
- Page shell/search registration: `apps/stoqr/src/components/StoqrPageShell.tsx`
- Shared route-level search: `apps/stoqr/src/components/Search/TopBarSearch.tsx`
- Route-level tabs: `apps/stoqr/src/pages/ReportsPage.tsx`
- Label Studio routed tabs: `apps/stoqr/src/pages/LabelStudioPage.tsx`
- Scanner surface: `apps/stoqr/src/pages/ScanPage.tsx`
- Inventory surface ownership: `apps/stoqr/src/components/Inventory/*`
- Shared primitives: `packages/ui/src/components`

Copy the pattern and behavior, not only the JSX.

---

## 16. Engineer Checklist

Before opening a UI PR, confirm:

- The page matches StoQR's compact app visual language.
- The shared app shell is reused.
- The route/page ownership is clear.
- Search and tabs use existing patterns where applicable.
- Shared primitives were reused before adding feature-owned styling.
- Any owner-scoped CSS is justified and namespaced.
- No unrelated visual migration was mixed into the change.
- Responsive behavior was intentionally handled.
- Focused tests passed.
- Typecheck/build passed or unrelated failures were documented.
- The route was checked in the browser for visual changes.
