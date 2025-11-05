# Fill-The-Shelf (Simplified Single-Server Deployment)

This repository deploys a complete inventory reporting system using a single Dockerfile and a single docker-compose.yml. The Flask server serves both the backend API and the built React PWA static files.

## Quick start

Build and start everything in the background:

```powershell
docker compose up -d --build
```

Stop and remove containers:

```powershell
docker compose down
```

Once running, open your browser to:

- http://localhost/

The app will serve the React PWA and the API under `/api/*`. Uploaded images are available under `/uploads/<filename>`.

## Services

- app: Flask + Socket.IO backend serving the React build
- db: PostgreSQL 16-alpine

Persistent volumes:

- `uploads-data` mounted to `/app/uploads` for user-uploaded images
- `db-data` mounted to `/var/lib/postgresql/data` for PostgreSQL storage

## Environment Variables (docker-compose)

- DATABASE_URL: e.g. `postgresql+psycopg2://postgres:postgres@db:5432/inventorydb`
- JWT_SECRET_KEY: a strong, random secret for JWTs

## Development notes

- The React app is built in the multi-stage Docker build and copied into `/app/static` in the final image. Flask serves the static files directly, with a catch-all route returning `index.html` for client-side routing.
- WebSocket events use Flask-SocketIO and are handled by Gunicorn with gevent-websocket workers.

---

MIT License

