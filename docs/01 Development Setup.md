## Prerequisites to Download/Install

1. Node.js (LTS version)
2. pnpm v9.15.0 (Corepack is supported)
3. Docker (required for local Supabase - must be running)
4. Supabase CLI (installed through this workspace's dev dependencies)

## Step-by-Step Setup

# 1. Install Dependencies

```bash
cd opense-stack
pnpm install
```

# 2. Bootstrap Local Supabase and Environment

For a fresh local development environment, run:

```bash
pnpm setup:local
```

This command:

- starts Supabase from the repository root;
- resets the local database and runs the configured SQL seed files;
- reads the local Supabase anon and service-role keys;
- writes `opense-stack/.env` with the correct local app URLs and Supabase keys.

Use this when a reviewer, team member, or endpoint user needs the stack ready quickly.

# 3. Local Supabase Backend Dev

The package scripts wrap the Supabase CLI. Run them from `opense-stack/`:

```bash
pnpm db:start   # Start DB
pnpm db:stop    # Stop DB
pnpm db:status  # Check local URLs and keys
```

# 3.1 Apply Migrations

```bash
pnpm db:migrate
```

# 3.2 Reset Migrations and Seeds

```bash
pnpm db:reset
```

Seeding is SQL-driven through `supabase/config.toml` and the files in `supabase/seeds/`.

# 3.3 Push to Supabase Server

```bash
npx supabase db push
```

# 4. Start Development

```bash
pnpm dev
```

Or start a specific app:

```bash
pnpm dev:admin      # Admin app
pnpm dev:accounts   # Accounts app
pnpm dev:etl        # ETL app
pnpm dev:stoqr      # StoQR app
pnpm dev:opense     # OpenSe shell app
pnpm dev:ui-design  # UI design app
```

To bootstrap Supabase and start all apps without resetting the database:

```bash
pnpm dev:local
```

# 5. Ports

| App             | Port  | URL                    |
| --------------- | ----- | ---------------------- |
| Admin           | 5990  | http://localhost:5990  |
| Accounts        | 5991  | http://localhost:5991  |
| ETL             | 5992  | http://localhost:5992  |
| StoQR           | 5993  | http://localhost:5993  |
| OpenSe          | 5994  | http://localhost:5994  |
| UI-Design       | 5999  | http://localhost:5999  |
| Supabase API    | 54321 | http://127.0.0.1:54321 |
| Supabase Studio | 54323 | http://127.0.0.1:54323 |
