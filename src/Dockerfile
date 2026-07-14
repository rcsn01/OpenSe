# ─────────────────────────────────────────────────────────────
# Dockerfile  (multi-stage, monorepo-aware)
#
# Builds any public webapp in apps/* into a lightweight nginx image.
#
# Build args:
#   APP_NAME  – folder name under apps/ (e.g. accounts, etl, kb, stoqr)
#
# Runtime env config:
#   pass VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and optional public app URLs.
#
# Usage:
#   docker build --build-arg APP_NAME=accounts -t opense/accounts .
# ─────────────────────────────────────────────────────────────

# ── Stage 1: install deps ────────────────────────────────────
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy lockfile + workspace manifests first (layer cache)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/accounts/package.json    apps/accounts/package.json
COPY apps/etl/package.json         apps/etl/package.json
COPY apps/kb/package.json          apps/kb/package.json
COPY apps/opense/package.json      apps/opense/package.json
COPY apps/stoqr/package.json       apps/stoqr/package.json
COPY apps/ui-design/package.json   apps/ui-design/package.json
COPY packages/shared/package.json  packages/shared/package.json
COPY packages/ui/package.json      packages/ui/package.json
COPY packages/eslint-config/package.json   packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json

RUN pnpm install --frozen-lockfile

# ── Stage 2: build ───────────────────────────────────────────
FROM deps AS builder

ARG APP_NAME

COPY . .

# Build the target app (turbo handles shared package deps)
RUN pnpm turbo run build --filter=@repo/${APP_NAME}

# ── Stage 3: serve with nginx ───────────────────────────────
FROM nginx:1.27-alpine AS runner

ARG APP_NAME

# Copy the SPA build output
COPY --from=builder /app/apps/${APP_NAME}/dist /usr/share/nginx/html

# Generate browser-readable runtime configuration when the container starts.
COPY docker/runtime-config.template.js /opt/opense/runtime-config.template.js
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

# SPA fallback: send all routes to index.html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location = /config.js {\n\
    add_header Cache-Control "no-store";\n\
    try_files /config.js =404;\n\
  }\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
