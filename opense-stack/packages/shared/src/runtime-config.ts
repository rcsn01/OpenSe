export type RuntimeConfig = Partial<Record<string, string>>

declare global {
  interface Window {
    __OPENSE_CONFIG__?: RuntimeConfig
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
