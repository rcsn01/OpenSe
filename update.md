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
| `a2cf9c4` | Integrate auth provider and envDir config — add `@repo/shared` as a workspace dependency in `ui-design`, wrap routes in `<AuthProvider>`, set `ThemeProvider` props (`defaultTheme="light"`, `storageKey="opense-theme"`, `cookieKey="opense-theme"`, `respectStoredTheme={Boolean(user)}`), and set Vite `envDir: resolve(__dirname, '../..')` |

**Commits:** `f973f5d`, `a2cf9c4`

---

## 3. Inventory Core — Folders & Navigation

| Commit | Summary |
|--------|---------|
| `472598bc` | Add folder CRUD, drag-and-drop, and folder-based filtering — add `renameFolderInInventory`, `deleteFolderInInventory` (descendant handling plus move-uncategorised/delete-products actions), and `moveFolderInInventory` APIs with tests; add corresponding hooks; rewrite `FolderNavigationPanel` with `@dnd-kit` (inline rename, two-step delete dialog, All Products + Uncategorised views, expand-to-active, sort by `sort_order` then name); wire `folderView`/`selectedFolderId` through `AllProductsTab` and `InventoryPage` with `folderId` filtering (`IS NULL` for uncategorised) |
| `3ce56a2c` | Add move-selected-products workflow — add `moveInventoryProducts(companyId, productIds, folderId)` API and `useMoveInventoryProducts`; add Move dialog with folder selector and full folder path display; add success toast; selection mode emphasizes Delete + Move; add `onMoveSelected` and `onClearSelection` props; add `inventory-selection-actions.spec.ts` E2E |
| `7d1c2b71` | Remove locations feature and related data model — remove `stoqr.inventory_locations` table and RLS from migration SQL, remove `location_id` from `stoqr.products`, remove `idx_products_company_location`, update inventory stats RPC to drop location join, delete `CategoriesLocationsTab.tsx`, remove `createInventoryLocation`/`useCreateInventoryLocation`, and remove locations from reference-data hooks; bump Supabase CLI `v2.78.1` → `v2.84.2` |
| `a3697d75` | Remove standalone folders tab and legacy folder query path — delete `FoldersTab.tsx`, remove `fetchFolderProducts` API and `useFolderProducts` hook, remove Folders tab wiring, and standardize folder filtering through `fetchInventoryProducts(folderId)` plus parent-managed `selectedFolderId` state |
| `dd0a1941` | Add mobile-responsive inventory explorer — add matchMedia-based mobile detection and sidebar state in `AllProductsTab`, slide-in explorer shell and backdrop, mobile toggle wiring in `InventoryFiltersBar`, auto-close on folder/action selection, responsive CSS (`.explorer-sidebar-shell`, `.explorer-mobile-toggle`, `.explorer-mobile-backdrop`), and tests for open/close behavior |
| `90ccf013` | Move folders into All Products explorer and add grid view — extract `FolderNavigationPanel` component, integrate explorer split layout in `AllProductsTab`, add inline new-folder creation and folder-select pagination reset, add `ProductListView` list/grid rendering (`view: 'list' | 'grid'`), and pass `folderId` from `InventoryPage` into inventory product queries |

**Commits:** `472598bc`, `3ce56a2c`, `7d1c2b71`, `a3697d75`, `dd0a1941`, `90ccf013`

---

## 4. Inventory UI — Layout, Filters & Toolbars

| Commit | Summary |
|--------|---------|
| `cdf2fbc0` | Add shared inventory toolbar controls and tests — add typed `StockStatusFilterDropdown`, `AddFilterDropdown`, `InventoryViewToggle`, and `InventoryToolbarControls` components in `packages/ui`, export them via component indexes, and add an interactive "Inventory Toolbar Controls" showcase to `DataDisplayPage` |
| `dc8ee73a` | Refactor inventory filters to use shared toolbar components — replace inline stock filter/add-filter/view-toggle controls with `@repo/ui` components, remove `.add-filter-button` CSS, and switch stock filter labels from a Record map to `{ value, label }` options array |
| `172c0d20` | Refine product table columns and sorting — remove Status column and SKU label from product name link, show Available as `available / reorder_point` in list and grid modes with color cues, make Name/SKU/Folder/Price/On Hand/Allocated/Available headers sortable via `.sortable-th`, extend `SortField` with `folder_id` and `reorder_point`, and add unit/E2E coverage (`ProductListViewColumns.test.tsx`, `inventory-columns.spec.ts`) |
| `8863dabe` | Remove inventory summary stats and tabbed bulk workflows — delete `BulkActionsTab.tsx` and `BarcodeSkuTab.tsx`, remove summary stats section/CSS, add `BulkAdjustModal` for price/qty updates, update selection mode actions to `Adjust Price`, `Adjust Qty`, `Export CSV`, `Move`, `Delete`, simplify `InventoryPage` to All Products only, and redirect `/inventory/barcode-sku` to `/inventory/all` |

**Commits:** `cdf2fbc0`, `dc8ee73a`, `172c0d20`, `8863dabe`

---

## 5. SideSheet Component

