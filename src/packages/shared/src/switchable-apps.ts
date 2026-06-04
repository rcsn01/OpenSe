import { appendAppPath, getRuntimeConfigValue, isDesktopRuntime } from './runtime-config'

export type SwitchableAppKey = 'ass' | 'etl' | 'stoqr'

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
  desktopOnly?: boolean
}

const DEFAULT_APP_URLS = {
  ass: 'http://localhost:5995',
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
  {
    key: 'ass',
    label: 'Ass',
    title: 'Open-Ass',
    urlKeys: ['VITE_ASS_PUBLIC_URL'],
    defaultUrl: DEFAULT_APP_URLS.ass,
    path: '/',
    desktopOnly: true,
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
  SWITCHABLE_APP_DEFINITIONS.filter((app) => !app.desktopOnly || isDesktopRuntime()).map((app) => ({
    key: app.key,
    label: app.label,
    title: app.title,
    url: resolveAppUrl(app.urlKeys, app.defaultUrl),
    path: app.path,
  }))

export const buildSwitchableAppHref = (app: Pick<SwitchableApp, 'url' | 'path'>) =>
  appendAppPath(app.url, app.path)
