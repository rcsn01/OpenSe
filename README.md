## Local development

### Prereqs

- Node.js 20+ and npm
- Supabase CLI (`npm i -g supabase` or use the repo devDependency)

### Install dependencies

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm install
```

### Frontend (ETL or StoQR)

Start a single app:

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run dev:etl
```

or

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run dev:stoqr
```

Start all frontends managed by Turborepo:

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run dev
```

### Backend (Supabase)

Start local Supabase (Postgres, Auth, Storage, Functions):

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run db:start
```

Apply migrations:

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run db:migrate
```

Reset local database (drops and recreates):

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run db:reset
```

Stop Supabase:

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
npm run db:stop
```

### Environment variables

Create a local env file at the repo root:

```bash
cd /Users/arcsin/Syncthing/Projects/OpenSe/opense-stack
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
