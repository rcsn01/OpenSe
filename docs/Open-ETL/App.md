## Open-ETL
**Goal:** An open source web-based SaaS that allows organisations to create centralised, customised workflows to import, process, visualise, and export data.

### Privacy-First Product Positioning
- Open-ETL is designed so that source datasets are processed in the user's browser, not sent to the platform for transformation.
- Teams can run practical ETL workflows without providing raw customer, patient, or financial records to a third-party processing backend.
- This client-side execution model reduces data exposure risk and supports stronger data-minimisation practices.
- As a result, Open-ETL is a strong fit for privacy-sensitive sectors such as biomedical, healthcare-adjacent, and fintech workloads.

### Core Product Capabilities
- Visual workflow builder using drag-and-drop nodes (React Flow) for no-code/low-code pipeline authoring.
- Built-in workflow gallery with reusable templates that teams can clone into personal or organisation workspaces.
- Workflow version history with restore support for safer iteration and rollback.
- Workflow import/export as JSON for portability and backup.
- Personal and organisation dashboards for workflow management.

### Data Processing and Transformation
- CSV file input with local parsing, chunking, and preview.
- Local browser dataset persistence using IndexedDB (Dexie), including chunked storage for larger datasets.
- Rich node catalog across input, data prep, table ops, logic, output, and visualisation categories.
- Example transformation support includes filter, sort, deduplicate, find/replace, fill missing values, type casting, joins, pivot/unpivot, group-by, and sampling.
- Built-in output nodes for file preview and CSV download.
- Optional code node for controlled custom JavaScript transforms.

### Team, Governance, and Access
- Multi-organisation support with member invites and team management.
- Role-aware collaboration (owner/admin/editor/member) and configurable organisation roles/permissions.
- Segregation of personal workflows versus shared organisation workflows.
- Read-only protection for template workflows (must clone before editing).

### Logging, Monitoring, and Analytics
- Execution run logging with status, timing, and error details.
- Personal and organisation activity logs for traceability.
- Usage analytics dashboards (success/failure, trends, active users).
- Workflow-level failure notifications via email, Slack, and webhook channels.

### Billing and Subscription Flow
- Organisation tier upgrades integrated with Supabase Edge Functions and checkout flow.
- Plan and subscription updates designed for self-service upgrades.

### Data Management Constraint (Important)
- Primary data processing for imported files happens in-browser, and CSV content is persisted locally in IndexedDB during execution.
- Open-ETL does not require raw file contents to be uploaded to Supabase for transformation.
- Workflow definitions, metadata, and execution logs are stored in Supabase for collaboration, governance, and analytics.
- This means Open-ETL currently follows a hybrid model: browser-local data processing with cloud-backed workflow management.

### UX Principles
- No-code-first interface that is approachable for non-technical users.
- Clear visual graph model to make transformations understandable and modifiable.
- Fast iteration loop with save, version, run, inspect, and export within a single editor.

### Summary Requirements
- Data management: keep processing local in the browser where possible.
- Easy-to-use UI/UX: non-technical users can build and maintain workflows.
- Logging: all workflow executions and key actions are traceable.
- Organisation management: teams, roles, and permissions are manageable in-app.
- Payment systems: simple subscription and upgrade flow for organisations.