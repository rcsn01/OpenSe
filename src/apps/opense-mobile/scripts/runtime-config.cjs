const MOBILE_STORAGE_KEY = 'opense.mobile.config.v1'

const MOBILE_RUNTIME_DEFAULTS = {
  VITE_OPENSE_RUNTIME_TARGET: 'mobile',
  VITE_ACCOUNTS_URL: 'opense://mobile/accounts',
  VITE_ETL_PUBLIC_URL: 'opense://mobile/etl',
  VITE_STOQR_PUBLIC_URL: 'opense://mobile/stoqr',
  VITE_ACCOUNTS_ROUTER_MODE: 'hash',
  VITE_ETL_ROUTER_MODE: 'hash',
  VITE_STOQR_ROUTER_MODE: 'hash',
}

const buildMobileRuntimeConfig = (storedConfig = {}) => {
  const discovery = storedConfig.discovery ?? storedConfig
  return {
    ...MOBILE_RUNTIME_DEFAULTS,
    VITE_HOSTED_ACCOUNTS_URL: storedConfig.accountsUrl,
    VITE_SUPABASE_URL: discovery.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: discovery.supabasePublishableKey,
    VITE_GOOGLE_AUTH_ENABLED: discovery.googleAuthEnabled ? 'true' : 'false',
  }
}

const serializeMobileRuntimeLoader = () => `(function () {
  var storageKey = ${JSON.stringify(MOBILE_STORAGE_KEY)};
  var defaults = ${JSON.stringify(MOBILE_RUNTIME_DEFAULTS, null, 2)};
  var stored = {};

  try {
    stored = JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {};
  } catch (error) {
    stored = {};
  }

  var discovery = stored.discovery || {};
  window.__OPENSE_CONFIG__ = Object.assign({}, defaults, {
    VITE_HOSTED_ACCOUNTS_URL: stored.accountsUrl,
    VITE_SUPABASE_URL: discovery.supabaseUrl,
    VITE_SUPABASE_ANON_KEY: discovery.supabasePublishableKey,
    VITE_GOOGLE_AUTH_ENABLED: discovery.googleAuthEnabled ? 'true' : 'false'
  });
})();\n`

module.exports = {
  MOBILE_RUNTIME_DEFAULTS,
  MOBILE_STORAGE_KEY,
  buildMobileRuntimeConfig,
  serializeMobileRuntimeLoader,
}
