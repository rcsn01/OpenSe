# StoQR

**Open Source Inventory Management System**

StoQR is a modern, web-based inventory management platform designed to tackle the high cost of enterprise SaaS solutions. It provides a powerful, self-hostable alternative for businesses to track stock, manage procurement, and streamline operations without the expensive subscription fees.

> **Note:** This project is currently in active development.

## 🚀 Features

StoQR offers a comprehensive suite of tools to manage your physical assets:

* **Dashboard & Analytics:** Real-time overview of inventory value, low stock alerts, and top-moving products.
* **Inventory Management:** Organize products with folders, variants (matrices), bundles, and infinite custom attributes.
* **Label Studio:** Built-in tools to design and print QR codes/Barcodes for items, shelf locations, and shipping labels.
* **Scanner Support:** Integrated camera scanner and support for handheld barcode scanners for quick lookups, pick/pack, and cycle counts.
* **Procurement:** Manage suppliers, create Purchase Orders (POs), and track receiving logs.
* **Reporting:** Detailed audit trails, stock valuation history, turnover rates, and profitability analysis.
* **Team & Security:** Role-based access control (RBAC) to manage staff permissions securely.

## 🛠️ Tech Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
* **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
* **Database:** PostgreSQL 15+

**⚠️ PROPRIETARY SOURCE CODE - VIEW ONLY**

This repository is hosted publicly for **educational and portfolio demonstration purposes only**. This project is **NOT Open Source**.

### ⛔ Licensing & Usage Restrictions
The source code in this repository is **Proprietary** property of Rcsn01.
**Copyright (c) 2026 Rcsn01. All rights reserved.**

* **You MAY**: View, read, and inspect the code for educational or review purposes.
* **You MAY NOT**: Copy, modify, distribute, sublicense, sell, or use this code (in whole or in part) for any commercial or non-commercial purpose.
* **You MAY NOT**: Use this code to train AI models or create derivative works.

For full legal terms, please refer to the [LICENSE](./LICENSE) file in this repository.

---

### Development Setup

## Local Backend Dev
    Location: Open-ETL/ (Root)
    Commands:
        npx supabase start (Start DB)
        npx supabase stop (Stop DB)
        npx supabase status (Check keys)
## Frontend Dev
    Location: Open-ETL/app/ (Inside the app)
    Commands:
        npm run dev (Start React)
        npm run dev -- --host 0.0.0.0 --port 5173 (network access)
        npm install ... (Add libraries)

Apply Migrations:
    npx supabase migration up

Reset Migrations:
    npx supabase db reset --linked
    npx supabase db reset

Running seeding
    npx ts-node scripts/seed.ts

Push to Supabase server
    npx supabase db push

## Docker Compose quick test

1. Copy `app/.env.example` to a root `.env` (or env-specific file that Docker Compose reads) and replace the placeholders with your temporary Supabase project URL and anon key the SPA should use when building.
2. From the repo root run `docker compose up --build -d`; Compose will pass those values into the `docker-compose.yml` build args, install dependencies, run `npm run build`, and serve the generated bundle through nginx on `localhost:8080`.
3. Visit `http://localhost:8080` to verify the SPA renders and uses your Supabase credentials, then stop the quick test with `docker compose down`.
4. When you want to push the same logic into CI/CD or production, point to the same image built by `docker build`/`docker compose build` and supply the real secrets via your platform's secret manager rather than committing them to source.