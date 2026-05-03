# Branch Update Summary: `feat/osto-33-stoqr-inventory-ui`

23 commits ahead of `main`

---

## 1. Marketing & Landing Pages

| Commit | Summary |
|--------|---------|
| `e8f5732` | Add animated feature previews to product landing pages — extend `ProductLandingPage` with an optional `preview` slot and preview-card layout, add `OpenEtlLandingPreviews.tsx` with six animated SVG demos plus reduced-motion-safe CSS, and embed matching animated preview cards into `OpenEtlLandingPage` and `OpenStoqrLandingPage` so feature tiles show richer visual demos instead of icon-only treatments |
| `b92e695` | Remove the standalone ETL and StoQR app landing pages — delete the in-app `LandingPage` implementations, change each app’s root route to a `RootRedirect` that sends authenticated/demo users to the dashboard and guests to login, add redirect unit tests, and update Playwright/auth coverage to reflect the new entry flow instead of page-object-driven landing-page checks |

**Commits:** `e8f5732`, `b92e695`

---

## 2. Alerts, Procurement & Organisation UI

| Commit | Summary |
|--------|---------|
| `3ada7f6` | Refactor Alerts and Purchase Orders UI — restyle `PurchaseOrdersTab` into a tighter card shell with bordered header, inline low-stock automation hint, embedded create-order section, and inline status messaging; replace the Alerts feed list with a sortable, paginated `DataTable` plus search/filter/sort helpers and checkbox selection; and add a configurable `containerClassName` to `OrganisationMembersTable` so `OrganisationTeamsPage` and `OrganisationTeamsTab` can use consistent card wrappers |

**Commits:** `3ada7f6`

---

## 3. Inventory Interaction & URL State

| Commit | Summary |
|--------|---------|
| `412162d` | Add selection checkboxes to the inventory product list — introduce a dedicated selection column in `ProductListView` with per-row checkboxes, a header select-all checkbox with indeterminate state, and click propagation guards; update `InventoryPage` selection handlers to use functional `Set` updates so bulk toggles only affect currently visible products while preserving other selections; and add tests for row and header checkbox behavior |
| `d973ea1` | Sync inventory filters, pagination, and sorting to the URL — add `inventoryUrlState.ts` to parse, serialize, and canonicalize stock filters, page, page size, sort state, and custom field filters; rework `InventoryPage` to hydrate from search params and write state changes back to the URL before driving queries; and simplify sorting props across `AllProductsTab` and `ProductListView` to a single `onSortChange(field)` callback with updated component tests |

**Commits:** `412162d`, `d973ea1`

---

## 4. Test Stability, Auth & Legacy Routing

| Commit | Summary |
|--------|---------|
| `89236ad` | Improve test and auth stability across the stack — let the OpenSe app test script pass cleanly when no tests exist, add legacy redirects for `/tools/labels/design` and `/tools/labels/downloads`, extract inventory bulk-selection logic into `getNextSelectedRowIdsForVisibleToggle()` with unit coverage, reconcile Supabase cookie and `localStorage` session state with a `localStorage` fallback for unreliable cookie persistence, provide a stable in-memory `localStorage` for UI tests, and rework Playwright auth/navigation helpers plus StoQR inventory route coverage and selection/folder E2E flows |
| `8129a00` | Reframe Playwright coverage around behavior-first E2E tests — add `docs/skills/e2e-testing.md` as a testing/agent guide, remove a large set of flaky or redundant Accounts/Admin/ETL specs, simplify surviving app tests to rely more on shared fixtures, page objects, and user-visible assertions, relax brittle route expectations around shared auth redirects, and tune StoQR/Admin selectors plus shared page/login helpers to match the more stable black-box testing style |

**Commits:** `89236ad`, `8129a00`

---

## 5. Shared Search, Filters & Pagination

