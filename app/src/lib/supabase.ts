
import { createClient, Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
	)
}

// Reuse a single client in the browser to avoid multiple GoTrue instances fighting over storage locks.
const globalForSupabase = globalThis as unknown as {
	_supabaseClient?: ReturnType<typeof createClient>
	supabase?: ReturnType<typeof createClient>
}

const safeLocalStorage = {
	getItem: (key: string) => {
		try {
			return localStorage.getItem(key)
		} catch (_err) {
			return null
		}
	},
	setItem: (key: string, value: string) => {
		try {
			localStorage.setItem(key, value)
		} catch (_err) {
			// ignore storage failures (quota, privacy mode)
		}
	},
	removeItem: (key: string) => {
		try {
			localStorage.removeItem(key)
		} catch (_err) {
			// ignore
		}
	},
}

const STORAGE_KEY = 'sb-Pearl-auth-token'
const STORAGE_KEYS = [STORAGE_KEY, 'sb-local-auth-token']

export const readStoredSession = (): Session | null => {
	if (typeof localStorage === 'undefined') return null
	for (const key of STORAGE_KEYS) {
		try {
			const raw = safeLocalStorage.getItem(key)
			if (!raw) continue
			const parsed = JSON.parse(raw)
			if (parsed?.currentSession) return parsed.currentSession as Session
			if (parsed?.session) return parsed.session as Session
			if (parsed?.access_token) return parsed as Session
		} catch (_e) {
			// ignore malformed
		}
	}
	return null
}

export const supabase =
	globalForSupabase._supabaseClient ??
	createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			// Avoid lock contention when multiple tabs are open; the app handles session locally.
			multiTab: false,
			autoRefreshToken: true,
			persistSession: true,
			storage: safeLocalStorage,
			storageKey: STORAGE_KEY,
				detectSessionInUrl: true, // needed for OAuth redirects to capture the session
		},
	})

if (!globalForSupabase._supabaseClient) {
	globalForSupabase._supabaseClient = supabase
}

// Expose for console debugging so you can run `(await supabase.auth.getSession()).data.session`
if (!globalForSupabase.supabase) {
	globalForSupabase.supabase = supabase
}

// Simple helper for console-based session checks during debugging.
if (!(globalForSupabase as any).__debugSupabaseSession) {
	;(globalForSupabase as any).__debugSupabaseSession = async () => {
		console.log('[supabase] getSession start')
		try {
			const res = await supabase.auth.getSession()
			console.log('[supabase] getSession result', res.data.session)
			return res.data.session
		} catch (err) {
			console.error('[supabase] getSession error', err)
			return null
		}
	}
}

// In Vite dev/HMR, dispose the cached client so code changes re-create it with new options.
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		delete globalForSupabase._supabaseClient
		delete globalForSupabase.supabase
	})
}
