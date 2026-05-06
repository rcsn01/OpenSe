# Styling Architecture Migration Plan

## Current State

The StoQR app (and to some extent the broader monorepo) currently uses a mix of three styling approaches with no clear ownership rules. This causes bloat, regressions, and confusion.

| Approach | Location | Lines | Problem |
|----------|----------|-------|---------|
| **Global BEM CSS** | `apps/stoqr/src/App.css` | ~4,739 | Single dumping ground. Zero tree-shaking. High collision risk with generic names like `.button`, `.card`, `.grid`. |
| **Page-level CSS** | `apps/stoqr/src/pages/DashboardPage.css` | ~438 | Only page with its own file. Inconsistent with other pages. |
| **Tailwind inline** | Most `.tsx` pages/components | N/A | The intended standard, but undermined by the global file. |
| **CVA components** | `@repo/ui` (Button, Card, Badge, etc.) | N/A | Reusable primitives exist, but are often duplicated in `App.css`. |

### Specific symptoms

- **Naming collisions:** `.button`, `.card`, `.badge`, `.grid` in `App.css` shadow or clash with `@repo/ui` Tailwind-based components.
- **Dead code:** No safe way to delete a `.scan-*` or `.label-*` rule without grepping the entire codebase.
- **Merge conflicts:** Every feature branch touches the same 4,739-line file.
- **Inconsistent breakpoints:** Custom media queries scattered at `1200px`, `980px`, `900px`, `860px`, `767px`, `760px`, `640px`, `560px` with no standard.
- **Orphaned themes:** `App.css` defines legacy tokens (`--primary`, `--text`) that alias central tokens from `@repo/ui/styles`, creating two sources of truth.

---

## Target Architecture

We adopt a single rule:

> **Tailwind first. CSS Modules for complex scoped layouts. Never global `.css` files.**

### Decision matrix

| Situation | Target Location | Rationale |
|-----------|-----------------|-----------|
| Reusable Button, Card, Badge, Input | `@repo/ui` component (Tailwind + CVA) | Shared across apps. Theme-aware via CSS variables. |
| Page spacing, flex/grid layout, borders, colors | **Inline Tailwind** in the `.tsx` | Colocated with markup. IDE hover support. Purged automatically. |
| Complex feature layout (camera frame, label canvas, product form) | **`[Component].module.css`** next to the component | Scoped to the file. Won't leak. Easy to delete with the component. |
| Responsive rules with custom breakpoints | **CSS Module** | Tailwind's default breakpoints don't match bespoke scan/print layouts. |
| State modifiers (`.is-active`, `.is-open`) | **CSS Module** | Avoids string interpolation in JSX (`className={active ? 'is-active' : ''}`). |
| Precise pixel values (chart bars, print previews, absolute positioning) | **CSS Module** | `13px`, `116px`, `999px` are not in the Tailwind scale. |

### What is **not** allowed after migration

- **No new styles in `App.css`.** It will be deleted.
- **No global BEM files.** E.g. `ScanPage.css` sitting in `src/styles/`.
- **No `@apply` soup in modules.** Do not recreate BEM by pasting Tailwind utilities into a `.module.css` file. The module should contain only CSS that Tailwind cannot express cleanly.

---

## CSS Module conventions

### File naming
```
ScanCameraFrame.tsx
ScanCameraFrame.module.css       ← co-located, same folder
```

### Import pattern
```tsx
import styles from './ScanCameraFrame.module.css'
import { cn } from '../../lib/cn'

// Tailwind for foundation, module for scoped overrides
<div className={cn("flex flex-col gap-6", styles.cameraFrame)}>
```

### State modifiers
Use static class maps. Do not dynamically construct class names (CSS Modules hashes them at build time).

```tsx
// ❌ Don't do this
<div className={`${styles.base} ${styles[`is-${mode}`]}`} />

// ✅ Do this
<div className={cn(styles.base, mode === 'active' && styles.isActive)} />
```

### Breakpoints inside modules
Keep module queries minimal. Prefer Tailwind responsive prefixes (`md:`, `lg:`, `xl:`) for layout changes. Use module media queries only when the component has truly custom breakpoints (e.g. a print canvas at `1100px`).

---

## Migration Phases

### Phase 1 — Stop the bleeding (~5 min)

Add a deprecation header to `App.css`:

```css
/* ─────────────────────────────
   DEPRECATED: Do not add new styles here.
   Use inline Tailwind or [Component].module.css.
   ───────────────────────────── */
```

Audit any open PRs to prevent new additions.

### Phase 2 — Extract feature blocks (~2–3 hours)

Move each BEM namespace from `App.css` into a scoped module next to its owner component. Do not rewrite to Tailwind yet — just move.

| Namespace | Source in `App.css` | Destination |
|-----------|---------------------|-------------|
| `.scan-*` | ~330 lines | `features/scan/ScanCameraFrame.module.css` |
| `.label-*`, `.label-studio-*`, `.label-batch-*` | ~1,800 lines | `features/label-studio/LabelDesigner.module.css`, `LabelPreview.module.css`, `LabelBatch.module.css` |
| `.product-*`, `.product-form-*` | ~1,100 lines | `features/product/ProductDetail.module.css`, `ProductForm.module.css` |
| `.inventory-import-*` | ~300 lines | `features/inventory/InventoryImport.module.css` |
| `.explorer-*`, `.tree-*`, `.file-*` | ~200 lines | `features/explorer/Explorer.module.css` |
| `.custom-reports-*`, `.builder-*`, `.export-*` | ~500 lines | `features/reports/CustomReports.module.css` |
| `.stoqr-dashboard__*` | `DashboardPage.css` | Convert to inline Tailwind (+ tiny module for chart bars only) |

