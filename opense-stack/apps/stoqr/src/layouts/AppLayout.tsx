import { useState, useEffect, useMemo, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { buildAccountsSettingsUrl } from '@repo/shared/utils'
import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Tags,
  FileText,
  Truck,
  Bell,
  Settings,
} from 'lucide-react'
import {
  AppLayout as SharedAppLayout,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
} from '@repo/ui'
import { SearchCombobox } from '../components/Search/SearchCombobox'
import { topBarSearchParamKey, type SearchSuggestion } from '../lib/pageSearch'

export interface AppLayoutOutletContext {
  topBarSearchValue: string
  setTopBarSearchValue: (value: string) => void
  setTopBarSearchConfig: (config: TopBarSearchConfig | null) => void
}

type SearchRouteConfig = {
  id: string
  placeholder: string
  match: (pathname: string) => boolean
  defaultSuggestions?: SearchSuggestion[]
}

export type TopBarSearchConfig = {
  suggestions?: SearchSuggestion[]
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
}

const searchRouteConfigs: SearchRouteConfig[] = [
  {
    id: 'inventory',
    placeholder: 'Search items...',
    match: (pathname) => pathname === '/inventory/all',
    defaultSuggestions: [
      { id: 'inventory-all-products', title: 'All Products', subtitle: 'Browse catalog items and stock', value: 'products', badge: 'Inventory' },
      { id: 'inventory-low-stock', title: 'Low Stock', subtitle: 'Find products near reorder point', value: 'low stock', badge: 'Filter' },
      { id: 'inventory-out-of-stock', title: 'Out of Stock', subtitle: 'Find products at zero quantity', value: 'out of stock', badge: 'Filter' },
    ],
  },
  {
    id: 'scanner-scan-actions',
    placeholder: 'Search products...',
    match: (pathname) => pathname === '/scan' || pathname === '/scan/scan-actions',
    defaultSuggestions: [
      { id: 'scanner-scan', title: 'Search by Barcode or SKU', subtitle: 'Look up a product before adjusting stock', value: 'sku', badge: 'Scanner' },
    ],
  },
  {
    id: 'scanner-history',
    placeholder: 'Search history...',
    match: (pathname) => pathname === '/scan/scan-history',
    defaultSuggestions: [
      { id: 'scan-history-camera', title: 'Camera Scans', subtitle: 'Recent barcode scans captured by camera', value: 'camera', badge: 'History' },
      { id: 'scan-history-manual', title: 'Manual Entries', subtitle: 'Recent scans entered manually', value: 'manual', badge: 'History' },
    ],
  },
  {
    id: 'label-studio-templates',
    placeholder: 'Search templates...',
    match: (pathname) => pathname === '/tools/labels' || pathname === '/tools/labels/templates',
    defaultSuggestions: [
      { id: 'labels-templates', title: 'Label Templates', subtitle: 'Open and manage saved label templates', value: 'template', badge: 'Labels' },
    ],
  },
  {
    id: 'label-studio-preview',
    placeholder: 'Search label products...',
    match: (pathname) => pathname === '/tools/labels/preview-batch',
    defaultSuggestions: [
      { id: 'labels-preview', title: 'Preview Batch', subtitle: 'Queue products and preview print output', value: 'preview batch', badge: 'Labels' },
    ],
  },
  {
    id: 'reports',
    placeholder: 'Search reports...',
    match: (pathname) => pathname === '/reports' || pathname.startsWith('/reports/'),
    defaultSuggestions: [
      { id: 'reports-stock-health', title: 'Stock Health & Valuation', subtitle: 'Inventory value, aging, and folder mix', value: 'stock health', badge: 'Report' },
      { id: 'reports-movement', title: 'Movement & Velocity', subtitle: 'Inbound, outbound, and top-moving SKUs', value: 'movement velocity', badge: 'Report' },
      { id: 'reports-procurement', title: 'Procurement & Suppliers', subtitle: 'Supplier and purchasing insights', value: 'procurement suppliers', badge: 'Report' },
      { id: 'reports-audits', title: 'Audits & Shrinkage', subtitle: 'Audit findings and shrink trends', value: 'audits shrinkage', badge: 'Report' },
      { id: 'reports-custom', title: 'Custom & Saved Reports', subtitle: 'Templates and scheduled delivery', value: 'custom saved reports', badge: 'Report' },
    ],
  },
  {
    id: 'activity-logs',
    placeholder: 'Search activity logs...',
    match: (pathname) => pathname === '/settings/organisations/activity',
  },
  {
    id: 'procurement-purchase-orders',
    placeholder: 'Search POs...',
    match: (pathname) => pathname === '/procurement/purchase-orders',
    defaultSuggestions: [
      { id: 'procurement-po-drafts', title: 'Draft Purchase Orders', subtitle: 'POs awaiting supplier confirmation', value: 'draft', badge: 'PO' },
      { id: 'procurement-po-transit', title: 'In Transit', subtitle: 'Open orders currently on the way', value: 'in transit', badge: 'PO' },
      { id: 'procurement-po-returns', title: 'Vendor Returns', subtitle: 'Orders with return workflows', value: 'return', badge: 'PO' },
    ],
  },
  {
    id: 'procurement-suppliers',
    placeholder: 'Search suppliers...',
    match: (pathname) => pathname === '/procurement/suppliers',
    defaultSuggestions: [
      { id: 'procurement-suppliers-name', title: 'Supplier Profiles', subtitle: 'Search vendors, contacts, and catalog SKUs', value: 'supplier', badge: 'Vendor' },
    ],
  },
  {
    id: 'alerts-feed',
    placeholder: 'Search alerts...',
    match: (pathname) => pathname === '/alerts/feed',
    defaultSuggestions: [
      { id: 'alerts-critical', title: 'Critical Alerts', subtitle: 'Immediate operational issues', value: 'critical', badge: 'Alert' },
      { id: 'alerts-stock', title: 'Stock Alerts', subtitle: 'Inventory and replenishment issues', value: 'stock', badge: 'Alert' },
      { id: 'alerts-system', title: 'System Alerts', subtitle: 'Platform and device notifications', value: 'system', badge: 'Alert' },
    ],
  },
]

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
  { href: '/scan', label: 'Scanner', icon: <ScanBarcode className="w-5 h-5" /> },
  { href: '/tools/labels', label: 'Label Studio', icon: <Tags className="w-5 h-5" /> },
  { href: '/reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { href: '/procurement', label: 'Procurement', icon: <Truck className="w-5 h-5" /> },
]

