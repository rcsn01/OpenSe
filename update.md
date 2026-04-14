# Branch Update Summary: `feat/osto-33-stoqr-inventory-ui`

32 commits ahead of `main`

---

## 1. Typography & Design Tokens

| Commit | Summary |
|--------|---------|
| `2147f24` | Refactor ProductListView UI and add bulk actions — replace column-driven table with redesigned layout, selection-based action bar, bulk delete, sorting controls select + direction toggle |
| `df7664f` | Centralize typography tokens, switch to DM Mono — remove Google font links, add `typography-tokens.css` with semantic tokens, import from `packages/ui`, revamp Typography demo page |
| `6c0730b` | Refactor typography to use design tokens — swap `font-mono` → `type-mono`, replace hardcoded sizes with CSS vars (`--type-size-*`, `--type-weight-*`) across ETL and StoQR |
| `2c4c0a9` | Centralize font family to `--font-family` — remove redundant `--font-*` declarations, update LandingPage components, change `.type-mono` to use `--font-family` |
| `6649a53` | Update styles.css — style changes |
| `b8adbab` | Use design color tokens across apps — replace hard-coded slate/hex colors with centralized `--color-*` CSS tokens, add ETL accent tokens, dark-mode utility mappings, update UI tokens |
| `276ae57` | Use theme variables and BasePage wrapper — add color tokens (`color-tab-active`, `color-side-nav-active-*`, `color-explorer-active-*`), update components to consume them, wrap ProductDetail/ProductForm pages with `BasePage` |

**Commits:** `2147f24`, `df7664f`, `6c0730b`, `2c4c0a9`, `6649a53`, `b8adbab`, `276ae57`

---

## 2. Theme Persistence & Auth

| Commit | Summary |
|--------|---------|
| `f973f5d` | Persist and sync theme across apps — `ThemeProvider` reads shared cookie + localStorage, persists to both, reacts to focus/storage/visibility events; Accounts, Admin, ETL, StoQR opt into `respectStoredTheme` |
| `a2cf9c4` | Integrate auth provider and envDir config — add `@repo/shared` dependency, wrap UI design app with `AuthProvider`, set Vite `envDir` to monorepo root |

**Commits:** `f973f5d`, `a2cf9c4`

---

## 3. Inventory Core — Folders & Navigation

| Commit | Summary |
|--------|---------|
| `dd0a1941` | Remove inventory folders feature and cleanup — delete `FoldersTab.tsx`, remove `fetchFolderProducts` API, `useFolderProducts` hook, remove Folders tab from InventoryPage |
| `90ccf013` | Moved folders tab to all products tab |
| `7d1c2b71` | Add folder management & DnD to inventory — add folder CRUD (`renameFolderInInventory`, `deleteFolderInInventory`, `moveFolderInInventory`), refactor `FolderNavigationPanel` with views/CRUD/DnD via `@dnd-kit`, add folder sort order DB migration |
| `3ce56a2c` | Remove inventory locations feature — delete Locations UI, remove `createInventoryLocation` API and `useCreateInventoryLocation` hook, drop `stoqr.inventory_locations` table from DB |
| `172c0d2` | Inventory: remove bulk delete & revamp columns — remove Status column, show Available as "available / reorder_point" with color coding, add `folder_id` and `reorder_point` to `SortField`, narrow sidebar to 220px |
| `472598bc` | Add bulk-move products UI and API — add `moveInventoryProducts` API (`folder_id` update), `useMoveInventoryProducts` mutation, move dialog in `AllProductsTab`, CSV export of selected rows |

**Commits:** `dd0a1941`, `90ccf013`, `7d1c2b71`, `3ce56a2c`, `172c0d2`, `472598bc`

---

## 4. Inventory UI — Layout, Filters & Toolbars

| Commit | Summary |
|--------|---------|
| `cdf2fbc0` | Add Inventory toolbar controls & tests — introduce `InventoryToolbarControls` composite component (`StockStatusFilterDropdown`, `AddFilterDropdown`, `InventoryViewToggle`) in `packages/ui` |
| `dc8ee73a` | Use shared UI components for inventory filters — replace custom buttons/dropdowns in `InventoryFiltersBar` with shared UI components, add `stockFilterOptions`, `isStockFilterValue` helpers |
| `8863dabe` | Consolidate inventory bulk actions into modal — remove `BulkActionsTab` and `BarcodeSkuTab`, add `BulkAdjustModal` for price/quantity adjustments, simplify `InventoryPage` to render `AllProducts` directly, redirect `/inventory/barcode-sku` → `/inventory/all` |
| `bdedf428` | Add mobile explorer toggle for inventory — implement responsive mobile folder navigation with slide-in sidebar, backdrop, matchMedia listeners, accessibility attributes |

