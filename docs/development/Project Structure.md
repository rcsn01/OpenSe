Project Structure
```
OpenSe/
├── supabase/           # Local Supabase (PostgreSQL + Auth + Storage)
│   ├── config.toml     # Supabase configuration
│   ├── migrations/     # Database migrations (SQL schemas)
│   └── functions/      # Supabase Edge Functions
│
└── opense-stack/       # Monorepo (Turbo + pnpm workspaces)
    ├── apps/           # Public frontend apps
    │   ├── accounts    # Shared auth (login/signup)
    │   ├── etl         # ETL app
    │   ├── opense      # OpenSe shell/landing app
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

UI ownership notes:
- `packages/ui` is the source of shared design tokens and reusable UI primitives.
- App-specific UI composition lives with the owning app in `apps/<app>/src/pages` and `apps/<app>/src/components`.
- For implementation rules on when to use `@repo/ui`, Tailwind, or owner-scoped CSS, see [UI Implementation Guide.md](./UI%20Implementation%20Guide.md).
