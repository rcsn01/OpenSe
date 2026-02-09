interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    dispose: (callback: () => void) => void
  }
  readonly glob: (pattern: string, options?: { eager?: boolean; import?: string; as?: string }) => Record<string, unknown>
}
