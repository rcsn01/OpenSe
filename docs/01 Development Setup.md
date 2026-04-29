# Development Setup

This guide is written for a fresh machine or a teammate/reviewer who has not run OpenSe before.

## Prerequisites

1. Node.js (LTS version)
2. pnpm v9.15.0 (Corepack is supported)
3. Docker Desktop or Docker Engine

You do not need to install the Supabase CLI globally. The project installs and runs it through `pnpm`.

## Quick Start

Open Docker Desktop first and wait until it says Docker is running.

```bash
cd opense-stack
corepack enable
pnpm setup:local
pnpm dev
```

That is the beginner path. It installs dependencies, starts local Supabase, resets/seeds the database, writes `.env`, and then you can run the apps.

## What `pnpm setup:local` Does

`pnpm setup:local` is the safe first-run command. It:

- checks that Docker is running;
- installs workspace dependencies;
- starts local Supabase from the repository root;
- resets the local database and runs the configured SQL seed files;
- reads the local Supabase anon and service-role keys;
- writes `opense-stack/.env` with the correct local app URLs and Supabase keys.

Use this when a reviewer, team member, or endpoint user needs the stack ready quickly.

To see setup options:

```bash
pnpm setup:local -- --help
```

To start Supabase without deleting your existing local data:

```bash
pnpm setup:local -- --no-reset
```

To bootstrap Supabase and start all apps without resetting the database:

```bash
pnpm dev:local
```

## Local Supabase Commands

The package scripts wrap the Supabase CLI. Run them from `opense-stack/`:

```bash
pnpm db:start   # Start DB
pnpm db:stop    # Stop DB
pnpm db:status  # Check local URLs and keys
```

### Apply Migrations

```bash
pnpm db:migrate
```

### Reset Migrations and Seeds

```bash
pnpm db:reset
```

Seeding is SQL-driven through `supabase/config.toml` and the files in `supabase/seeds/`.

### Push to Supabase Server

```bash
pnpm exec supabase db push
```

## Start Development

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

## Ports

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

## Beginner Troubleshooting

| Problem | Fix |
| --- | --- |
| `Docker is not running` | Open Docker Desktop and wait until it finishes starting. |
| `pnpm is not available` | Run `corepack enable`, then try `pnpm setup:local` again. |
| Supabase keys are missing | Run `pnpm db:status`. If Supabase is not started, run `pnpm setup:local`. |
| Login redirects to the wrong app | Rerun `pnpm setup:local` so `.env` and local auth redirect URLs are regenerated. |
