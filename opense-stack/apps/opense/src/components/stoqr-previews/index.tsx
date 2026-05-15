import { Badge } from '@repo/ui'
import {
  Bell,
  Boxes,
  Building2,
  FileText,
  LayoutDashboard,
  Printer,
  ScanLine,
  Search,
  ShoppingCart,
} from 'lucide-react'
import type { ReactNode } from 'react'
import './StoqrPreviews.css'

type MenuItem =
  | 'Dashboard'
  | 'Inventory'
  | 'Scanner'
  | 'Label Studio'
  | 'Reports'
  | 'Procurement'
  | 'Alerts'
  | 'Organisations'

type StoqrPreviewFrameProps = {
  active: MenuItem
  eyebrow: string
  title: string
  children: ReactNode
}

const menuItems: Array<{ label: MenuItem; icon: typeof LayoutDashboard; group: 'main' | 'configuration' }> = [
  { label: 'Dashboard', icon: LayoutDashboard, group: 'main' },
  { label: 'Inventory', icon: Boxes, group: 'main' },
  { label: 'Scanner', icon: ScanLine, group: 'main' },
  { label: 'Label Studio', icon: Printer, group: 'main' },
  { label: 'Reports', icon: FileText, group: 'main' },
  { label: 'Procurement', icon: ShoppingCart, group: 'main' },
  { label: 'Alerts', icon: Bell, group: 'configuration' },
  { label: 'Organisations', icon: Building2, group: 'configuration' },
]

const StoqrPreviewFrame = ({ active, eyebrow, title, children }: StoqrPreviewFrameProps) => (
  <div className="stoqr-preview-frame" data-testid="stoqr-feature-preview" aria-hidden="true">
    <div className="stoqr-preview-shell">
      <aside className="stoqr-preview-nav">
        <div className="stoqr-preview-brand">
          <span className="stoqr-preview-brand-mark" />
          <span>
            <strong>Open StoQR</strong>
            <small>v1.0</small>
          </span>
        </div>
        {(['main', 'configuration'] as const).map((group) => (
          <div key={group} className="stoqr-preview-menu">
            <p className="stoqr-preview-menu-heading">{group}</p>
            {menuItems.filter((item) => item.group === group).map((item) => {
              const Icon = item.icon

              return (
                <span key={item.label} className={item.label === active ? 'is-active' : undefined}>
                  <Icon className="stoqr-preview-nav-icon" />
                  {item.label}
                </span>
              )
            })}
          </div>
        ))}
      </aside>
      <main className="stoqr-preview-main">
        <div className="stoqr-preview-topbar">
          <div className="stoqr-preview-search">
            <Search className="stoqr-preview-search-icon" />
            <span>Search items...</span>
          </div>
          <div className="stoqr-preview-user-dot">I</div>
        </div>
        <div className="stoqr-preview-page-heading">
          <div>
            <p className="stoqr-preview-eyebrow">{eyebrow}</p>
            <h3 className="stoqr-preview-title">{title}</h3>
          </div>
        </div>
        {children}
      </main>
    </div>
  </div>
)

const MiniBars = ({ values }: { values: number[] }) => (
  <div className="stoqr-preview-chart">
    {values.map((value, index) => (
      <span key={`${value}-${index}`} className="stoqr-preview-bar" style={{ height: `${value}%` }} />
    ))}
  </div>
)

const TrendLine = () => (
  <div className="stoqr-preview-line-chart">
    <svg viewBox="0 0 240 90" preserveAspectRatio="none">
      <path d="M0 70 C35 58 40 36 70 44 C98 52 102 23 132 30 C160 37 172 18 204 25 C222 29 228 18 240 13" fill="none" stroke="var(--color-success)" strokeWidth="4" />
      <path d="M0 70 C35 58 40 36 70 44 C98 52 102 23 132 30 C160 37 172 18 204 25 C222 29 228 18 240 13 L240 90 L0 90 Z" fill="color-mix(in srgb, var(--color-success) 18%, transparent)" />
    </svg>
  </div>
)

const Barcode = () => (
  <div className="stoqr-preview-barcode">
    {[42, 72, 48, 90, 56, 76, 38, 86, 66, 50, 82, 44, 74].map((height, index) => (
      <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
    ))}
  </div>
)

