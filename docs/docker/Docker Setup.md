# Docker Setup

This guide covers three workflows for running the OpenSe webapps with Docker.

| App | Package | Dev port | Prod port |
|---|---|---|---|
| Admin | `@repo/admin` | 5990 | 5990 |
| Accounts | `@repo/accounts` | 5991 | 5991 |
| ETL | `@repo/etl` | 5992 | 5992 |
| StoQR | `@repo/stoqr` | 5993 | 5993 |
| UI Design | `@repo/ui-design` | 5999 | 5999 |

> All commands are run from the `opense-stack/` directory.

---

## Prerequisites

- [Docker Engine](https://docs.docker.com/engine/install/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) v2 (ships with Docker Desktop)
- A valid `.env` file in `opense-stack/`

```bash
pnpm setup:local
```

`pnpm setup:local` starts local Supabase, resets/seeds the database, reads the local keys, and writes `opense-stack/.env` for every app.

---

## 1. Development – Run apps in containers (no image build)

This mounts the monorepo source into stock `node:22-alpine` containers and runs Vite dev servers. You get full HMR, file-watching, and instant reloads exactly as you would locally.

```bash
# Start all apps
docker compose -f docker-compose.dev.yml up

# Start only specific apps
docker compose -f docker-compose.dev.yml up admin accounts

# Stop everything
docker compose -f docker-compose.dev.yml down
```

**How it works:**
- The entire `opense-stack/` directory is bind-mounted into each container at `/app`.
- Each container runs `pnpm install` then starts the Vite dev server for its app.
- A named Docker volume (`pnpm-store`) caches the pnpm store across restarts.

**Tips:**
- First startup is slower while dependencies install. Subsequent runs reuse the Docker volume cache.
- Edit files on the host — changes are reflected inside the container instantly.
- If you add new dependencies, restart the containers so `pnpm install` runs again.

---

## 2. Build production Docker images

The multi-stage `Dockerfile` compiles any app into a tiny nginx image (~25 MB).

### Build individual images

```bash
docker build --build-arg APP_NAME=admin    -t opense/admin    .
docker build --build-arg APP_NAME=accounts -t opense/accounts .
docker build --build-arg APP_NAME=etl      -t opense/etl      .
docker build --build-arg APP_NAME=stoqr    -t opense/stoqr    .
docker build --build-arg APP_NAME=ui-design -t opense/ui-design .
```

### Build all at once with Compose

```bash
docker compose -f docker-compose.prod.yml build
```

### Passing Vite environment variables at build time

Vite bakes `VITE_*` variables into the JS bundle at build time. To set them during the Docker build:

```bash
docker build \
  --build-arg APP_NAME=admin \
  --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJ... \
  -t opense/admin .
```

> **Note:** The Dockerfile copies `.env` from the monorepo root during build, so Vite will pick up those values automatically. Explicit `--build-arg` overrides take precedence.

---

## 3. Run production images

```bash
# Start all production containers (detached)
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f admin

# Stop
docker compose -f docker-compose.prod.yml down
```

Each app is served by nginx on port 80 inside its container, mapped to the standard dev port on the host (5990–5999). The nginx config handles SPA client-side routing (`try_files ... /index.html`).

---

## Build stages explained

The `Dockerfile` uses three stages for optimal layer caching:

```
┌──────────────────────┐
│  Stage 1: deps       │  Install pnpm + all workspace dependencies
│  node:22-alpine      │  (cached unless lockfile changes)
├──────────────────────┤
│  Stage 2: builder    │  Copy source, run turbo build for target app
│  (extends deps)      │
├──────────────────────┤
│  Stage 3: runner     │  Copy only dist/ into nginx:1.27-alpine
│  nginx:1.27-alpine   │  Final image ~25 MB
└──────────────────────┘
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `pnpm install` fails with lockfile mismatch | Run `pnpm install` on the host to regenerate `pnpm-lock.yaml`, then rebuild |
| Port already in use | Stop local dev servers or change the host port in the compose file |
| Changes not reflected (dev mode) | Ensure the bind mount path is correct; restart the container |
| Build fails for one app | Run `pnpm turbo run build --filter=apps/<name>` locally to see the full error |
| `VITE_*` vars missing in production build | Pass them as `--build-arg` or ensure `.env` is present at build time |