**Rules during extraction:**
1. Preserve exact CSS values. No refactors.
2. Update the owning `.tsx` to import the new module.
3. Delete the block from `App.css` immediately.
4. Run the app and visually verify the feature.

### Phase 3 — Delete `App.css` and `DashboardPage.css` (~30 min)

Once all classes are extracted:
- Delete `apps/stoqr/src/App.css`.
- Delete `apps/stoqr/src/pages/DashboardPage.css`.
- Remove the `import './App.css'` from `main.tsx` or `App.tsx`.
- Verify no unreferenced imports remain.

### Phase 4 — Consolidate generics into `@repo/ui` (~2 hours, optional)

Some classes in `App.css` are actually primitive utilities that multiple pages need:

| `App.css` class | Action |
|-------------------|--------|
| `.button` | Delete. Use `<Button>` from `@repo/ui`. |
| `.card` | Delete. Use `<Card>` from `@repo/ui`. |
| `.badge` | Delete. Use `<Badge>` from `@repo/ui`. |
| `.empty-state` | Migrate to `<EmptyState>` in `@repo/ui` if used across apps. |
| `.modal`, `.modal-backdrop` | Migrate to `<Dialog>` in `@repo/ui`. |
| `.auth-shell`, `.auth-card` | Keep as `AuthLayout.module.css` or migrate to `@repo/ui/layout`. |

### Phase 5 — Standardise breakpoints (~1 hour)

Document the app's standard breakpoints and consolidate module media queries where possible.

```
Mobile:   640px  (Tailwind default: sm)
Tablet:   768px  (Tailwind default: md)
Desktop:  1024px (Tailwind default: lg)
Wide:     1280px (Tailwind default: xl)
```

Any module query using non-standard values (e.g. `1100px`, `860px`, `560px`) should be audited. If the difference is not meaningful, shift to the nearest Tailwind breakpoint.

---

## File layout after migration

```
apps/stoqr/src/
  index.css                    ← Tailwind import + theme tokens only
  App.tsx                      ← no global CSS import
  features/
    scan/
      ScanCameraFrame.tsx
      ScanCameraFrame.module.css
    label-studio/
      LabelDesignerTab.tsx
      LabelDesigner.module.css
      LabelPreview.module.css
      LabelBatch.module.css
    product/
      ProductDetailPage.tsx
      ProductDetail.module.css
      ProductForm.module.css
    inventory/
      InventoryImportPage.tsx
      InventoryImport.module.css
    explorer/
      ExplorerTab.tsx
      Explorer.module.css
    reports/
      CustomReportsPage.tsx
      CustomReports.module.css
  pages/
    DashboardPage.tsx           ← inline Tailwind (no .css file)
    AlertsPage.tsx              ← inline Tailwind (unchanged)
    InventoryPage.tsx           ← inline Tailwind (unchanged)
    ScanPage.tsx                ← imports ScanCameraFrame.module.css
    LabelStudioPage.tsx         ← imports LabelDesigner.module.css
    ...
```

---

## Common anti-patterns

### ❌ `@apply` soup in modules
```css
/* Don't paste Tailwind utilities into a module */
.scanButton {
  @apply inline-flex items-center justify-center gap-2;
  @apply min-w-[144px] px-[22px] py-3 rounded-full;
}
```
This defeats the purpose. Put those in JSX inline.

### ❌ Constructing dynamic class names with modules
```tsx
<div className={styles[`scan-${mode}`]} />   /* won't work */
```
CSS Modules hash the class names at build time. Use explicit maps instead.

### ❌ Generic names in modules
```css
/* module.css — still bad */
.button { ... }
.card { ... }
```
Names are scoped, but generic names make the JSX harder to grep. Prefer contextual names: `.scanCameraToggle`, `.labelArtboard`.

### ❌ Leaving a "shared styles" global file
```
styles/
  shared.css
  globals.css
```
These always become dumping grounds. The only global file allowed is `index.css` (Tailwind + tokens).

---

## Success criteria

- [ ] `App.css` and `DashboardPage.css` are deleted.
- [ ] `find apps/stoqr/src -name "*.css" -not -name "*.module.css" -not -name "index.css"` returns zero files.
- [ ] No open PR adds new non-Tailwind CSS to a global file.
- [ ] Every custom BEM namespace is either in a `.module.css` or converted to inline Tailwind.
- [ ] Build passes and visual regression is acceptable across Scanner, Label Studio, Product Detail, Inventory Import, and Dashboard.

---

## Appendix: Tailwind vs Module cheat sheet

| Visual need | Tailwind? | Notes |
|-------------|-----------|-------|
| `display: flex; gap: 24px;` | `flex gap-6` | Tailwind |
| `grid-template-columns: repeat(3, 1fr);` | `grid grid-cols-3` | Tailwind |
| `border-radius: 999px;` | `rounded-full` | Tailwind |
| `color: #0f172a;` | `text-[#0f172a]` or token | Tailwind |
| `width: 13px; height: 116px;` | `w-[13px] h-[116px]` | Tailwind (arbitrary value) |
| `@media (max-width: 860px) { ... }` | `max-w-[860px]:flex-col` | Tailwind (arbitrary variant) |
| `position: absolute; inset: 0;` | `absolute inset-0` | Tailwind |
| `transition: opacity 0.18s ease;` | `transition-opacity duration-200` | Tailwind |
| `.is-active { background: #fff; }` | **Module** — state variant | CSS Module |
| `::before { ... }` | **Module** — pseudo-element | CSS Module |
| `@keyframes fadeIn { ... }` | **Module** — animation | CSS Module |
| `width: min(100%, 520px);` | `w-full max-w-[520px]` | Tailwind |
| Complex nested hover/focus states | **Module** | CSS Module |
| Print-specific styles (`@media print`) | **Module** | CSS Module |

