# Branch Update Summary: `feat/osto-33-stoqr-inventory-ui`

21 commits ahead of `main`

---

## 1. Procurement, Dashboard & Alerts

| Commit | Summary |
|--------|---------|
| `ec2019f` | Remove legacy procurement tab components — deleted the old standalone procurement tab components and collapsed their flows into the main purchase-order experience, reducing duplicated procurement UI |
| `bb0c2a7` | Add procurement approval & return workflows — added `approval_status` and `return_status` through the database and app layers, then surfaced those states with workflow badges in the procurement UI |
| `7100c02` | Add movement chart and revamp dashboard UI — added a movement chart and refreshed dashboard stat cards, while simplifying inventory interactions by removing inline quantity editing from the product list flow |
| `b1685b3` | Redesign Alerts page with feed & rules — replaced the old alert tabs with a combined alerts feed and rules panel, including unread state, bulk actions, and threshold configuration |
| `f490f0c` | Update PurchaseOrdersTab.tsx — removed the "Order queue" header and count summary from `PurchaseOrdersTab.tsx` to tighten the purchase-order layout after the procurement redesign |

**Commits:** `ec2019f`, `bb0c2a7`, `7100c02`, `b1685b3`, `f490f0c`

---

## 2. Shared DataTable Component

| Commit | Summary |
|--------|---------|
| `1c96915` | Add DataTable component and migrate tables — introduced a reusable `DataTable` in `packages/ui` and migrated several core StoQR tables to it for shared table rendering and behavior |
| `7b48708` | Replace tables with shared DataTable component — continued the table migration onto the shared `DataTable`, covering remaining screens such as scan history and dashboard tables and adding the extra props/styling those pages needed |

**Commits:** `1c96915`, `7b48708`

---

## 3. OpenSe App & Landing Experience

| Commit | Summary |
|--------|---------|
| `01d6685` | Add OpenSe app, tests, and test config — added the OpenSe app scaffold with landing/auth flows, plus Playwright coverage and test configuration so the new app could run and be validated alongside the workspace apps |
| `1c8128c` | Introduce LandingNavbar and integrate apps — added a shared `LandingNavbar` component and integrated it into ETL, OpenSe, and StoQR landing pages to replace duplicated navbar implementations |
| `9a203a4` | Allow custom landing navbar and add OpenSe navbar — added support for injecting a custom landing navbar and created an OpenSe-specific navbar for suite-level navigation and branding |
| `ec16320` | Add Get Started redirect flow and navbar context — added a `/get-started` redirect flow and context-aware navbar routing so guests and signed-in users land on the right destination, then updated tests to cover it |
| `8e44cd7` | Refactor auth redirect helpers and update tests — simplified the auth redirect helper logic and updated Playwright coverage to align with the newer navbar-driven navigation flow |
| `dec2dd3` | Revamp OpenSe landing and holding pages — redesigned the OpenSe landing and holding pages with a new hero/footer treatment and converted sub-product pages into lightweight holding pages built on shared layout offsets |
| `731d144` | Add marketing components and refactor landing — added reusable marketing layout components such as `MarketingFooter`, `MarketingPageFrame`, and `ProductLandingPage`, then refactored landing routes to use them |

**Commits:** `01d6685`, `1c8128c`, `9a203a4`, `ec16320`, `8e44cd7`, `dec2dd3`, `731d144`

---

## 4. Architecture Documentation

| Commit | Summary |
|--------|---------|
| `ede9fe8` | Update Process.drawio — resaved and adjusted the process documentation diagram, producing a documentation-only diff with layout/metadata updates and refreshed diagram content |
| `1722e82` | Update System Design.drawio — tweaked the main system design diagram view settings and metadata in Draw.io; no application runtime code changed in this commit |
| `f9b9470` | Update System Design.drawio — reworked the system design diagram layout by moving major frontend/backend blocks and remapping diagram element IDs as part of the doc cleanup |
| `d4b685d` | Split system design diagram into files — split the monolithic system design diagram into separate single-server and multi-server files so the architecture docs are easier to maintain and embed |
| `0814608` | Add architecture SVGs and carousel component — added architecture SVG assets and an `ArchitectureDiagramCarousel` component, then wired the carousel into the OpenSe landing experience |
| `b7617f7` | Update ArchitectureDiagramCarousel.tsx — removed the direct SVG imports and corresponding carousel entries while iterating on how the architecture diagrams were loaded into the component |
| `b50445f` | Update ArchitectureDiagramCarousel.tsx — restored the SVG-backed carousel entries and switched diagram list construction to `useMemo`, finalizing the architecture carousel implementation |

**Commits:** `ede9fe8`, `1722e82`, `f9b9470`, `d4b685d`, `0814608`, `b7617f7`, `b50445f`
