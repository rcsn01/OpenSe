import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  AppLayout as SharedAppLayout,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
  SideNavUserProfile,
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

function AppLayoutContent() {
  const { toast } = useToast()
  const location = useLocation()

  const sidebar = (
    <>
      <SideNavBrandSlot
        icon={<Palette className="w-5 h-5" />}
        name="UI Design Kit"
        version="v1.0"
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
        </SideNavGroupList>
      </SideNav>
      <SideNavUserProfile
        userName="User"
        userEmail="user@example.com"
        onLogout={() =>
          toast({ title: 'Log out', description: 'Demo: no auth in UI Design Kit', variant: 'default' })
        }
      />
    </>
  )

  return (
    <SharedAppLayout sidebar={sidebar}>
      <Outlet />
    </SharedAppLayout>
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
