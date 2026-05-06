# Styling Architecture Migration Plan

## Recommendation

Do **not** execute the old version of this plan as-is.

The goal is right, but the original plan had a dangerous phase order:

1. It deleted `App.css` before replacing the shared primitives that still power large parts of the app.
2. It proposed a new `features/` directory that does not match the current StoQR structure and would add unnecessary churn.
3. It treated some Tailwind limitations too strictly even though this codebase already supports arbitrary values and utility-first patterns.

This revised plan keeps the intent, but makes the migration safe for the current repo.

---

## Current State

StoQR currently mixes three styling approaches:

| Approach | Location | Problem |
|----------|----------|---------|
| Global CSS | `apps/stoqr/src/App.css` | Large shared stylesheet with both primitives and feature-specific rules. Hard to delete safely. |
| Page CSS | `apps/stoqr/src/pages/DashboardPage.css` | Single page-level exception. |
| Tailwind + `@repo/ui` | Most `.tsx` files | Intended direction, but undermined by the remaining global CSS. |

### Important repo facts

- `App.css` is imported from [App.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/App.tsx:4).
- `DashboardPage.css` is imported from [DashboardPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/DashboardPage.tsx:26).
- StoQR currently has **no** `.module.css` files.
- `App.css` contains both feature namespaces and widely reused shared classes such as `.button`, `.card`, `.badge`, `.empty-state`, `.section-title`, `.page-title`, `.grid-*`, `.row`, `.input`, and more.

That last point is the main risk: `App.css` is not just a dumping ground for feature blocks. It is also acting as a primitive layer for the whole app.

---

## Target Architecture

Use this rule:

> **Tailwind first. CSS Modules when the styling is genuinely component-scoped and awkward in utilities. No long-lived global feature CSS.**

### Decision matrix

| Situation | Preferred target | Notes |
|-----------|------------------|-------|
| Shared primitives like Button, Card, Badge, Dialog | `@repo/ui` | Reuse existing components first. Add variants there only when there is a real cross-app need. |
| Local layout, spacing, borders, typography, colors | Inline Tailwind in `.tsx` | Default choice. |
| Existing large feature-specific selector sets | Co-located `[Owner].module.css` | Best transitional step when a straight Tailwind rewrite is too risky. |
| Pseudo-elements, keyframes, print rules, bespoke media queries | CSS Module | Good fit for real CSS features. |
| Precise sizes like `13px` or `116px` | Usually Tailwind arbitrary values | Example: `w-[13px] h-[116px]`. Do not force a module just for exact numbers. |
| Simple active/open/selected state | Tailwind conditional classes first | Use modules only when the state styling becomes complex or selector-heavy. |

### Rules after migration

- No new feature styles in `App.css`.
- No new page-level global `.css` files.
- No mass `@apply` dumps that recreate utility classes inside modules.
- Co-locate modules with the current owner component or page.
- Do not introduce a new `features/` directory as part of this migration unless a separate structure refactor is approved.

---

## CSS Module conventions

### File naming

```text
LabelPreviewBatchTab.tsx
LabelPreviewBatchTab.module.css
```

### Import pattern

```tsx
import { cn } from '@repo/ui/cn'
import styles from './LabelPreviewBatchTab.module.css'

<div className={cn("flex flex-col gap-6", styles.previewPane)} />
```

### State modifiers

Avoid fragile string construction. Prefer explicit conditionals.

```tsx
<div className={cn(styles.base, isActive && styles.isActive)} />
```

### Breakpoints

Prefer standard Tailwind breakpoints for normal layout changes. Use module media queries only when the component truly depends on a non-standard breakpoint or print-specific behavior.

---

## Migration Strategy

### Phase 0 - Freeze and inventory

Add a deprecation header to `App.css` and stop new additions immediately.

Then classify every selector in `App.css` into one of three buckets:

1. **Shared primitives**
   - Examples: `.button`, `.card`, `.badge`, `.empty-state`, `.section-title`, `.page-title`, `.grid-*`, `.row`, `.input`, `.select`, `.textarea`, `.icon-button`
2. **Feature namespaces**
   - Examples: `.scan-*`, `.label-*`, `.label-studio-*`, `.label-batch-*`, `.product-*`, `.inventory-import-*`, `.explorer-*`, `.tree-*`, `.file-*`, `.custom-reports-*`, `.export-*`
3. **Dead or suspicious selectors**
   - Verify usage before moving them

