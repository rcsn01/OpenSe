interface ImportMetaEnv {
  readonly DEV: boolean
  readonly VITE_ACCOUNTS_URL?: string
  readonly VITE_ADMIN_PUBLIC_URL?: string
  readonly VITE_ETL_PUBLIC_URL?: string
  readonly VITE_OPENSE_PUBLIC_URL?: string
  readonly VITE_STOQR_PUBLIC_URL?: string
  readonly VITE_UI_PUBLIC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
