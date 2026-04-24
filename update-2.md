# Branch Update Summary: `feat/osto-33-stoqr-inventory-ui`

21 commits ahead of `main`

Range reviewed: `main..feat/osto-33-stoqr-inventory-ui`

---

| # | Commit | Subject | Summary |
|---|--------|---------|---------|
| 1 | `ec2019f` | Remove legacy procurement tab components | Deleted the old standalone procurement tab components and collapsed their flows into the main purchase-order experience, reducing duplicated procurement UI. |
| 2 | `bb0c2a7` | Add procurement approval & return workflows | Added `approval_status` and `return_status` through the database and app layers, then surfaced those states with workflow badges in the procurement UI. |
| 3 | `7100c02` | Add movement chart and revamp dashboard UI | Added a movement chart and refreshed dashboard stat cards, while simplifying inventory interactions by removing inline quantity editing from the product list flow. |
| 4 | `b1685b3` | Redesign Alerts page with feed & rules | Replaced the old alert tabs with a combined alerts feed and rules panel, including unread state, bulk actions, and threshold configuration. |
| 5 | `f490f0c` | Update PurchaseOrdersTab.tsx | Removed the "Order queue" header and count summary from `PurchaseOrdersTab.tsx` to tighten the purchase-order layout after the procurement redesign. |
| 6 | `1c96915` | Add DataTable component and migrate tables | Introduced a reusable `DataTable` in `packages/ui` and migrated several core StoQR tables to it for shared table rendering and behavior. |
| 7 | `7b48708` | Replace tables with shared DataTable component | Continued the table migration onto the shared `DataTable`, covering remaining screens such as scan history and dashboard tables and adding the extra props/styling those pages needed. |
| 8 | `ede9fe8` | Update Process.drawio (resaved with diagrams.net) | Resaved and adjusted the process documentation diagram, producing a documentation-only diff with layout/metadata updates and refreshed diagram content. |
| 9 | `1722e82` | Update System Design.drawio | Tweaked the main system design diagram view settings and metadata in Draw.io; no application runtime code changed in this commit. |
| 10 | `01d6685` | Add OpenSe app, tests, and test config | Added the OpenSe app scaffold with landing/auth flows, plus Playwright coverage and test configuration so the new app could run and be validated alongside the workspace apps. |
| 11 | `1c8128c` | Introduce LandingNavbar and integrate apps | Added a shared `LandingNavbar` component and integrated it into ETL, OpenSe, and StoQR landing pages to replace duplicated navbar implementations. |
| 12 | `9a203a4` | Allow custom landing navbar and add OpenSe navbar | Added support for injecting a custom landing navbar and created an OpenSe-specific navbar for suite-level navigation and branding. |
| 13 | `f9b9470` | Update System Design.drawio | Reworked the system design diagram layout by moving major frontend/backend blocks and remapping diagram element IDs as part of the doc cleanup. |
| 14 | `ec16320` | Add Get Started redirect flow and navbar context | Added a `/get-started` redirect flow and context-aware navbar routing so guests and signed-in users land on the right destination, then updated tests to cover it. |
| 15 | `8e44cd7` | Refactor auth redirect helpers and update tests | Simplified the auth redirect helper logic and updated Playwright coverage to align with the newer navbar-driven navigation flow. |
| 16 | `dec2dd3` | Revamp OpenSe landing and holding pages | Redesigned the OpenSe landing and holding pages with a new hero/footer treatment and converted sub-product pages into lightweight holding pages built on shared layout offsets. |
| 17 | `731d144` | Add marketing components and refactor landing | Added reusable marketing layout components such as `MarketingFooter`, `MarketingPageFrame`, and `ProductLandingPage`, then refactored landing routes to use them. |
| 18 | `d4b685d` | Split system design diagram into files | Split the monolithic system design diagram into separate single-server and multi-server files so the architecture docs are easier to maintain and embed. |
| 19 | `0814608` | Add architecture SVGs and carousel component | Added architecture SVG assets and an `ArchitectureDiagramCarousel` component, then wired the carousel into the OpenSe landing experience. |
| 20 | `b7617f7` | Update ArchitectureDiagramCarousel.tsx | Removed the direct SVG imports and corresponding carousel entries while iterating on how the architecture diagrams were loaded into the component. |
| 21 | `b50445f` | Update ArchitectureDiagramCarousel.tsx | Restored the SVG-backed carousel entries and switched diagram list construction to `useMemo`, finalizing the architecture carousel implementation. |