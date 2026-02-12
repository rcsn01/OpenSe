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


Action,npm Command,pnpm Command,Notes
Install All,npm install,pnpm install,Alias: pnpm i
Add Package,npm install <pkg>,pnpm add <pkg>,
Add Dev Pkg,npm install -D <pkg>,pnpm add -D <pkg>,
Remove Pkg,npm uninstall <pkg>,pnpm remove <pkg>,Alias: pnpm rm
Run Script,npm run dev,pnpm dev,run is optional
Update Pkg,npm update,pnpm update,Alias: pnpm up
Global Add,npm install -g <pkg>,pnpm add -g <pkg>,

1. Monorepos (Workspaces)

pnpm has built-in support for managing multiple packages in one repo.

    Run a command in every package:
    Bash

    pnpm -r run build

    (The -r flag stands for recursive).

    Run a command in just one specific package:
    Bash

    pnpm --filter <package_name> run dev

2. Interactive Upgrade

This acts like a menu where you can choose which packages to update:
Bash

pnpm update --interactive --latest

3. Pruning

Clean up your node_modules by removing packages not listed in your package.json:
Bash

pnpm prune

Would you like to know how to configure a pnpm-workspace.yaml file for a monorepo?