| Commit | Summary |
|--------|---------|
| `e8448b7` | Add page-size controls and alerts layout search context — thread `setPageSize` through `InventoryPage`, `AllProductsTab`, and `ProductListView`, add `[10, 20, 50]` inventory page-size options, and extend both app-level and shared `Pagination` components with accessible page-size selectors that reset inventory back to page 1 on change; expose top-bar search state through `AppLayout` outlet context so `AlertsPage` can reuse the shared search box and alerts-specific placeholder; and refactor Alerts filters/actions around `AddFilterDropdown` with updated unit and E2E coverage |
| `cccf985` | Push shared top-bar search and shared filters into procurement purchase orders — make `PurchaseOrdersTab` accept a route-scoped `searchTerm`, replace its inline search and custom dropdown with `AddFilterDropdown` plus an active-filter pill, pass the shared layout search value from `ProcurementPage`, teach `AppLayout` to switch placeholders and clear search per route scope (`alerts`, `procurement-purchase-orders`, default), and extend unit/E2E coverage for the new procurement toolbar behavior |
| `53a4b0b` | Roll out shared fuzzy page search across StoQR — add a shared `match-sorter`-based `pageSearch` utility plus a debounced search hook, persist the top-bar `q` param in `AppLayout` and forward it through outlet context so Inventory, Alerts, Scan History, Team Settings activity, and Purchase Orders all consume the same search term, upgrade `TopBar` with clear and Escape-to-clear behavior, debounce and URL-sync inventory search, expand empty states/count messaging and search tests including Playwright coverage, and tighten OpenSe auth redirects to prefer `VITE_OPENSE_PUBLIC_URL` while preserving nested search context through `CompanyGate` |
| `b5a992b` | Turn the top bar into a searchable suggestion combobox — add a reusable `SearchCombobox` plus suggestion ranking helpers, let `AppLayout` merge route-default suggestions with page-provided `TopBarSearchConfig`, and wire contextual suggestions plus selection handlers into Label Studio, template browsing, Inventory, Scan, Reports, Suppliers, Purchase Orders, Alerts, and Team Settings so the shared top-bar search can navigate or prefilter content instead of acting like a plain text box |
| `1cd37ff` | Stabilize the new top-bar search context to avoid navigation churn — teach `AppLayout` to deep-compare search suggestions/config before updating state, memoize the outlet context object so nested routes stop re-rendering from redundant top-bar config writes, and add a Playwright flow that verifies navigation still works after using the shared search across multiple StoQR routes |
| `0bdc268` | Finish Scanner’s migration to the shared top-bar search — remove the inline manual-entry search from `QuickScanTab`, let `ScanPage` own reset behavior so “search again” clears the top-bar query, stops the camera, and returns to manual mode, tighten the scan page into a full-height flex container for the camera panel, and update unit/E2E coverage to assert the combobox-driven search flow instead of the removed inline field |

**Commits:** `e8448b7`, `cccf985`, `53a4b0b`, `b5a992b`, `1cd37ff`, `0bdc268`

---

## 6. Layout Shell & Panels

| Commit | Summary |
|--------|---------|
| `c6aa835` | Fix page-level overflow and keep inventory scrolling inside the table region — add a `contentStyle` prop to shared and app `BasePage`, tighten `InventoryPage` container/content sizing, make `DataTable` wrappers `overflow-hidden`, and update `.explorer-main` with `min-width`/`min-height` guards so nested layouts stay bounded; add a Playwright check that the inventory table scrolls internally without forcing the whole page to scroll |
| `c0f0193` | Add an optional `bottomSpacing` prop to shared tabs so pages can opt into consistent spacing under tab bars — thread the prop through `TabBar`, app-level `Tabs`, and `TabsHeader`, apply it across Admin, ETL, StoQR, and UI Design tabbed pages, remove now-redundant top padding from StoQR procurement tabs, and update Alerts tests to assert the spacing class |

**Commits:** `c6aa835`, `c0f0193`

---

## 7. Organisation Settings & Migrations

