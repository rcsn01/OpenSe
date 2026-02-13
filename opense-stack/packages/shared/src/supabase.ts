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
const authCookieDomainOverride = import.meta.env.VITE_AUTH_COOKIE_DOMAIN as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  )
}

function getAuthCookieDomain(hostname: string): string | undefined {
  if (authCookieDomainOverride) return authCookieDomainOverride
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined
  }

  const parts = hostname.split('.')
  if (parts.length < 2) return undefined
  return `.${parts.slice(-2).join('.')}`
}

function readCookie(key: string): string | null {
  if (typeof document === 'undefined') return null
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function writeCookie(key: string, value: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const domain = getAuthCookieDomain(window.location.hostname)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainPart = domain ? `; Domain=${domain}` : ''
  const maxAge = 60 * 60 * 24 * 365
  document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}${domainPart}`
}

function deleteCookie(key: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const domain = getAuthCookieDomain(window.location.hostname)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const domainPart = domain ? `; Domain=${domain}` : ''
  document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax${secure}${domainPart}`
}

const crossSubdomainStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null

    const cookieValue = readCookie(key)
    if (cookieValue !== null) return cookieValue

    return window.localStorage.getItem(key)
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    writeCookie(key, value)
    window.localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    deleteCookie(key)
    window.localStorage.removeItem(key)
  },
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
      storage: crossSubdomainStorage,
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
