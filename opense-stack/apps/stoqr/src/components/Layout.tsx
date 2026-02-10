import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { AppSidebar, AppSidebarLinkProvider, Heading, Body, type NavGroup } from '@repo/ui'
import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Tags,
  FileText,
  Truck,
  Bell,
  Settings,
  Database,
} from 'lucide-react'

/** Adapter: renders react-router <NavLink> instead of plain <a> */
const linkRenderer = {
  renderLink: ({ href, className, onClick, children, key }: any) => (
    <NavLink key={key} to={href} className={className} onClick={onClick}>
      {children}
    </NavLink>
  ),
}

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/scan': 'Scanner',
  '/tools/labels': 'Label Studio',
  '/reports': 'Reports',
  '/procurement': 'Procurement',
  '/alerts': 'Alerts',
  '/settings/team': 'Team Settings',
  '/settings/attributes': 'Attributes',
}

export const Layout = () => {
  const { companyName } = useCompany()
  const location = useLocation()
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || 'User')
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const title = titleMap[location.pathname] ?? 'Inventory'

  const navigation: NavGroup[] = [
    {
      title: 'PLATFORM',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: 'Inventory', href: '/inventory', icon: <Package className="w-5 h-5" /> },
        { label: 'Scanner', href: '/scan', icon: <ScanBarcode className="w-5 h-5" /> },
        { label: 'Label Studio', href: '/tools/labels', icon: <Tags className="w-5 h-5" /> },
        { label: 'Reports', href: '/reports', icon: <FileText className="w-5 h-5" /> },
        { label: 'Procurement', href: '/procurement', icon: <Truck className="w-5 h-5" /> },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [
        { label: 'Alerts', href: '/alerts', icon: <Bell className="w-5 h-5" /> },
        { label: 'Team Settings', href: '/settings/team', icon: <Settings className="w-5 h-5" /> },
        { label: 'Attributes', href: '/settings/attributes', icon: <Database className="w-5 h-5" /> },
      ],
    },
  ]

  return (
    <AppSidebarLinkProvider value={linkRenderer}>
      <AppSidebar
        brandName="Open-StoQR"
        brandLogo="OS"
        brandVersion="v1.0"
        navigation={navigation}
        currentPath={location.pathname}
        onNavigate={(href) => navigate(href)}
        userName={userEmail}
        userEmail={userEmail}
        onSignOut={handleSignOut}
      >
        <div className="p-8 pb-16">
          <div className="flex items-center justify-between gap-6 mb-8">
            <div>
              <Heading level="h4" className="!text-[28px] !font-bold tracking-[-0.02em]">{title}</Heading>
              <Body size="body4" muted>{companyName ?? 'Loading...'}</Body>
            </div>
          </div>
          <Outlet />
        </div>
      </AppSidebar>
    </AppSidebarLinkProvider>
  )
}