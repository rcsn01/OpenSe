import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  AppLayout as SharedAppLayout,
  Button,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
  ThemeProvider,
  ToastProvider,
  useToast,
} from '../components/ui'
import {
  Palette,
  Type,
  Ruler,
  MousePointerClick,
  FormInput,
  LayoutGrid,
  Paintbrush,
  AlertCircle,
  Layers,
  Navigation,
  Box,
  SeparatorHorizontal,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const foundationItems = [
  { path: '/colors', label: 'Color Palette', icon: <Palette className="h-4 w-4" /> },
  { path: '/typography', label: 'Typography', icon: <Type className="h-4 w-4" /> },
  { path: '/spacing', label: 'Spacing & Layout', icon: <Ruler className="h-4 w-4" /> },
]

const componentItems = [
  { path: '/buttons', label: 'Buttons', icon: <MousePointerClick className="h-4 w-4" /> },
  { path: '/forms', label: 'Form Controls', icon: <FormInput className="h-4 w-4" /> },
  { path: '/cards', label: 'Cards', icon: <LayoutGrid className="h-4 w-4" /> },
  { path: '/badges', label: 'Badges', icon: <Paintbrush className="h-4 w-4" /> },
  { path: '/alerts', label: 'Alerts & Feedback', icon: <AlertCircle className="h-4 w-4" /> },
  { path: '/data', label: 'Data Display', icon: <Layers className="h-4 w-4" /> },
  { path: '/navigation', label: 'Navigation', icon: <Navigation className="h-4 w-4" /> },
  { path: '/overlays', label: 'Overlays', icon: <Box className="h-4 w-4" /> },
]

const layoutItems = [
  { path: '/dividers', label: 'Dividers', icon: <SeparatorHorizontal className="h-4 w-4" /> },
]

const testPagesItems = [
  { path: '/test', label: 'Test Page', icon: <FlaskConical className="h-4 w-4" /> },
]

function AppLayoutContent() {
  const { toast } = useToast()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })

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

  const handleLogout = () =>
    toast({ title: 'Log out', description: 'Demo: no auth in UI Design Kit', variant: 'default' })

  const sidebar = (
    <>
      <SideNavBrandSlot
        icon={<Palette className="w-5 h-5" />}
        name="UI Design Kit"
        version="v1.0"
        trailing={
          <Button
            variant="ghost"
            size="icon"
            className={isMobileViewport ? '' : 'hidden'}
            aria-label="Close side navigation"
            onClick={() => setIsMobileNavOpen(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        }
      />
      <SideNav>
        <SideNavGroupList>
          <SideNavGroup category="foundation">
            {foundationItems.map((item) => {
              const isActive =
                location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <SideNavItem
                  key={item.path}
                  active={isActive}
                  renderLink={({ className, children }) => (
                    <NavLink to={item.path} className={className}>
                      {children}
                    </NavLink>
                  )}
                >
                  {item.icon}
                  {item.label}
                </SideNavItem>
              )
            })}
          </SideNavGroup>
          <SideNavGroup category="components">
            {componentItems.map((item) => {
              const isActive =
                location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <SideNavItem
                  key={item.path}
                  active={isActive}
                  renderLink={({ className, children }) => (
                    <NavLink to={item.path} className={className}>
                      {children}
                    </NavLink>
                  )}
                >
                  {item.icon}
                  {item.label}
                </SideNavItem>
              )
            })}
          </SideNavGroup>
          <SideNavGroup category="layout">
            {layoutItems.map((item) => {
              const isActive =
                location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <SideNavItem
                  key={item.path}
                  active={isActive}
                  renderLink={({ className, children }) => (
                    <NavLink to={item.path} className={className}>
                      {children}
                    </NavLink>
                  )}
                >
                  {item.icon}
                  {item.label}
                </SideNavItem>
              )
            })}
          </SideNavGroup>
          <SideNavGroup category="test-pages">
            {testPagesItems.map((item) => {
              const isActive =
                location.pathname === item.path || location.pathname.startsWith(item.path + '/')
              return (
                <SideNavItem
                  key={item.path}
                  active={isActive}
                  renderLink={({ className, children }) => (
                    <NavLink to={item.path} className={className}>
                      {children}
                    </NavLink>
                  )}
                >
                  {item.icon}
                  {item.label}
                </SideNavItem>
              )
            })}
          </SideNavGroup>
        </SideNavGroupList>
      </SideNav>
    </>
  )

  return (
    <>
      {isMobileViewport && !isMobileNavOpen ? (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-2 top-16 z-[60]"
          aria-label="Open side navigation"
          onClick={() => setIsMobileNavOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}

      <SharedAppLayout
        className={`ui-design-layout ${isMobileViewport ? 'ui-design-layout-is-mobile' : 'ui-design-layout-is-desktop'} ${isMobileNavOpen ? 'ui-design-layout-mobile-open' : 'ui-design-layout-mobile-closed'}`}
        sidebar={sidebar}
        profileFallback="U"
        onLogout={handleLogout}
        searchPlaceholder="Search items..."
        searchValue={search}
        onSearchChange={setSearch}
      >
        <Outlet />
      </SharedAppLayout>
    </>
  )
}

export function AppLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppLayoutContent />
      </ToastProvider>
    </ThemeProvider>
  )
}
