/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AUTH_COOKIE_DOMAIN?: string
  readonly VITE_ACCOUNTS_URL?: string
  readonly VITE_ADMIN_PUBLIC_URL?: string
  readonly VITE_ETL_PUBLIC_URL?: string
  readonly VITE_OPENSE_PUBLIC_URL?: string
  readonly VITE_STOQR_PUBLIC_URL?: string
  readonly VITE_UI_PUBLIC_URL?: string
}