| Commit | Summary |
|--------|---------|
| `5508b4a` | Add organisation page availability settings and refresh the Supabase migration baseline — introduce StoQR organisation page settings APIs, query hooks, a `PageAvailabilityGuard`, and a new Team Settings `PagesTab` for enabling/disabling Reports, Procurement, and Alerts at the company level; wire those guards into the affected pages with new unit/E2E coverage; and replace the older fragmented Supabase migrations with consolidated `20260428_*` domain migrations, an accompanying migrations README, and updated seed files while ignoring migration temp artifacts |

**Commits:** `5508b4a`

---

## 8. Dashboard Layout & Resilience

| Commit | Summary |
|--------|---------|
| `3014a7c` | Tighten the StoQR dashboard layout for denser screens — reduce panel/card padding, shrink sparkline and chart dimensions, rebalance the top and bottom grid column ratios, trim typography and gaps throughout the CSS, add overflow protection for long content, and apply `BasePage` content/container sizing tweaks so the dashboard fits more cleanly inside the app shell |
| `244c4d8` | Further compact the StoQR dashboard for high-density layouts — shrink gaps, icon sizes, labels, legends, row spacing, and chart dimensions again, drop dashboard content/card padding from `md` to `sm`, tighten the top grid ratio and delivery row sizing, and clean up dashboard helper typing by making trend, attention, and delivery builders return explicit typed objects and reusable `statusVariant` values |
| `e24cbab` | Replace synthetic dashboard fallback trends with real empty-state handling — build zero-filled seven-day windows for movement charts and sparklines instead of fake sample data, show explicit “no movement history yet” messaging and an empty velocity panel for new organisations, add test coverage for those empty states, and bundle a small local mail Docker Compose setup while removing the obsolete `task.md` note |

**Commits:** `3014a7c`, `244c4d8`, `e24cbab`

---

## 9. Label Studio & Side Sheets

| Commit | Summary |
|--------|---------|
| `605b1ad` | Add bounded QR scaling controls to Label Studio and make side sheets sizeable — replace the label designer’s numeric QR scale input with a range slider whose max is computed from the current label dimensions, add layout/render-plan helpers for mm-to-point conversion, minimum sizes, padding, and QR sizing so QR codes cannot overflow the label, and thread `panelStyle` through `Dialog`/`SideSheet` so `LabelStudioPage` can open the designer in a wider sheet; add matching unit tests and a `.codex` config file |
| `5a0f213` | Add a first-class `size` prop to `SideSheet` with a shared `page` preset — move the wide-sheet width into reusable UI primitives, have `SideSheet` merge preset styles with any custom `panelStyle`, switch `LabelStudioPage` and `OrganisationPermissionsPanel` to `size="page"`, and update tests to assert the preset width directly instead of ad hoc per-page styling |

**Commits:** `605b1ad`, `5a0f213`

---

## 10. Security Hardening & Runtime Guards

| Commit | Summary |
|--------|---------|
| `17a79b0` | Harden redirects, runtime error handling, formula validation, and Edge Function access — restrict Accounts/OpenSe post-auth redirects to known first-party app origins to avoid open redirects, add shared `ErrorBoundary` support and wrap multiple app roots with it, tighten ETL math-formula validation and related query/API guards, add typed env declarations and safer shared Supabase session handling, centralize allowed-origin CORS headers for authenticated Supabase Edge Functions, and expand the secret-leak checker plus supporting tests/config examples |
| `b43a5f4` | Add centralized request validation and sandbox safeguards — introduce a shared Edge Function request-validation helper for parsing emails, URLs, tiers, seat limits, integers, and origin checks, reuse it across billing/user-management functions with clearer error handling, expose origin allowlist helpers from the shared CORS module, harden the ETL CodeNode sandbox by blocking escape patterns and requiring an array of row objects, and lazy-load UI Design routes while expanding `env.d.ts` coverage across apps |

**Commits:** `17a79b0`, `b43a5f4`
