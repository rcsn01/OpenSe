Project Structure
```
OpenSe/
├── supabase/           # Local Supabase (PostgreSQL + Auth + Storage)
│   ├── config.toml     # Supabase configuration
│   ├── migrations/     # Database migrations (SQL schemas)
│   └── functions/      # Supabase Edge Functions
│
└── opense-stack/       # Monorepo (Turbo + pnpm workspaces)
    ├── apps/           # 5 frontend apps
    │   ├── accounts    # Shared auth (login/signup)
    │   ├── admin       # Admin dashboard
    │   ├── etl         # ETL app
    │   ├── stoqr       # StoQR app
    │   └── ui-design   # UI component library
    │
    └── packages/       # Shared code
        ├── shared      # Auth, utils, API clients
        ├── ui          # Shared UI components
        ├── eslint-config
        └── typescript-config
```
Tech stack:
- Frontend: React + Vite + TypeScript
- Backend: Supabase (PostgreSQL, Auth, Edge Functions)
- Monorepo: Turbo
- Package manager: pnpm
Each app in apps/ is independent but shares auth and UI via packages/. They all connect to the same Supabase instance.