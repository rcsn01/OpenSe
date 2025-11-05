Postgres for Fill-The-Shelf
===========================

This folder contains a minimal Docker Compose config to run PostgreSQL locally for development.

How to run
----------

1. From the repo root, change into this folder:

    cd postgres

2. Start Postgres:

    docker compose up --build -d

3. Verify it's running:

    docker compose ps
    docker compose logs -f db

4. Connect from your host (psql must be installed) or from another container. Example using the default postgres user:

    psql -h localhost -p 5432 -U postgres -d filltheshelf

Notes
-----

- The container exposes port `5432` on the host. If you already have a local PostgreSQL instance, change the host port in `docker-compose.yml` to avoid conflicts.
- The database user/password and DB name are set to `postgres`/`postgres`/`filltheshelf` for convenience in development. You can change them in `docker-compose.yml`.
- The server will initialize the database only; your application (`npm run dev`) will create tables automatically on startup (see `server/db.js`).

Stopping and cleanup
---------------------

    docker compose down

To remove volumes (data) for a clean reset:

    docker compose down -v
