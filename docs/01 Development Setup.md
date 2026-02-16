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
# 3. Start Supabase Local
```bash
pnpm db:start
```
This starts:
- API: http://127.0.0.1:54321
- DB: localhost:54322
- Studio: http://127.0.0.1:54323
- Inbucket (emails): http://127.0.0.1:54324
# 4. Get Local Supabase Credentials
After starting, run:
```bash
supabase status
```
This outputs the anon and service_role keys you'll need.
# 5. Update .env
Edit .env with the values from supabase status:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```
# 5. Run Migrations (if needed)
```bash
pnpm db:migrate
```
# 5. Start Development
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
# 6. Ports
| App             | Port  | URL                    |
| --------------- | ----- | ---------------------- |
| Accounts        | 5990  | http://localhost:5990  |
| ETL             | 5991  | http://localhost:5991  |
| StoQR           | 5992  | http://localhost:5992  |
| Admin           | 5993  | http://localhost:5993  |
| UI-Design       | 5999  | http://localhost:5999  |
| Supabase API    | 54321 | http://127.0.0.1:54321 |
| Supabase Studio | 54323 | http://127.0.0.1:54323 |
