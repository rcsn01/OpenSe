# Open-SE

Open-SE is a web-based B2B suite aimed to tackle niche issues that business might have.

## Setup

Run the interactive setup helper from the repository root:

```bash
./setup.sh
```

Options:

- `Full reset`: resets the selected Supabase database, deploys/configures the alert Edge Functions, inserts seed data, and restores the low-stock alert dispatch config used by Mattermost/email/chat notifications.
- `Insert DB seed data`: runs the configured seed files without a full database reset.

For remote Supabase setup, the script uses `SUPABASE_PROJECT_REF` or derives it from `VITE_SUPABASE_URL`/`SUPABASE_URL` when available. It also sets `STOQR_ALERT_DISPATCH_TOKEN` and the legacy `ALERT_EMAIL_DISPATCH_TOKEN` Edge Function secret to the same value so low-stock dispatch survives Edge Function redeploys.

**⚠️ PROPRIETARY SOURCE CODE - VIEW ONLY**

This repository is hosted publicly for **educational and portfolio demonstration purposes only**. This project is **NOT Open Source**.

### ⛔ Licensing & Usage Restrictions
The source code in this repository is **Proprietary** property of Rcsn01.
**Copyright (c) 2026 Rcsn01. All rights reserved.**

* **You MAY**: View, read, and inspect the code for educational or review purposes.
* **You MAY NOT**: Copy, modify, distribute, sublicense, sell, or use this code (in whole or in part) for any commercial or non-commercial purpose.
* **You MAY NOT**: Use this code to train AI models or create derivative works.

For full legal terms, please refer to the [LICENSE](./LICENSE) file in this repository.
