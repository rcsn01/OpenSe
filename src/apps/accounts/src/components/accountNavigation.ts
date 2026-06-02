export interface AccountNavigationItem {
  to: string
  label: string
}

export const accountNavigationItems: AccountNavigationItem[] = [
  { to: '/account/home', label: 'Home' },
  { to: '/account/profile', label: 'Profile' },
  { to: '/account/security', label: 'Security' },
  { to: '/account/organisation', label: 'Organisation' },
  { to: '/account/billing', label: 'Billing' },
  { to: '/account/seats', label: 'Seat Assignments' },
  { to: '/account/activity', label: 'Activity Log' },
  { to: '/account/preferences', label: 'Preferences' },
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
