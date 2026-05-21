# Design Guide

## Purpose

This document describes the visual design language used across the OpenSe platform, with StoQR as the current reference implementation. It is not an abstract ideal system; it documents the UI that exists today so new screens, app shells, and shared components can match the product users already see.

For engineering implementation rules, see [../development/UI Implementation Guide.md](../development/UI%20Implementation%20Guide.md).

---

## 1. Reference Product

StoQR is the design source of truth for authenticated app screens.

The current StoQR design is:

- Compact, operational, and data-dense.
- Built around a fixed left sidebar, top search/profile bar, and scrollable content area.
- Search-first for inventory, scanner, reports, procurement, labels, and settings workflows.
- Tab-driven, with tabs commonly represented in the URL.
- Mostly white and slate, with sage green active states and restrained semantic status colours.
- Practical about complex surfaces: inventory, scanner, labels, and dashboard/report views use owner-scoped styling where shared primitives are not yet expressive enough.

Do not design new authenticated app pages like marketing pages. Avoid oversized hero headings, decorative empty space, illustration-led layouts, and broad landing-page composition inside operational apps.

---

## 2. Visual Language

### App Shell

Authenticated product pages should appear inside the standard shell:

- Fixed 220px left sidebar on desktop.
- Brand block at the top of the sidebar.
- Grouped navigation with compact icon + text items.
- Top bar with page-owned search content and profile actions.
- Main content area that scrolls independently of the sidebar.
- Mobile sidebar that opens over the content and closes with a backdrop.

Mockups should show the full shell context unless the work is a small isolated component.

### Page Composition

StoQR pages are built for repeated work, scanning, comparison, and quick action. The common page shapes are:

- Metric strip + analytic panels.
- Toolbar/search/filter row + dense table.
- Routed tabs + tab-owned content.
- Split panel with explorer/list on the left and detail/editor on the right.
- Full-height editor or scanner surfaces with their own local controls.

Use the full available width. Do not centre narrow app pages in the content area when side panels, previews, tables, or supporting context would make better use of the space.

### Density

StoQR uses a compact SaaS density by default.

| Density | Use case | Visual treatment |
|---|---|---|
| Compact | Inventory grids, scanner history, procurement rows, settings tables | Tight rows, small labels, inline actions |
| Standard | Forms, editors, team/settings panels | Moderate padding, clear field grouping |
| Relaxed | Dashboard summary panels, detail overview sections | Larger gaps, metric emphasis, more breathing room |

Do not mix density styles casually. If a page has a compact table next to a relaxed detail panel, the difference should support the workflow.

---

## 3. Colour

Use shared tokens from `@repo/ui` for new primitives and general app work. Current StoQR also contains owner-scoped CSS with raw slate, green, amber, red, and blue values. Those values are part of the existing visual language and should be migrated deliberately, not rewritten opportunistically during unrelated work.

The current palette direction is:

| Role | Current StoQR treatment |
|---|---|
| Background | White app background and shell surfaces |
| Primary text | Dark slate |
| Secondary text | Muted slate |
| Active navigation/tabs | Sage green token family |
| Brand mark | Blue to indigo gradient in the sidebar brand slot |
| Borders/dividers | Very light slate borders, used sparingly |
| Positive | Green |
| Warning | Amber |
| Danger | Red |
| Informational | Blue |

For new shared code, prefer semantic tokens such as:

- `var(--color-background)`
- `var(--color-foreground)`
- `var(--color-muted-foreground)`
- `var(--color-border)`
- `var(--color-primary)`
- `var(--color-success)`
- `var(--color-warning)`
- `var(--color-destructive)`

Hardcoded colours are acceptable only inside existing owner-scoped surfaces or when intentionally preserving a current StoQR visual pattern. If the same raw colour starts appearing in multiple new places, promote it into `@repo/ui`.

---

## 4. Typography

The platform has typography tokens in `@repo/ui`, but StoQR's real app screens currently use a compact operational type scale through a mix of tokens, Tailwind utilities, and owner-scoped CSS.

Use this hierarchy when designing app pages:

| Text role | Typical treatment |
|---|---|
| App page title, when needed | Modest heading, not hero scale |
| Section label | 11-12px, uppercase, wider tracking, muted slate |
| KPI/metric value | 24-32px, medium weight, tight line height, tabular numbers |
| Table/header label | 11-12px, uppercase or compact label style |
| Body/table text | 13-14px, normal or medium weight |
| Metadata/help text | 11-12px, muted slate |
| Button/tab text | 13-14px, medium weight |

Avoid large marketing typography inside authenticated app workflows. A dashboard metric can be large; a settings page title should not be.

For new shared components, use the typography tokens or existing `@repo/ui` typography primitives. For existing StoQR owner surfaces, match the local scale before migrating anything.

---

## 5. Spacing

