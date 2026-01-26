
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		'Missing Supabase environment variables. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
	)
}

// Reuse a single client in the browser to avoid multiple GoTrue instances.
const globalForSupabase = globalThis as unknown as {
	_supabaseClient?: ReturnType<typeof createClient>
	supabase?: ReturnType<typeof createClient>
}

export const supabase =
	globalForSupabase._supabaseClient ??
	createClient(supabaseUrl, supabaseAnonKey, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
			flowType: 'pkce',
			multiTab: true,
		},
	})

if (!globalForSupabase._supabaseClient) {
	globalForSupabase._supabaseClient = supabase
}

// Expose for console debugging so you can run `(await supabase.auth.getSession()).data.session`
if (!globalForSupabase.supabase) {
	globalForSupabase.supabase = supabase
}

// In Vite dev/HMR, dispose the cached client so code changes re-create it with new options.
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		delete globalForSupabase._supabaseClient
		delete globalForSupabase.supabase
	})
}