const configNavItems = [
  { href: '/alerts', label: 'Alerts', icon: <Bell className="w-5 h-5" /> },
  { href: '/settings/organisations', label: 'Organisations', icon: <Settings className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, logout } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })
  const accountsUrl =
    (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'https://accounts.rcsn01.com'
  const activeSearchRoute = useMemo(
    () => searchRouteConfigs.find((config) => config.match(location.pathname)) ?? null,
    [location.pathname],
  )
  const urlSearchValue = activeSearchRoute ? searchParams.get(topBarSearchParamKey) ?? '' : ''
  const [topBarSearchConfig, setTopBarSearchConfig] = useState<TopBarSearchConfig | null>(null)
  const [searchDraft, setSearchDraft] = useState(urlSearchValue)

  useEffect(() => {
    setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User')
  }, [user])

  useEffect(() => {
    setTopBarSearchConfig(null)
  }, [location.pathname])

  useEffect(() => {
    setSearchDraft(urlSearchValue)
  }, [urlSearchValue, activeSearchRoute?.id])

  useEffect(() => {
    if (activeSearchRoute !== null) return
    if (!searchParams.has(topBarSearchParamKey)) return

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete(topBarSearchParamKey)
    setSearchParams(nextSearchParams, { replace: true })
  }, [activeSearchRoute, searchParams, setSearchParams])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const applyViewport = () => {
      const isMobile = mediaQuery.matches || window.innerWidth <= 767
      setIsMobileViewport(isMobile)
      if (!isMobile) {
        setIsMobileNavOpen(false)
      }
    }

    applyViewport()

    const onChange = () => applyViewport()
    mediaQuery.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const handleSearchChange = useCallback((value: string) => {
    if (activeSearchRoute === null) {
      return
    }

    setSearchDraft(value)

    const nextSearchParams = new URLSearchParams(searchParams)
    const normalizedValue = value.trim()

    if (normalizedValue.length === 0) {
      nextSearchParams.delete(topBarSearchParamKey)
    } else {
      nextSearchParams.set(topBarSearchParamKey, value)
    }

    setSearchParams(nextSearchParams, { replace: true })
  }, [activeSearchRoute, searchParams, setSearchParams])

  const mergedSearchSuggestions = useMemo(() => {
    const suggestions = [
      ...(activeSearchRoute?.defaultSuggestions ?? []),
      ...(topBarSearchConfig?.suggestions ?? []),
    ]

    const seenIds = new Set<string>()
    return suggestions.filter((suggestion) => {
      if (seenIds.has(suggestion.id)) return false
      seenIds.add(suggestion.id)
      return true
    })
  }, [activeSearchRoute?.defaultSuggestions, topBarSearchConfig?.suggestions])

  const renderNavItem = (item: (typeof mainNavItems)[0]) => {
    const isActive =
      location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    return (
      <SideNavItem
        key={item.href}
        active={isActive}
        renderLink={({ className, children }) => (
          <NavLink to={item.href} className={className}>
            {children}
          </NavLink>
        )}
      >
        {item.icon}
        {item.label}
      </SideNavItem>
    )
  }

  const sidebar = (
    <>
      <SideNavBrandSlot icon="OS" name="Open StoQR" version="v1.0" />
      <SideNav>
        <SideNavGroupList>
          <SideNavGroup category="main">{mainNavItems.map(renderNavItem)}</SideNavGroup>
          <SideNavGroup category="configuration">{configNavItems.map(renderNavItem)}</SideNavGroup>
        </SideNavGroupList>
      </SideNav>
    </>
  )

  return (
    <SharedAppLayout
      sidebar={sidebar}
      profileFallback={userName?.[0] || 'U'}
      onSettingsClick={() => {
        window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
      }}
      onLogout={handleSignOut}
      searchContent={activeSearchRoute ? (
        <div className="min-w-0 flex-1 max-w-xl">
          <SearchCombobox
            value={searchDraft}
            onValueChange={handleSearchChange}
            placeholder={activeSearchRoute.placeholder}
            suggestions={mergedSearchSuggestions}
            onSuggestionSelect={topBarSearchConfig?.onSuggestionSelect}
            emptyMessage={`No ${activeSearchRoute.placeholder.toLowerCase().replace(/^search\s+/, '')} found.`}
          />
        </div>
      ) : undefined}
      mobileSidebar={{
        enabled: isMobileViewport,
        isOpen: isMobileNavOpen,
        onOpen: () => setIsMobileNavOpen(true),
        onClose: () => setIsMobileNavOpen(false),
        toggleAriaLabel: 'Toggle side navigation',
      }}
    >
      <Outlet
        context={{
          topBarSearchValue: searchDraft,
          setTopBarSearchValue: handleSearchChange,
          setTopBarSearchConfig,
        } satisfies AppLayoutOutletContext}
      />
    </SharedAppLayout>
  )
}
