export interface AccountNavigationItem {
  to: string
  label: string
}

export const accountNavigationItems: AccountNavigationItem[] = [
  { to: '/account/general', label: 'General' },
  { to: '/account/settings', label: 'Account Settings' },
  { to: '/account/organisation', label: 'Organisation' },
  { to: '/account/billing', label: 'Billing & Limits' },
  { to: '/account/seats', label: 'Seat Assignments' },
]

export const isAccountNavItemActive = (pathname: string, itemPath: string) => {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

export const getAccountsLayoutMobileStateClass = (isMobileNavOpen: boolean) => {
  return isMobileNavOpen ? 'accounts-layout-mobile-open' : 'accounts-layout-mobile-closed'
}

export const getAccountsLayoutViewportClass = (isMobileViewport: boolean) => {
  return isMobileViewport ? 'accounts-layout-is-mobile' : 'accounts-layout-is-desktop'
}

export const detectAccountsMobileViewport = (
  mediaQueryMatches: boolean,
  innerWidth?: number,
  screenWidth?: number,
  visualViewportWidth?: number,
) => {
  const values = [innerWidth, screenWidth, visualViewportWidth].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0,
  )

  const narrowWidth = values.some((value) => value <= 767)
  return mediaQueryMatches || narrowWidth
}