export const DashboardPreview = () => (
  <StoqrPreviewFrame active="Dashboard" eyebrow="Inventory command center" title="Dashboard">
    <div className="stoqr-preview-grid is-four">
      {[
        ['Total value', '$482k', '+8.4%'],
        ['Items', '12,840', '324 low'],
        ['Pending POs', '18', '6 inbound'],
        ['Alerts', '27', '9 critical'],
      ].map(([label, value, meta], index) => (
        <section key={label} className="stoqr-preview-card">
          <p className="stoqr-preview-label">{label}</p>
          <p className="stoqr-preview-value">{value}</p>
          <span className={`stoqr-preview-pill ${index === 3 ? 'is-danger' : index === 1 ? 'is-warning' : ''}`}>{meta}</span>
        </section>
      ))}
    </div>
    <div className="stoqr-preview-grid is-two" style={{ marginTop: '0.7rem' }}>
      <section className="stoqr-preview-card">
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Inbound vs outbound</p>
          <span className="stoqr-preview-meta">7 days</span>
        </div>
        <MiniBars values={[42, 64, 55, 78, 49, 88, 72, 61]} />
      </section>
      <section className="stoqr-preview-card">
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Actionable alerts</p>
          <Badge variant="destructive" size="sm">Live</Badge>
        </div>
        <div className="stoqr-preview-list">
          {['Aisle B reagents below reorder point', 'Cold room batch expires in 4 days', 'Supplier delivery delayed'].map((item, index) => (
            <div key={item} className="stoqr-preview-list-item">
              <p className="stoqr-preview-list-title">{item}</p>
              <span className={`stoqr-preview-pill ${index === 0 ? 'is-danger' : 'is-warning'}`}>{index === 0 ? 'Critical' : 'Watch'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const InventoryPreview = () => (
  <StoqrPreviewFrame active="Inventory" eyebrow="Products, bins, and stock" title="Inventory">
    <div className="stoqr-preview-toolbar">
      <span className="stoqr-preview-tab is-active">All Statuses</span>
      <span className="stoqr-preview-tab">Low Stock</span>
      <span className="stoqr-preview-tab">Out of Stock</span>
      <span className="stoqr-preview-tab">+ Filter</span>
      <span className="stoqr-preview-button">+ New Product</span>
    </div>
    <div className="stoqr-preview-split">
      <aside className="stoqr-preview-card stoqr-preview-sidebar-panel">
        {[
          ['All Products', ''],
          ['Uncategorised', ''],
          ['Dispatch & Returns', ''],
          ['Warehouse Network', ''],
          ['PCR Consumables', ''],
        ].map(([folder, count], index) => (
          <div key={folder} className={`stoqr-preview-folder ${index === 0 ? 'is-active' : ''}`}>
            <span>{folder}</span>
            <span>{count}</span>
          </div>
        ))}
      </aside>
      <section className="stoqr-preview-card" style={{ flex: 1 }}>
        <table className="stoqr-preview-table">
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Status</th></tr>
          </thead>
          <tbody>
            {[
              ['0.5mL Eppendorf Safe-Lock Tubes PCR clean, 500 tubes', 'PCR Consumables', '$19.84', '0 / 10'],
              ['1.5mL Eppendorf Safe-Lock Tubes PCR clean, 1,000 tubes', 'PCR Consumables', '$22.30', '72 / 11'],
              ['10 x 2ml Nuclease Free Water.', 'PCR Consumables', '$115.66', '24 / 9'],
              ['3% Bleach, 5L', 'Safety & Sanitation', '$105.83', '0 / 13'],
              ['Dualfilter 0.1-10 uL tips PCR clean and sterile, 960 tips', 'PCR Consumables', '$12.47', '32 / 7'],
            ].map(([name, folder, price, available], index) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{folder}</td>
                <td>{price}</td>
                <td><span className={`stoqr-preview-availability ${index === 0 || index === 3 ? 'is-danger' : ''}`}>{available}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const ScannerPreview = () => (
  <div className="stoqr-scanner-scene" data-testid="stoqr-feature-preview" aria-hidden="true">
    <div className="stoqr-scanner-shelf">
      {[0, 1, 2].map((shelf) => (
        <div key={shelf} className="stoqr-scanner-shelf-row">
          {[0, 1, 2, 3].map((box) => (
            <div key={`${shelf}-${box}`} className={`stoqr-scanner-box stoqr-scanner-box--${(box + shelf) % 3}`}>
              <span className="stoqr-scanner-box-label" />
              <span className="stoqr-scanner-qr">
                {Array.from({ length: 9 }).map((_, index) => (
                  <i key={index} className={index % 2 === 0 ? 'is-dark' : undefined} />
                ))}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
    <div className="stoqr-scanner-phone">
      <div className="stoqr-scanner-phone-speaker" />
      <div className="stoqr-scanner-phone-screen">
        <div className="stoqr-scanner-camera-view">
          <div className="stoqr-scanner-view-shelf">
            <span />
            <span />
            <span />
          </div>
          <div className="stoqr-scanner-target-qr">
            {Array.from({ length: 16 }).map((_, index) => (
              <i key={index} className={[0, 1, 4, 6, 9, 11, 14, 15].includes(index) ? 'is-dark' : undefined} />
            ))}
          </div>
          <div className="stoqr-scanner-focus-frame" />
          <div className="stoqr-scanner-laser" />
        </div>
      </div>
    </div>
  </div>
)

export const LabelStudioPreview = () => (
  <StoqrPreviewFrame active="Label Studio" eyebrow="Template library and print prep" title="Label Studio">
    <div className="stoqr-preview-label-canvas">
      <section className="stoqr-preview-card">
        <p className="stoqr-preview-card-title">Templates</p>
        <div className="stoqr-preview-list" style={{ marginTop: '0.65rem' }}>
          {['Product label', 'Shelf tag', 'Batch label'].map((template, index) => (
            <div key={template} className="stoqr-preview-list-item">
              <p className="stoqr-preview-list-title">{template}</p>
              {index === 0 ? <span className="stoqr-preview-pill is-neutral">Active</span> : null}
            </div>
          ))}
        </div>
      </section>
      <section className="stoqr-preview-label-card">
        <div className="stoqr-preview-label-paper">
          <p className="stoqr-preview-label">Product label · 62mm</p>
          <p className="stoqr-preview-value" style={{ fontSize: '0.96rem' }}>PCR tubes</p>
          <Barcode />
          <p className="stoqr-preview-meta">LAB-188 · Cold room B2 · Qty 84</p>
          <span className="stoqr-preview-pill is-warning">Batch print ready</span>
        </div>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const ReportsPreview = () => (
  <StoqrPreviewFrame active="Reports" eyebrow="Valuation, movement, exports" title="Reports">
    <div className="stoqr-preview-toolbar">
      <span className="stoqr-preview-tab is-active">Valuation</span>
      <span className="stoqr-preview-tab">Movement</span>
      <span className="stoqr-preview-tab">Dead stock</span>
      <span className="stoqr-preview-button">Export CSV</span>
    </div>
    <div className="stoqr-preview-grid is-two">
      <section className="stoqr-preview-card">
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Stock value trend</p>
          <span className="stoqr-preview-pill">+12%</span>
        </div>
        <TrendLine />
      </section>
      <section className="stoqr-preview-card">
        <p className="stoqr-preview-card-title">Scheduled exports</p>
        <div className="stoqr-preview-list" style={{ marginTop: '0.65rem' }}>
          {['Monthly valuation', 'Reorder candidates', 'Supplier movement'].map((report, index) => (
            <div key={report} className="stoqr-preview-list-item">
              <p className="stoqr-preview-list-title">{report}</p>
              <span className={`stoqr-preview-pill ${index === 1 ? 'is-warning' : 'is-neutral'}`}>{index === 0 ? 'Ready' : 'Queued'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const ProcurementPreview = () => (
  <StoqrPreviewFrame active="Procurement" eyebrow="Supplier and PO workflows" title="Procurement">
    <div className="stoqr-preview-grid is-three">
      {[
        ['Open POs', '18', '6 receiving'],
        ['Suppliers', '42', '4 preferred'],
        ['Delayed', '3', 'Needs review'],
      ].map(([label, value, meta], index) => (
        <section key={label} className="stoqr-preview-card is-soft">
          <p className="stoqr-preview-label">{label}</p>
          <p className="stoqr-preview-value">{value}</p>
          <span className={`stoqr-preview-pill ${index === 2 ? 'is-warning' : ''}`}>{meta}</span>
        </section>
      ))}
    </div>
    <section className="stoqr-preview-card" style={{ marginTop: '0.7rem' }}>
      <table className="stoqr-preview-table">
        <thead>
          <tr><th>PO</th><th>Supplier</th><th>Total</th><th>Status</th></tr>
        </thead>
        <tbody>
          {[
            ['PO-1042', 'BioSupply Co', '$8,420', 'Receiving'],
            ['PO-1041', 'LabWare Direct', '$2,980', 'Approved'],
            ['PO-1038', 'ColdChain AU', '$14,120', 'Delayed'],
          ].map(([po, supplier, total, status]) => (
            <tr key={po}>
              <td>{po}</td>
              <td>{supplier}</td>
              <td>{total}</td>
              <td><span className={`stoqr-preview-pill ${status === 'Delayed' ? 'is-warning' : 'is-neutral'}`}>{status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  </StoqrPreviewFrame>
)

export const AlertsPreview = () => (
  <StoqrPreviewFrame active="Alerts" eyebrow="Rules, notifications, delivery" title="Alerts">
    <div className="stoqr-preview-split">
      <section className="stoqr-preview-card" style={{ flex: 1 }}>
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Notification feed</p>
          <span className="stoqr-preview-pill is-danger">9 critical</span>
        </div>
        <div className="stoqr-preview-list">
          {[
            ['Cold room probe offline', 'Critical'],
            ['PPE gloves below reorder', 'High'],
            ['Batch B-24 expires soon', 'Medium'],
            ['PO-1038 delivery delayed', 'Medium'],
          ].map(([title, tone]) => (
            <div key={title} className="stoqr-preview-list-item">
              <p className="stoqr-preview-list-title">{title}</p>
              <span className={`stoqr-preview-pill ${tone === 'Critical' ? 'is-danger' : 'is-warning'}`}>{tone}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="stoqr-preview-card stoqr-preview-sidebar-panel">
        <p className="stoqr-preview-card-title">Rules</p>
        <div className="stoqr-preview-list" style={{ marginTop: '0.65rem' }}>
          {['Low stock', 'Expiry', 'Connector failure'].map((rule) => (
            <span key={rule} className="stoqr-preview-tab is-active">{rule}</span>
          ))}
        </div>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const OrganisationRbacPreview = () => (
  <StoqrPreviewFrame active="Organisations" eyebrow="Teams, roles, auditability" title="Organisation RBAC">
    <div className="stoqr-preview-grid is-two">
      <section className="stoqr-preview-card">
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Members</p>
          <span className="stoqr-preview-button">Invite</span>
        </div>
        <div className="stoqr-preview-list">
          {[
            ['Ava Chen', 'Admin'],
            ['Noah King', 'Manager'],
            ['Mia Patel', 'Scanner'],
          ].map(([name, role]) => (
            <div key={name} className="stoqr-preview-list-item">
              <p className="stoqr-preview-list-title">{name}</p>
              <span className="stoqr-preview-pill is-neutral">{role}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="stoqr-preview-card">
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Permissions</p>
          <span className="stoqr-preview-meta">Role matrix</span>
        </div>
        <div className="stoqr-preview-permission-grid">
          <span>Area</span><span>Admin</span><span>Manager</span><span>Scanner</span>
          <span>Inventory</span><span className="stoqr-preview-check">✓</span><span className="stoqr-preview-check">✓</span><span className="stoqr-preview-check">✓</span>
          <span>Procurement</span><span className="stoqr-preview-check">✓</span><span className="stoqr-preview-check">✓</span><span>—</span>
          <span>Settings</span><span className="stoqr-preview-check">✓</span><span>—</span><span>—</span>
        </div>
      </section>
    </div>
  </StoqrPreviewFrame>
)