The design system exposes spacing tokens, but current StoQR uses a pragmatic compact rhythm. New shared components should use token spacing. StoQR page surfaces should match the established rhythm of the page they belong to.

Typical StoQR spacing:

- App content padding is tight, commonly around 8px horizontally with a small top offset.
- Major dashboard/report groups commonly use 24-28px gaps.
- Section internals commonly use 16-18px gaps.
- Dense tables and controls commonly use 8-12px internal spacing.
- Sidebar nav items are compact, with small vertical gaps between items and larger gaps between groups.

Use whitespace and subtle surface contrast before adding borders. Borders are still appropriate for inputs, tables, active panels, modals, and clear interactive hit areas.

---

## 6. Components

Use `@repo/ui` first for primitives and shared patterns:

- `AppShellLayout`
- `BasePage`
- `ContentTabs`
- `Button`
- `Card`
- `Dialog`
- `Badge`
- `EmptyState`
- `DataTable`
- `Pagination`
- Form inputs and controls

Use `DataTable variant="operational"` for compact app tables that match the current StoQR table language: white rows, white headers, subtle `#d9e2ef`-equivalent row dividers, uppercase headers, and tight operational cell padding.

Cards in StoQR are not decorative containers for every section. Use them for repeated items, framed panels, modals, and true surfaces. Many StoQR screens should instead use plain panels, tables, split panes, and whitespace.

### Owner-Scoped Surfaces

The following current StoQR surfaces have valid owner-scoped visual styling:

- Inventory explorer and all-products table.
- Scanner quick action and history surfaces.
- Label Studio templates, preview, designer, and downloads surfaces.
- Dashboard/report analytics where the shared analytics primitives do not yet cover the full visual need.

Do not create a new owner-scoped stylesheet for every feature. Use one only when the surface is complex enough that shared primitives plus utility classes would make the UI harder to maintain.

---

## 7. Responsive Design

StoQR is mobile-aware but not sparse. Responsive design should preserve the workflow:

- Sidebar collapses into an overlay mobile navigation.
- Dense grids collapse to fewer columns.
- Split panels stack when the secondary panel would become unusable.
- Tables must have a deliberate mobile strategy: scroll, stacked cards, or reduced columns.
- Scanner and label tools must keep primary actions reachable on narrow screens.
- Empty states must fit without pushing actions off-screen.

Do not simply shrink desktop UI until it fits. Decide what stacks, what scrolls, what remains sticky, and which actions stay visible.

---

## 8. Iconography

Use Lucide icons by name. Icons should inherit `currentColor` unless a semantic status colour is required.

Common StoQR icon patterns:

- Sidebar items use 20px icons beside compact labels.
- Buttons use icons for scan, add, edit, delete, export, filter, and settings actions.
- Status icons and dots should be visually quiet and support text, not replace it when clarity matters.

---

## 9. Accessibility

Every design must specify:

- Visible focus states for interactive controls.
- Keyboard-reachable tabs, buttons, menus, dialogs, and scanner fallbacks.
- Empty states for lists, tables, and search results.
- Loading and error states for data-backed panels.
- Minimum practical target size for touch workflows, especially scanner and mobile pages.
- Sufficient contrast for muted text, table headers, and status labels.

Dense UI still needs clear interaction targets. Compact does not mean cramped.

---

## 10. Handoff

For each screen, provide:

- Shell context: sidebar/topbar/page content, not just the isolated panel.
- Page density: compact, standard, or relaxed.
- Responsive notes for mobile and tablet.
- Search behavior, if the top bar participates in the page.
- Tab behavior, including URL-backed tabs when applicable.
- Empty, loading, and error states.
- Icon names.
- Any owner-scoped surface that should intentionally match an existing StoQR feature.

If a design intentionally deviates from StoQR's current visual language, call that out explicitly and explain whether it is a product-specific exception or a proposed design-system migration.

---

## 11. Migration Targets

The current StoQR design is the reference to copy today. These are longer-term cleanup goals, not reasons to block matching the existing app:

- Move repeated raw colours into shared semantic tokens.
- Move repeated analytics, table, editor, and split-panel patterns into `@repo/ui`.
- Reduce owner-scoped CSS when a shared primitive can represent the same design cleanly.
- Normalize typography tokens so they match the compact app scale.
- Keep the compact operational character even as implementation becomes more token-driven.

---

## Summary

| Principle | In practice |
|---|---|
| StoQR is the app reference | New authenticated app UI should visually match StoQR first |
| Compact and operational | Prefer dense, efficient layouts over marketing-style composition |
| Search and tabs are core | Top-bar search and routed tabs are first-class page patterns |
| Shared first, pragmatic second | Use `@repo/ui`, but respect existing owner-scoped StoQR surfaces |
| White/slate/sage base | Preserve the current calm, data-focused palette |
| Responsive by workflow | Stack, scroll, and preserve actions intentionally |
