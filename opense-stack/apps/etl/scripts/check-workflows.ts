/**
 * Check workflows in Supabase Cloud.
 * Run: cd opense-stack/apps/etl && npx tsx scripts/check-workflows.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (from Supabase Dashboard > Settings > API).
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env from current dir or opense-stack root
const envPaths = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf-8');
    for (const line of env.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
    break;
  }
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Missing env vars. Add to .env:\n' +
      '  VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co\n' +
      '  SUPABASE_SERVICE_ROLE_KEY=eyJ... (from Dashboard > Settings > API)\n'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function main() {
  const { data, error } = await supabase
    .schema('etl')
    .from('workflows')
    .select('id, name, owner_id, org_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`\nWorkflows in etl.workflows: ${data?.length ?? 0}\n`);
  if (!data?.length) {
    console.log('No workflows found.');
    return;
  }

  console.table(
    data.map((w) => ({
      id: w.id?.slice(0, 8) + '...',
      name: w.name,
      owner_id: w.owner_id?.slice(0, 8) + '...',
      org_id: w.org_id ?? 'null (personal)',
      created_at: w.created_at,
    }))
  );
}

main();