Do not move or rewrite anything until this inventory exists.

### Phase 1 - Extract feature namespaces without changing behavior

Move feature-specific rules out of `App.css` and into co-located CSS Modules next to their current owners.

Do **not** create a new top-level `features/` tree as part of this step. That would mix a style migration with a folder-structure migration.

#### Recommended ownership map

| Namespace | Co-located destination |
|-----------|------------------------|
| `.scan-*` | [ScanPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/ScanPage.tsx), [QuickScanTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/Scan/QuickScanTab.tsx), [ScanHistoryTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/Scan/ScanHistoryTab.tsx) |
| `.label-*`, `.label-studio-*`, `.label-batch-*`, `.export-*` | [LabelDesignerTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/LabelStudio/LabelDesignerTab.tsx), [TemplateLibraryTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/LabelStudio/TemplateLibraryTab.tsx), [LabelPreviewBatchTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/LabelStudio/LabelPreviewBatchTab.tsx), [LabelPreviewCard.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/LabelStudio/LabelPreviewCard.tsx), [LabelDownloadsTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/LabelStudio/LabelDownloadsTab.tsx) |
| `.product-*`, `.product-form-*` | [ProductDetailPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/product/ProductDetailPage.tsx), [ProductFormPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/product/ProductFormPage.tsx), [ProductOverviewTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/ProductDetail/ProductOverviewTab.tsx), related Product Detail tab components |
| `.inventory-import-*` | [InventoryImportPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/InventoryImportPage.tsx) |
| `.explorer-*`, `.tree-*`, `.file-*` | [AllProductsTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/Inventory/AllProductsTab.tsx), [FolderNavigationPanel.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/Inventory/FolderNavigationPanel.tsx), [InventoryFiltersBar.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/Inventory/all-products/InventoryFiltersBar.tsx) |
| `.custom-reports-*`, report-builder classes | [CustomSavedReportsTab.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/components/Reports/CustomSavedReportsTab.tsx) |
| `.stoqr-dashboard__*` from `DashboardPage.css` | [DashboardPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/DashboardPage.tsx), with Tailwind first and a tiny module only if needed |

#### Rules during extraction

1. Preserve exact visual behavior first.
2. Do not rewrite to Tailwind and relocate ownership in the same commit unless the slice is very small.
3. Delete the extracted block from `App.css` immediately after the owner imports the module.
4. Verify the affected flow before moving on.

### Phase 2 - Replace shared primitives before deleting `App.css`

This is the step the old plan had in the wrong order.

Before `App.css` can be deleted, migrate every still-used shared selector to one of these destinations:

| Selector type | Destination |
|---------------|-------------|
| Button-like classes | Existing `@repo/ui` Button or an app-local wrapper component during transition |
| Card/surface classes | Existing `@repo/ui` Card or app-local wrapper |
| Badge/status pills | Existing `@repo/ui` Badge or app-local wrapper |
| Empty/loading states | App-local `EmptyState` component first, then promote to `@repo/ui` only if truly shared |
| Form controls like `.input`, `.select`, `.textarea` | `@repo/ui` inputs where possible, otherwise Tailwind inline until consolidated |
| Layout helpers like `.grid-*`, `.row`, `.flex-between`, `.table-surface`, `.stat-card` | Replace inline in each consumer instead of preserving them as global utilities |
| Typography helpers like `.section-title`, `.page-title`, `.muted`, `.small` | Inline Tailwind or shared typography components |

Important:

- Do not preserve generic globals by creating a new `shared.css`.
- Do not make this step optional.
- Do not delete `App.css` while any live component still depends on these classes.

### Phase 3 - Delete `DashboardPage.css`

Convert [DashboardPage.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/DashboardPage.tsx) to Tailwind-first styling.

Use a tiny module only if something is meaningfully cleaner in CSS, such as:

- chart bar sizing
- one-off pseudo-elements
- a genuinely awkward responsive rule

After parity is verified, delete [DashboardPage.css](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/pages/DashboardPage.css).

### Phase 4 - Delete `App.css`

Delete `App.css` only when all three conditions are true:

1. Every feature namespace has been extracted or rewritten.
2. No live component uses any shared selector that still exists only in `App.css`.
3. A repo-wide search confirms there are no remaining references.

Then:

- remove `import './App.css'` from [App.tsx](/Users/mac/Syncthing/Projects/OpenSe/opense-stack/apps/stoqr/src/App.tsx:4)
- run the full regression suite
- visually verify the highest-risk screens

