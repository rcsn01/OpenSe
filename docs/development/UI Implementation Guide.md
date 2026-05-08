# UI Implementation Guide

## Purpose

This document explains the right way to build, edit, and verify UI across OpenSe, with StoQR as the main reference implementation.

The design rules live in [../design/Design Guide.md](../design/Design%20Guide.md). This guide is the engineering counterpart: how to turn those rules into code that is maintainable, testable, and consistent with the current codebase.

---

## 1. The implementation hierarchy

When building UI, always work from the top of this stack downward:

1. **Design tokens and primitives in `@repo/ui`**
2. **Shared app patterns and layout wrappers**
3. **Page-owned composition**
4. **Feature-specific styling**

That hierarchy matters.

If a problem can be solved by reusing `@repo/ui`, do that first. If it needs app-specific composition, solve it in the page or owner component. Only add custom styling when the shared primitives and normal utility classes cannot express the layout cleanly.

---

## 2. The default decision tree

### Use `@repo/ui` first

Reach for `@repo/ui` when you need:

- Buttons
- Cards and surfaces
- Dialogs
- Badges
- Empty states
- Pagination
- Tabs
- Data tables
- Shared layout wrappers

If the UI you need is a new reusable primitive, add or extend it in `packages/ui` instead of cloning the component inside an app.

### Use inline Tailwind classes second

For page-specific layout, spacing, typography, alignment, and state styling, prefer inline utility classes in `.tsx`.

This is the default for:

- Flex and grid layout
- Spacing
- Alignment
- Width and height constraints
- Token-based colour usage
- Responsive layout changes at standard breakpoints
- Simple selected/open/active states

### Use owner-scoped CSS only when it is genuinely the better tool

Use app-owned CSS when the surface has one or more of these properties:

- Large selector-heavy legacy markup
- Complex responsive table/list switching
- Print or export-specific rendering
- Deeply nested preview/editor surfaces
- A migration bridge where rewriting everything to utilities in one pass is too risky

If you need custom CSS, it must be:

- Owned by the page or feature that renders it
- Imported by that owner
- Namespaced to that surface
- Treated as transitional unless there is a strong reason for it to remain

---

## 3. What not to do

Do **not**:

- Add new feature styles to a global app stylesheet
- Recreate `App.css` under a different filename
- Introduce new global utility classes like `.button`, `.card`, or `.input` as a long-term pattern
- Copy-paste a component from an app when the right fix is to extend `@repo/ui`
- Hardcode hex colours in app code when a token exists
- Use inline `style={{ ... }}` objects for static UI styling
- Implement a second version of a shared interaction pattern when one already exists
- Verify a UI change only by reading code

---

## 4. Current styling rules for StoQR

### The real rule

**`@repo/ui` first, Tailwind second, owner-scoped CSS only when necessary.**

### What exists today

StoQR still has some large owner-scoped surface styles for complex and migrated areas, including:

- `InventorySurface.css`
- `LabelStudioSurface.css`
- `ScanSurface.css`
- `CustomReportsSurface.css`

These files exist because those surfaces were too risky to rewrite blindly in one pass. They are valid bridge files, but they are not the ideal default for new UI.

### How to treat those bridge files

If you are editing one of those surfaces today:

- Keep changes inside the owner surface file if the surface is still primarily driven by that file
- Keep selectors namespaced to that feature
- Do not move shared primitive styles into those files
- Do not let one surface file silently become a styling dependency for another route
- Prefer moving new work toward `@repo/ui` and Tailwind instead of expanding the bridge unnecessarily

If you are building a brand-new screen, do **not** create another bridge stylesheet just because one exists elsewhere.

---

## 5. Tokens, colours, icons, and spacing

### Colours

Use semantic tokens from `@repo/ui` or the token aliases already exposed in app CSS variables.

Good:

- `var(--color-foreground)`
- `var(--color-muted-foreground)`
- `var(--color-border)`
- `var(--color-primary)`

Bad:

- `#3b82f6`
- `#0f172a`
- `#e2e8f0`

If a raw colour seems necessary, stop and ask whether the token system is missing something that should be added properly.

### Icons

Icons should inherit `currentColor` unless a deliberately semantic token is required.

This keeps icon colour aligned with nearby text and avoids one-off visual drift.

### Spacing

Use the existing spacing scale through utilities whenever possible. If a surface file is already authoritative for a legacy layout, keep spacing changes aligned with its established rhythm rather than adding arbitrary values in multiple places.

---

## 6. Page ownership rules

### Pages own route-level composition

The route page should own:

- The main layout wrapper
- Tabs at the route level
- Search registration for the top bar
- High-level empty/loading/error handling
- Which feature components are shown

Feature components should own:

- Their domain interactions
- Their local derived state
- Their internal layout
- Their route-owned or feature-owned styling

### Example: top-bar search

StoQR now uses a shared page-owned top-bar search system. The layout renders the search UI, but each page registers its own behavior.

Use:

- `usePageTopBarSearch(...)` to register the page’s search config
- `useTopBarSearchValue()` when the page needs the current query to filter visible content

Do **not**:

- Add a second top-bar search implementation for a page
- Pass search state down through unrelated layout props
- Recreate per-page layout search bars when the shared top bar already exists

Example:

```tsx
const filteredItems = useMemo(
  () => filterProducts(products, searchValue),
  [products, searchValue],
)

usePageTopBarSearch({
  searchKey: 'inventory-products',
  placeholder: 'Search items...',
  suggestions,
  onSuggestionSelect: handleSuggestionSelect,
})
```

