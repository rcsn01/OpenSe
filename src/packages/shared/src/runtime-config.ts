export type RuntimeConfig = Partial<Record<string, string>>

declare global {
  interface Window {
    __OPENSE_CONFIG__?: RuntimeConfig
    openseDesktop?: {
      configure?: (accountsUrl: string) => Promise<unknown>
      openExternal?: (url: string) => Promise<void>
    }
  }
}

const getRuntimeConfig = (): RuntimeConfig => {
  if (typeof window === 'undefined') return {}
  return window.__OPENSE_CONFIG__ ?? {}
}

export const getRuntimeConfigValue = (
  key: string,
  fallback?: string,
): string | undefined => {
  const runtimeValue = getRuntimeConfig()[key]
  if (runtimeValue !== undefined && runtimeValue !== '') {
    return runtimeValue
  }

  return fallback
}

export const isDesktopRuntime = () => {
  if (getRuntimeConfigValue('VITE_OPENSE_RUNTIME_TARGET') === 'desktop') {
    return true
  }

  if (typeof window === 'undefined') return false
  return Boolean(window.openseDesktop?.configure)
}

export const isMobileRuntime = () =>
  getRuntimeConfigValue('VITE_OPENSE_RUNTIME_TARGET') === 'mobile'

export const usesExternalOAuthRuntime = () => isDesktopRuntime() || isMobileRuntime()

export const applyRuntimeDocumentAttributes = () => {
  if (typeof document === 'undefined') return

  const target = getRuntimeConfigValue('VITE_OPENSE_RUNTIME_TARGET')
  if (target === 'desktop' || target === 'mobile') {
    document.documentElement.dataset.openseRuntimeTarget = target
    return
  }

  delete document.documentElement.dataset.openseRuntimeTarget
}

export type RouterMode = 'browser' | 'hash'

export const getRouterMode = (key: string): RouterMode =>
  getRuntimeConfigValue(key) === 'hash' ? 'hash' : 'browser'

export const getRouterBasename = (key: string, fallback = '/') => {
  const value = getRuntimeConfigValue(key, fallback) ?? fallback
  if (!value || value === '/') return '/'
  return value.startsWith('/') ? value.replace(/\/+$/, '') : `/${value.replace(/\/+$/, '')}`
}

export const appendAppPath = (baseUrl: string, path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const pathMatch = normalizedPath.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/)
  const nextPathname = pathMatch?.[1] ?? '/'
  const nextSearch = pathMatch?.[2] ?? ''
  const nextHash = pathMatch?.[3] ?? ''

  try {
    const parsed = new URL(baseUrl)
    const basePath = parsed.pathname.replace(/\/+$/, '')
    const nextPath = nextPathname === '/' ? '' : nextPathname
    parsed.pathname = `${basePath}${nextPath}` || '/'
    parsed.search = nextSearch
    parsed.hash = nextHash
    return parsed.toString()
  } catch {
    return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`
  }
}