| Commit | Summary |
|--------|---------|
| `abf8b5a9` | Add reusable `SideSheet` and integrate across UI — introduce `SideSheet` plus `Content/Header/Title/Description/Body/Footer` subcomponents wrapping `Dialog layout="right-sheet"`, add `SideSheet.test.tsx`, refactor `OrganisationPermissionsPanel` to use SideSheet primitives, add SideSheet demo to `OverlaysPage`, adjust `TopBar` spacing (`h-14` → auto with top padding), and export/re-export SideSheet components from `packages/ui` and `ui-design` |

**Commits:** `abf8b5a9`

---

## 6. Label Studio

| Commit | Summary |
|--------|---------|
| `bdedf428` | Consolidate Label Studio workflows and move designer into SideSheet — reduce tabs to `templates` and `preview-batch`, add route aliases (`design` → `templates`, `downloads` → `preview-batch`) with redirects, open label designer from template library in a SideSheet, pass `selectedTemplateId` across library/designer/batch tabs, inline Recent Downloads into batch flow, auto-download PDF via `downloadLabelPdf`, and remove `template_type` from API/DB (including seed/index updates) |
| `0da423f6` | Overhaul designer and preview UX — add extensive CSS and stepper-based export flow (template -> target data -> copies), add shared `LabelPreviewCard` live preview, redesign `LabelDesignerTab` controls (size presets, canvas controls, field toggles, reset-to-saved), add `labelLayout.ts` controls and helpers, update `TemplateLibraryTab` with search + toggleable create form, include `selling_price` in label product type, and expand tests |
| `fda518b7` | Add render-plan-based page preview and asset pipeline — add `labelRenderPlan.ts`, `labelAssetRenderers.ts`, `useLabelAssetDataUrls.ts`, and `LabelRenderPreview.tsx`; support label/page preview modes with pagination in `LabelPreviewCard`; switch batch preview to page mode; and refactor `pdfExport.ts` to use shared render plan/assets |
| `41ae37cd` | Redesign template library table and layout summary metadata — switch Template Library columns to Name/Size/Type/Fields with clickable rows and editing highlight, add `getLabelLayoutSummary()` in `labelLayout.ts`, reuse summary in designer, add `.grid-4` CSS utility, add tests, and change default reports route to `/reports/stock-health` |

**Commits:** `bdedf428`, `0da423f6`, `fda518b7`, `41ae37cd`

---

## 7. Reports

| Commit | Summary |
|--------|---------|
| `0e90f80b` | Restructure Reports page and replace legacy tabs — replace old valuation/movement/reorder/exports tabs with `stock-health`, `movement-velocity`, `procurement-suppliers`, `audits-shrinkage`, and `custom-saved`; fully implement `StockHealthValuationTab` with Recharts (valuation, COGS, health mix, efficiency targets, aging/folder/ABC/category visualizations); remove page-level date range; set reports default route to `/reports/stock-health` |
| `cff069a4` | Implement `MovementVelocityTab` — replace placeholder with full range-driven report (7d/30d/quarter/custom), inbound/outbound stat cards with sparklines, return rate KPI, inbound-vs-outbound line chart, top-moving SKUs, and recent transfers; wire `companyId` from `ReportsPage` |
| `58735679` | Implement procurement and audit report tabs — build full `AuditsShrinkageTab` and `ProcurementSuppliersTab` experiences (KPIs, charts, scorecards, discrepancy log and reason filters), add `fetchAuditShrinkageData`, add `useAuditShrinkageData` and procurement data hooks, and add responsive `.audit-layout` styles |
| `dbcea4fd` | Implement `CustomSavedReportsTab` builder — add Saved Templates sidebar, Scheduled Delivery card, 3-column field groups (Inventory/Financial/Activity), filter/sort controls, save/generate actions, and built-in default templates; wire `companyId` from `ReportsPage` |
| `b4205a5b` | Add report tests, demo seed data, and E2E auth optimization — add `ReportTabs.test.tsx` (all 5 tabs), rewrite `reports.spec.ts` for tab-specific assertions, add `55_stoqr_reports_demo.sql` and seed path config, add `loginWithSupabaseClient()` fixture with UI fallback, and dedupe procurement report orders via memoized `mergedOrders` |

**Commits:** `0e90f80b`, `cff069a4`, `58735679`, `dbcea4fd`, `b4205a5b`

---

## 8. Procurement

| Commit | Summary |
|--------|---------|
| `b149951f` | Redesign Incoming Receiving and Purchase Orders — add `IncomingReceivingTab` with shipment summaries/statuses and scanner CTA; rewrite `PurchaseOrdersTab` using shared UI components (search, status filter, low-stock auto-generate, enriched table/status badges, create-PO form); update `ProcurementPage` wiring and E2E selectors |
| `0a492151` | Redesign Suppliers and implement Purchase Requests — rewrite `SuppliersTab` as searchable card-based vendor management with performance metrics and add-supplier flow; add full `PurchaseRequestsTab` (create, approve, deny, convert-to-PO) with low-stock-derived requests and fallback requesters; wire into `ProcurementPage` |
| `d50085ec` | Implement Vendor Returns (RMA) tab — add `VendorReturnsTab` with logistics and credit-resolution status tracking, table and log-new-return flow, derive base returns from supplier/PO data, wire into `ProcurementPage`, and expand E2E coverage |

**Commits:** `b149951f`, `0a492151`, `d50085ec`