**Commits:** `cdf2fbc0`, `dc8ee73a`, `8863dabe`, `bdedf428`

---

## 5. SideSheet Component

| Commit | Summary |
|--------|---------|
| `abf8b5a` | Add SideSheet component and integrate — introduce reusable `SideSheet` (with `Content`, `Header`, `Title`, `Description`, `Body`, `Footer` sections), add tests, replace Dialog-based right-sheet in `OrganisationPermissionsPanel` |

**Commits:** `abf8b5a`

---

## 6. Label Studio

| Commit | Summary |
|--------|---------|
| `0da423f6` | Combine Label Studio workflows and add downloads — merge Design/Downloads into two tabs (Templates, Preview & Batch), share selected template state, add `downloadLabelPdf` helper, canonicalize routes (`design` → `templates`, `downloads` → `preview-batch`) |
| `fda518b7` | Remove `template_type`, add `updated_at`, update UI — drop legacy `template_type` field, add `updated_at` to `LabelTemplate`, revamp `TemplateLibraryTab` with search, toggleable create form, formatted dates |
| `41ae37cd` | Label Studio: add preview card and layout controls — add `labelLayout.ts` (default controls, resolve/serialize, field list, price formatter), `LabelPreviewCard` component, refactor `LabelDesignerTab`/`LabelPreviewBatchTab`, include `selling_price` in label product type |
| `0e90f80b` | Label export: render plan, preview & assets — add `labelRenderPlan` (placement/plan builders, A4 metrics, wrapping, page counting), `LabelRenderPreview` SVG, `labelAssetRenderers` (QR/barcode data URLs), `useLabelAssetDataUrls` hook, refactor `pdfExport` to reuse render plan |
| `cff069a4` | Add Stock Health reports and label UI tweaks — add `getLabelLayoutSummary`, refactor `TemplateLibraryTab` with Size/Type/Fields columns, keyboard-accessible rows, update template metadata, add unit tests |

**Commits:** `0da423f6`, `fda518b7`, `41ae37cd`, `0e90f80b`, `cff069a4`

---

## 7. Reports

| Commit | Summary |
|--------|---------|
| `58735679` | Implement MovementVelocityTab with charts & stats — full implementation with inbound/outbound totals, return rate, sparklines, top-moving SKUs, `Inbound vs Outbound` recharts `LineChart`, `MiniSparkline` SVG, custom date ranges |
| `dbcea4fd` | Add Audits & Procurement reports UIs and API — add `fetchAuditShrinkageData` + types for `inventory_transactions`, `AuditsShrinkageTab` (charts, reason inference, shrinkage metrics, discrepancy log), `ProcurementSuppliersTab` (PO stats, lead time, defect rate, scorecard, price variance chart) |
| `b4205a5b` | Add Custom Saved Reports UI and styles — introduce `CustomSavedReportsTab` with report builder, saved templates, field groups, filters/sorting, scheduled delivery card, local template management |
| `b149951f` | Reports: refactor procurement, add tests & demo seed — merge `procurementOrders`/`procurementHistory` into memoized `mergedOrders` in `ProcurementSuppliersTab`, add unit tests for report tabs, update Playwright E2E, add Supabase demo seed (`55_stoqr_reports_demo.sql`) |

**Commits:** `58735679`, `dbcea4fd`, `b4205a5b`, `b149951f`

---

## 8. Procurement

| Commit | Summary |
|--------|---------|
| `0a492151` | Revamp procurement tabs and add shipments — add `IncomingReceivingTab` (shipment summaries, ETA/status badges), overhaul `PurchaseOrdersTab` (search, status filtering, totals, improved create-PO flow, alert automation), overhaul `SuppliersTab` (searchable cards, performance metrics, dialogs, on-time/accuracy heuristics) |
| `d50085ec` | Add Purchase Requests tab and tests — introduce `PurchaseRequestsTab` (create, approve, deny, convert to PO, view details) using procurement hooks, wire into `ProcurementPage` |
| `a3697d75` | Add Vendor Returns tab (RMA) — introduce `VendorReturnsTab` (log supplier RMAs, logistics + credit statuses), generate base return records, add dialog to log new returns, client-side sorting/formatting |

**Commits:** `0a492151`, `d50085ec`, `a3697d75`