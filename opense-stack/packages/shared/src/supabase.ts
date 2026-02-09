/**
 * @repo/shared - Shared Supabase client for the OpenSe monorepo.
 *
 * Both ETL and StoQR apps share a single Supabase project and client instance.
 * Environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Database = any
type SupabaseClientType = SupabaseClient<Database>

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

// Reuse a single client in the browser to avoid multiple GoTrue instances.
const globalForSupabase = globalThis as unknown as {
  _supabaseClient?: SupabaseClientType
  supabase?: SupabaseClientType
}

export const supabase: SupabaseClientType =
  globalForSupabase._supabaseClient ??
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })

if (!globalForSupabase._supabaseClient) {
  globalForSupabase._supabaseClient = supabase
}

// Only expose for console debugging in development
if (import.meta.env.DEV && !globalForSupabase.supabase) {
  globalForSupabase.supabase = supabase
}

// In Vite dev/HMR, dispose the cached client so code changes re-create it with new options.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    delete globalForSupabase._supabaseClient
    delete globalForSupabase.supabase
  })
}

export type { SupabaseClient, Database }
