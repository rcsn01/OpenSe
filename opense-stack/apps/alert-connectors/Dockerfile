FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/alert-connectors/package.json apps/alert-connectors/package.json

RUN pnpm install --frozen-lockfile --filter @repo/alert-connectors...

FROM deps AS builder

COPY apps/alert-connectors apps/alert-connectors

RUN pnpm --filter @repo/alert-connectors build

FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /app
ENV NODE_ENV=production
ENV CONNECTOR_SESSION_DIR=/app/sessions

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/alert-connectors/node_modules /app/apps/alert-connectors/node_modules
COPY --from=builder /app/apps/alert-connectors/dist /app/dist
COPY apps/alert-connectors/package.json /app/package.json

EXPOSE 6075
CMD ["node", "dist/server.js"]
