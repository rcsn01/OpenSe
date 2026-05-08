## Open-StoQR
**Goal:** An open-source, web-based inventory management system designed for small-to-mid-size teams to track stock, manage procurement workflows, print labels, and run warehouse operations end to end. Source datasets are stored locally on-device using IndexedDB to avoid leaking sensitive inventory data to cloud providers during daily operations.

### Privacy-First Product Positioning
- Open-StoQR is designed so that the primary inventory dataset resides in the user's browser, minimising exposure to third-party backends.
- Daily scanning, pick-and-pack, and shelf-level counting happen client-side using camera-based barcode/QR-code scanning and local IndexedDB persistence.
- Teams can operate in sensitive environments (healthcare, fintech, government) without uploading full stock manifests into a shared SaaS database.
- Workflow definitions (products, suppliers, user accounts, and activity logs) are backed by Supabase, but raw inventory movements and label data are generated and stored locally.

### Core Product Capabilities
- Real-time dashboard with KPI widgets (total inventory value, stock levels, low-stock alerts, pending orders) and quick actions (add item, create order, scan).
- Searchable and filterable inventory list with support for categories, locations, images, barcodes/SKUs, min/max thresholds, and bulk import/export (CSV/Excel).
- Camera-based barcode and QR-code scanner for rapid lookup, stock-in, stock-out, and adjustments, with fallback manual entry and scan-history logging.
- Label Studio for designing custom product, shelf, bin, and shipping labels using templates, variable fields (barcode, SKU, name, price, QR), batch print, and PDF/PNG export.
- Comprehensive reporting suite covering inventory valuation, stock-movement history, usage/depletion, reorder-point analysis, dead-stock identification, and custom date ranges with export to CSV/PDF.
- Procurement workflow including purchase-order creation, supplier management, order tracking, receiving with partial receipts, and order-history archiving.

### Data Processing and Storage
- Client-side dataset persistence via IndexedDB for inventory counts, scan logs, and label generation during active sessions.
- Supabase-backed storage for shared master data: products, suppliers, purchase orders, user accounts, audit logs, and RBAC policy definitions.
- Bulk CSV import/export of inventory records; images are stored in Supabase Storage with public/private bucket controls.
- Label generation previews render in-browser before printing; exported PDFs/PNGs are produced client-side via HTML5 canvas or dedicated print pipelines.
- This hybrid model means day-to-day warehouse floor activities can run locally, while organisational control, backup, and collaboration are cloud-enabled.

### Team, Governance, and Access
- Multi-user support with team invites and role-based access control (RBAC) down to screen and action level.
- Built-in roles: owner, admin, manager, scanner, viewer; custom roles can restrict access to procurement, label printing, or reporting modules.
- Audit trail of all inventory create/update/delete, scan events, and label print jobs for compliance traceability.
- Two-factor authentication (2FA) support and organisation-level settings for password policy and session timeout.

### Alerts, Monitoring, and Notifications
- Low-stock notifications triggered when items fall below configurable minimum thresholds or reorder points.
- Expiration warnings for perishable inventory based on custom shelf-life rules.
- Custom alert rules engine for location-specific thresholds, dead-stock flags, and pending-receipt delays.
- Notification channels: in-app badge, email, and push (via service-worker integration).
- Alert history log with resolution tracking so teams can review past issues and their root causes.

### Billing and Subscription Flow
- Organisation tier upgrades handled through Supabase Edge Functions and integrated checkout for self-service plan changes.
- Free tier supports single-location teams; paid tiers unlock multi-location tracking, advanced reporting, custom labels, and expanded user seats.

### UX Principles
- Mobile-first interface so floor staff can operate from phones and tablets during counting, scanning, and receiving workflows.
- Clear colour-coded stock status (healthy, low, out-of-stock) throughout lists, reports, and dashboard widgets.
- One-tap actions for the most common flows: scan, adjust stock, create PO, print label.
- Offline-capable scanning and stock adjustment with automatic background sync when connectivity is restored.

### Summary Requirements
- Data management: primary day-to-day inventory processing happens client-side in the browser; master data and audit logs are cloud-backed via Supabase.
- Easy-to-use UI/UX: approachable for non-technical warehouse staff, pickers, and managers.
- Logging: all inventory movements, user actions, scan events, and alert triggers are traceable.
- Organisation management: teams, roles, and permissions are manageable in-app.
- Payment systems: simple subscription and upgrade flow for organisations as they scale locations and users.
