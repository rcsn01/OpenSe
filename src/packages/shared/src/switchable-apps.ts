import { appendAppPath, getRuntimeConfigValue } from './runtime-config'

export type SwitchableAppKey = 'etl' | 'stoqr'

export type SwitchableApp = {
  key: SwitchableAppKey
  /** Compact label for the switch-app popover */
  label: string
  /** Full product name for account home and other surfaces */
  title: string
  url: string
  path: string
}

type SwitchableAppDefinition = {
  key: SwitchableAppKey
  label: string
  title: string
  urlKeys: string[]
  defaultUrl: string
  path: string
}

const DEFAULT_APP_URLS = {
  etl: 'http://localhost:5992',
  stoqr: 'http://localhost:5993',
} as const

const SWITCHABLE_APP_DEFINITIONS: SwitchableAppDefinition[] = [
  {
    key: 'etl',
    label: 'ETL',
    title: 'Open-ETL',
    urlKeys: ['VITE_ETL_PUBLIC_URL', 'VITE_ETL_URL'],
    defaultUrl: DEFAULT_APP_URLS.etl,
    path: '/dashboard',
  },
  {
    key: 'stoqr',
    label: 'StoQR',
    title: 'Open-StoQR',
    urlKeys: ['VITE_STOQR_PUBLIC_URL', 'VITE_STOQR_URL'],
    defaultUrl: DEFAULT_APP_URLS.stoqr,
    path: '/dashboard',
  },
]

const resolveAppUrl = (urlKeys: string[], defaultUrl: string) => {
  for (const key of urlKeys) {
    const value = getRuntimeConfigValue(key)
    if (value) return value
  }
  return defaultUrl
}

/** Apps available in the unified switcher for the current runtime. */
export const getSwitchableApps = (): SwitchableApp[] =>
  SWITCHABLE_APP_DEFINITIONS.map((app) => ({
    key: app.key,
    label: app.label,
    title: app.title,
    url: resolveAppUrl(app.urlKeys, app.defaultUrl),
    path: app.path,
  }))

export const buildSwitchableAppHref = (app: Pick<SwitchableApp, 'url' | 'path'>) =>
  appendAppPath(app.url, app.path)
