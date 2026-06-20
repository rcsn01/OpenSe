import { appendAppPath, getRuntimeConfigValue } from './runtime-config'
import { FIRST_PARTY_APPS, type FirstPartyAppCode } from './app-registry'

export type SwitchableAppKey = FirstPartyAppCode

export type SwitchableApp = {
  key: SwitchableAppKey
  /** Compact label for the switch-app popover */
  label: string
  /** Full product name for account home and other surfaces */
  title: string
  url: string
  path: string
}

const resolveAppUrl = (urlKeys: string[], defaultUrl: string) => {
  for (const key of urlKeys) {
    const value = getRuntimeConfigValue(key)
    if (value) return value
  }
  return defaultUrl
}

/** Apps available in the unified switcher for the current runtime. */
export const getSwitchableApps = (): SwitchableApp[] =>
  FIRST_PARTY_APPS.map((app) => ({
    key: app.code,
    label: app.compactLabel,
    title: app.title,
    url: resolveAppUrl([...app.envUrlKeys], app.localUrl),
    path: app.defaultRoute,
  }))

export const buildSwitchableAppHref = (app: Pick<SwitchableApp, 'url' | 'path'>) =>
  appendAppPath(app.url, app.path)
