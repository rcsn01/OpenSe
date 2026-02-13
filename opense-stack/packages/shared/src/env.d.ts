interface ImportMetaEnv {
	readonly DEV: boolean
	readonly VITE_SUPABASE_URL: string
	readonly VITE_SUPABASE_ANON_KEY: string
	readonly VITE_AUTH_COOKIE_DOMAIN?: string
	readonly VITE_ACCOUNTS_URL?: string
}

interface ImportMetaHot {
	dispose(cb: () => void): void
}

interface ImportMeta {
	readonly env: ImportMetaEnv
	readonly hot?: ImportMetaHot
}
