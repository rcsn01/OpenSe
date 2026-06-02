## Prerequisites to Download/Install
1. Node.js (LTS version)
2. pnpm v9.15.0 (install via: npm install -g pnpm@9)
3. Docker (required for Supabase local - must be running)
4. Supabase CLI (npm install -g supabase)
## Step-by-Step Setup
# 1. Install Dependencies
```bash
cd src
pnpm install
```
# 2. Create Runtime Config Files

Frontend apps read browser runtime config from each app's `public/config.js`.
Real `config.js` files are ignored by git; commit only `config.example.js`.

```bash
for app in accounts etl opense stoqr ui-design; do
  cp "apps/$app/public/config.example.js" "apps/$app/public/config.js"
done
```

Edit each `apps/<app>/public/config.js` as needed. For local development, the defaults should usually point at:

- Accounts: `http://localhost:5991`
- ETL: `http://localhost:5992`
- OpenSe: `http://localhost:5994`
- StoQR: `http://localhost:5993`
- UI Design: `http://localhost:5999`

Do not put service-role keys or server-only secrets in `config.js`; it is served to browsers.

# 3. Local Supabase Backend Dev
Location: Open-ETL/ (Root)
THIS SHOULD BE DONE IN SEPERATE TERMINAL
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
Supabase CLI auto-seeding is disabled in `supabase/config.toml`, so resets apply schema migrations without inserting seed data.
# 3.3 Running seeding
```
./setup.sh
```
Choose `Insert DB seed data only` when you intentionally want to load the configured seed files.
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
pnpm dev:etl        # ETL app
pnpm dev:opense     # OpenSe app
pnpm dev:stoqr      # StoQR app
pnpm dev:ui-design  # UI design app
```
# 5. Ports
| App             | Port  | URL                    |
| --------------- | ----- | ---------------------- |
| Accounts        | 5991  | http://localhost:5991  |
| ETL             | 5992  | http://localhost:5992  |
| StoQR           | 5993  | http://localhost:5993  |
| OpenSe          | 5994  | http://localhost:5994  |
| UI-Design       | 5999  | http://localhost:5999  |
| Supabase API    | 54321 | http://127.0.0.1:54321 |
| Supabase Studio | 54323 | http://127.0.0.1:54323 |
