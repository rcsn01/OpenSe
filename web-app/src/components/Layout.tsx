import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Inventory', path: '/inventory' },
  { label: 'Scanner', path: '/scan' },
  { label: 'Label Studio', path: '/tools/labels' },
  { label: 'Team Settings', path: '/settings/team' },
  { label: 'Attributes', path: '/settings/attributes' },
]

const titleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/scan': 'Scanner',
  '/tools/labels': 'Label Studio',
  '/settings/team': 'Team Settings',
  '/settings/attributes': 'Attributes',
}

export const Layout = () => {
  const { companyId, companyName, companies, setCompanyId } = useCompany()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const title = titleMap[location.pathname] ?? 'Inventory'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">FS</div>
          <div>
            <div style={{ fontWeight: 600 }}>Fill The Shelf</div>
            <div className="small" style={{ color: '#94a3b8' }}>
              Phase 1
            </div>
          </div>
        </div>
        <div>
          <h2>Workspace</h2>
          <select
            className="select"
            style={{ marginTop: 8 }}
            value={companyId ?? ''}
            onChange={(event) => setCompanyId(event.target.value)}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <div className="small" style={{ marginTop: 6, color: '#94a3b8' }}>
            Active: {companyName ?? '—'}
          </div>
        </div>
        <div>
          <h2>Navigation</h2>
          <nav className="nav">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'active' : '')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <button className="button ghost" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h1 className="page-title">{title}</h1>
            <div className="muted small">{companyName ?? 'No company selected'}</div>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
