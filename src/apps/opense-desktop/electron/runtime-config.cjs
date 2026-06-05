const DESKTOP_RUNTIME_DEFAULTS = {
  VITE_OPENSE_RUNTIME_TARGET: 'desktop',
  VITE_ACCOUNTS_URL: 'opense://desktop/accounts',
  VITE_ETL_PUBLIC_URL: 'opense://desktop/etl',
  VITE_STOQR_PUBLIC_URL: 'opense://desktop/stoqr',
  VITE_ACCOUNTS_ROUTER_BASENAME: '/accounts',
  VITE_ETL_ROUTER_BASENAME: '/etl',
  VITE_STOQR_ROUTER_BASENAME: '/stoqr',
}

const buildDesktopRuntimeConfig = (discovery) => {
  if (!discovery) {
    return { ...DESKTOP_RUNTIME_DEFAULTS }
  }

  return {
    ...DESKTOP_RUNTIME_DEFAULTS,
    VITE_SUPABASE_URL: discovery.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: discovery.supabasePublishableKey,
    VITE_GOOGLE_AUTH_ENABLED: discovery.googleAuthEnabled ? 'true' : 'false',
  }
}

const serializeDesktopRuntimeConfig = (discovery) =>
  `window.__OPENSE_CONFIG__ = ${JSON.stringify(buildDesktopRuntimeConfig(discovery), null, 2)};\n`

module.exports = {
  DESKTOP_RUNTIME_DEFAULTS,
  buildDesktopRuntimeConfig,
  serializeDesktopRuntimeConfig,
}