### Phase 5 - Standardise breakpoints after visual parity

Only after migration stabilises, audit custom breakpoints and decide which ones should become standard.

Baseline:

```text
sm 640px
md 768px
lg 1024px
xl 1280px
```

For non-standard values like `860px` or `1100px`:

- keep them if the layout really depends on them
- otherwise collapse to a standard breakpoint

Do not force this cleanup during the first extraction pass.

---

## File layout after migration

Keep the current project structure and co-locate new modules with existing owners.

```text
apps/stoqr/src/
  index.css
  App.tsx
  pages/
    DashboardPage.tsx
    DashboardPage.module.css         optional, only if still justified
    ScanPage.tsx
    ScanPage.module.css              optional
    InventoryImportPage.tsx
    InventoryImportPage.module.css
    product/
      ProductDetailPage.tsx
      ProductDetailPage.module.css
      ProductFormPage.tsx
      ProductFormPage.module.css
  components/
    Scan/
      QuickScanTab.tsx
      QuickScanTab.module.css
      ScanHistoryTab.tsx
      ScanHistoryTab.module.css
    LabelStudio/
      LabelDesignerTab.tsx
      LabelDesignerTab.module.css
      LabelPreviewBatchTab.tsx
      LabelPreviewBatchTab.module.css
      TemplateLibraryTab.tsx
      TemplateLibraryTab.module.css
    Inventory/
      AllProductsTab.tsx
      AllProductsTab.module.css
      FolderNavigationPanel.tsx
      FolderNavigationPanel.module.css
    Reports/
      CustomSavedReportsTab.tsx
      CustomSavedReportsTab.module.css
```

This keeps the migration understandable and avoids mixing it with a repo re-organisation.

---

## Common anti-patterns

### Do not recreate utility CSS inside modules

```css
.buttonLikeThing {
  @apply inline-flex items-center justify-center gap-2;
  @apply rounded-full px-4 py-2;
}
```

If the style is just utilities, keep it in JSX.

### Do not build fragile dynamic module class names

```tsx
styles[`state-${mode}`]
```

This can work mechanically, but it is brittle and hard to grep. Prefer explicit conditionals or maps.

### Do not mix structure migration with style migration

Avoid a commit that both:

- moves files into new folders
- renames components
- converts CSS ownership

That makes regressions much harder to trace.

### Do not keep a permanent replacement for `App.css`

If a temporary bridge file is ever needed during migration, it must have a removal owner and a removal checkpoint. The end state is still no long-lived global feature stylesheet.

---

## Verification plan

Each migrated slice should pass:

1. Typecheck
2. Relevant unit tests
3. Relevant e2e flows
4. Manual visual QA on the migrated surface

Minimum manual QA matrix:

- Dashboard
- Inventory list and folder explorer
- Inventory import
- Product detail
- Product create and edit
- Scan actions and scan history
- Label templates, label editor, preview/batch, downloads
- Reports, especially custom reports
- Procurement tabs
- Alerts
- Team settings

Migration commits should stay slice-sized. Good slices are:

- one feature namespace
- one dashboard conversion
- one shared primitive family such as buttons or empty states

---

## Success criteria

- `App.css` is deleted.
- `DashboardPage.css` is deleted.
- StoQR contains no long-lived global feature stylesheet.
- Every migrated screen still passes its behavior tests.
- Visual QA is complete for the high-risk surfaces listed above.
- New styles are either inline Tailwind, `@repo/ui`, or co-located modules.

---

## Tailwind vs Module cheat sheet

| Visual need | Preferred choice | Notes |
|-------------|------------------|-------|
| `display: flex; gap: 24px;` | Tailwind | `flex gap-6` |
| `grid-template-columns: repeat(3, 1fr);` | Tailwind | `grid grid-cols-3` |
| `width: 13px; height: 116px;` | Tailwind | `w-[13px] h-[116px]` |
| `width: min(100%, 520px);` | Tailwind | `w-full max-w-[520px]` |
| `@media (max-width: 860px)` | Module, usually | Tailwind `max-[860px]:...` is possible, but use it intentionally, not by default |
| `::before`, `::after` | Module | Better fit for CSS |
| `@media print` | Module | Better fit for CSS |
| `@keyframes` | Module | Better fit for CSS |
| Complex visual editor canvas or print preview | Module | Keeps the JSX readable |
| Basic active state | Tailwind first | Module only if the selector logic becomes complex |
