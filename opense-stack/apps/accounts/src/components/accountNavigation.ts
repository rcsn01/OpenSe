export interface AccountNavigationItem {
  to: string
  label: string
}

export const accountNavigationItems: AccountNavigationItem[] = [
  { to: '/general', label: 'General' },
  { to: '/settings', label: 'Account Settings' },
  { to: '/organisation', label: 'Organisation' },
  { to: '/billing', label: 'Billing & Limits' },
  { to: '/seats', label: 'Seat Assignments' },
]

export const isAccountNavItemActive = (pathname: string, itemPath: string) => {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}

export const getAccountsLayoutMobileStateClass = (isMobileNavOpen: boolean) => {
  return isMobileNavOpen ? 'accounts-layout-mobile-open' : 'accounts-layout-mobile-closed'
}
