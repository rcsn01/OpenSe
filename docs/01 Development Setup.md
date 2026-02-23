## Prerequisites to Download/Install
1. Node.js (LTS version)
2. pnpm v9.15.0 (install via: npm install -g pnpm@9.15.0)
3. Docker (required for Supabase local - must be running)
4. Supabase CLI (npm install -g supabase)
## Step-by-Step Setup
# 1. Install Dependencies
```bash
cd opense-stack
pnpm install
```
# 2. Copy Environment Template
```bash
cp .env.example .env
```

# 3. Local Supabase Backend Dev
Location: Open-ETL/ (Root)
Commands:

```Zsh
npx supabase start (Start DB)
npx supabase stop (Stop DB)
npx supabase status (Check keys)
```
# 3.1 Apply Migrations
```
npx supabase migration up
```
# 3.2 Reset Migrations
```
npx supabase db reset --linked
npx supabase db reset
```
# 3.3 Running seeding
```
npx ts-node scripts/seed.ts
```
# 3.4 Push to Supabase server
```
npx supabase db push
```
# 4. Start Development
```bash
pnpm dev
```
Or start a specific app:
```bash
pnpm dev:accounts   # Accounts app
pnpm dev:admin      # Admin app
pnpm dev:etl        # ETL app
pnpm dev:stoqr      # StoQR app
```
# 5. Ports
| App             | Port  | URL                    |
| --------------- | ----- | ---------------------- |
| Accounts        | 5990  | http://localhost:5990  |
| ETL             | 5991  | http://localhost:5991  |
| StoQR           | 5992  | http://localhost:5992  |
| Admin           | 5993  | http://localhost:5993  |
| UI-Design       | 5999  | http://localhost:5999  |
| Supabase API    | 54321 | http://127.0.0.1:54321 |
| Supabase Studio | 54323 | http://127.0.0.1:54323 |