The page owns the suggestions and selection behavior. The layout only renders the control.

---

## 7. How to build a new UI the right way

### Step 1: start with states, not styling

Before writing classes, identify:

- Default state
- Loading state
- Empty state
- Error state
- Success state
- Mobile state
- Search/filter state
- Selected/active state

If you do not know all meaningful states, you are not ready to style the UI yet.

### Step 2: compose with shared primitives

Build the structure using:

- `BasePage`
- `ContentTabs`
- `Card`
- `Dialog`
- `DataTable`
- `Badge`
- `EmptyState`
- `Pagination`

Only after the structure is correct should you add feature-specific layout and spacing.

### Step 3: choose the smallest styling tool that works

- If Tailwind utilities are enough, stop there
- If the surface is already owned by a namespaced CSS file, keep related changes there
- If a new shared primitive is clearly emerging, move it to `@repo/ui`

### Step 4: wire the interaction pattern the same way the app already does it

Examples:

- Searchable pages use the shared top-bar search API
- Route tabs use `ContentTabs`
- Tables use `DataTable`
- Confirmations use `Dialog`

The right implementation is usually the one that matches the rest of the app, not the one with the fewest lines.

---

## 8. How to edit an existing UI safely

### Find the true owner first

Before editing, identify:

1. The route page
2. The feature component rendered by that route
3. The stylesheet or shared primitive actually controlling the surface

For StoQR, that often means:

- Route page in `apps/stoqr/src/pages/...`
- Feature component in `apps/stoqr/src/components/...`
- Shared primitives in `packages/ui`
- Search behavior in `components/Search/TopBarSearch.tsx`

### Do not edit blind

Before changing styling:

- Open the route in the browser
- Confirm what is visually broken
- Search for the actual owner classes/components
- Make the smallest coherent change at the owner level

Do not patch random descendants until the page “looks right”. That is how styling ownership becomes impossible to reason about.

### If the surface is already mid-migration

When a surface is partly legacy and partly modern:

- Preserve the existing owner boundary
- Avoid mixing a major layout rewrite with a folder restructure
- Prefer one clear migration step over many half-patterns in the same file

---

## 9. The right way to migrate legacy UI

When moving a legacy surface away from old global styling:

1. Identify the owner page/component
2. Extract only the selectors that belong to that owner
3. Validate the extracted CSS before relying on it
4. Reconnect the owner to the new file
5. Replace old generic primitives with `@repo/ui` or local owner classes
6. Verify the real route in the browser

### Never do this

- Copy a chunk of legacy CSS and assume it is still valid
- Move rules without confirming the selector contract still matches the markup
- Keep unrelated feature selectors together because “they used to live in the same file”
- Skip parser/build validation for extracted CSS

### If you extract CSS from a legacy source

You must verify:

- The file parses cleanly
- The owner route imports it
- The route renders correctly in the browser
- No unrelated route silently depends on it

---

## 10. Responsive UI rules for engineers

Do not treat “responsive” as an afterthought.

Every UI change should answer:

- What happens on narrow screens?
- What collapses?
- What stacks?
- What becomes scrollable?
- Does the empty state still fit?
- Are actions still reachable?

For dense surfaces like inventory, reports, and label tools:

- Prefer intentional layout changes over simply shrinking everything
- Stack complex secondary panels earlier than you think
- Switch grids from 3 columns to 2 or 1 when the content starts to compress
- Keep important actions visible without forcing horizontal overflow

The best responsive implementation preserves meaning, not just geometry.

---

## 11. Testing and verification rules for UI work

### Test the implementation, not the code structure

Good tests assert:

- The user sees the right content
- The right route renders
- Search filters the visible results
- Selecting an item navigates correctly
- Tabs show the right content
- Empty states appear when expected

Bad tests assert:

- Specific class names for no user-facing reason
- Internal state implementation details
- That copied JSX structure exists unchanged

### Every meaningful UI change should include these checks

1. Focused unit/integration tests for the affected route or component
2. A production build
3. Browser verification of the actual route

For visually sensitive changes, browser verification is required even when tests pass.

### For StoQR UI changes, the usual verification flow is

```bash
pnpm --dir opense-stack/apps/stoqr test -- --run <affected tests>
pnpm --dir opense-stack/apps/stoqr build
pnpm --dir opense-stack/apps/stoqr typecheck
```

Then verify the actual page in the browser.

If `typecheck` fails only because of a known unrelated pre-existing issue, document that explicitly in your change summary.

---

## 12. Examples of good patterns in the current codebase

Use these as starting references:

- Shared route-level search: `apps/stoqr/src/components/Search/TopBarSearch.tsx`
- Route-level tabs and composition: `apps/stoqr/src/pages/LabelStudioPage.tsx`
- Shared product page search adapter: `apps/stoqr/src/hooks/useProductPageSearch.ts`
- Inventory explorer surface ownership: `apps/stoqr/src/components/Inventory/*`
- Scanner route ownership: `apps/stoqr/src/pages/ScanPage.tsx`
- Shared UI primitives: `packages/ui/src/components`

When implementing something new, copy the pattern, not just the code.

---

## 13. Engineer checklist

Before opening a UI PR, confirm:

- The design uses existing tokens and primitives
- The route/page ownership is clear
- Shared patterns were reused instead of duplicated
- No new global feature stylesheet was introduced
- No hardcoded hex values were added without a strong reason
- The responsive behavior was intentionally handled
- Focused tests passed
- The route was checked in the browser
- Build passed
- Any remaining `typecheck` failures are pre-existing and documented

If you cannot say yes to those points, the UI change is not ready.
