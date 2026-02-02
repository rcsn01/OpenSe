import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
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
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react'

// Define navigation groups for better visual hierarchy
const MAIN_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', path: '/inventory', icon: Package },
  { label: 'Scanner', path: '/scan', icon: ScanBarcode },
  { label: 'Label Studio', path: '/tools/labels', icon: Tags },
  { label: 'Reports', path: '/reports', icon: FileText },
  { label: 'Procurement', path: '/procurement', icon: Truck },
]

const SETTINGS_NAV = [
  { label: 'Alerts', path: '/alerts', icon: Bell },
  { label: 'Team Settings', path: '/settings/team', icon: Settings },
  { label: 'Attributes', path: '/settings/attributes', icon: Database },
]

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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

  return (
      <div className="app-shell">
        {/* Mobile Backdrop */}
        {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />}

        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          {/* 1. Brand Header */}
          <div className="sidebar-header">
            <div className="brand-logo">OS</div> {/* Changed FS to OS */}
            <div className="brand-info">
              <span className="brand-name">Open-StoQR</span> {/* Changed App Name */}
              <span className="brand-version">v1.0</span>
            </div>
            {/* "X" button removed here */}
          </div>

        {/* 2. Navigation Links */}
        <div className="sidebar-content">
          <div className="nav-group">
            <div className="nav-label">PLATFORM</div>
            <nav className="nav">
              {MAIN_NAV.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon size={20} strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="nav-group">
            <div className="nav-label">CONFIGURATION</div>
            <nav className="nav">
              {SETTINGS_NAV.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon size={20} strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* 3. User Profile / Logout Footer */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="user-email" title={userEmail}>{userEmail}</span>
              <span className="user-role">Admin</span>
            </div>
            <button className="logout-btn" onClick={handleSignOut} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="row">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="page-title">{title}</h1>
              <div className="muted small">{companyName ?? 'Loading...'}</div>
            </div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}