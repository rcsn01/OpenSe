import { Badge } from '@repo/ui'
import type { ReactNode } from 'react'
import './StoqrPreviews.css'

type MenuItem =
  | 'Dashboard'
  | 'Inventory'
  | 'Scan'
  | 'Labels'
  | 'Reports'
  | 'Procurement'
  | 'Alerts'
  | 'Organisation'

type StoqrPreviewFrameProps = {
  active: MenuItem
  eyebrow: string
  title: string
  children: ReactNode
}

const menuItems: MenuItem[] = [
  'Dashboard',
  'Inventory',
  'Scan',
  'Labels',
  'Reports',
  'Procurement',
  'Alerts',
  'Organisation',
]

const StoqrPreviewFrame = ({ active, eyebrow, title, children }: StoqrPreviewFrameProps) => (
  <div className="stoqr-preview-frame" data-testid="stoqr-feature-preview" aria-hidden="true">
    <div className="stoqr-preview-shell">
      <aside className="stoqr-preview-nav">
        <div className="stoqr-preview-brand">
          <span className="stoqr-preview-brand-mark" />
          <span>StoQR</span>
        </div>
        <div className="stoqr-preview-menu">
          {menuItems.map((item) => (
            <span key={item} className={item === active ? 'is-active' : undefined}>
              {item}
            </span>
          ))}
        </div>
      </aside>
      <main className="stoqr-preview-main">
        <div className="stoqr-preview-topbar">
          <div>
            <p className="stoqr-preview-eyebrow">{eyebrow}</p>
            <h3 className="stoqr-preview-title">{title}</h3>
          </div>
          <div className="stoqr-preview-search">Search SKU, bin, supplier...</div>
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
      <span className="stoqr-preview-tab is-active">All products</span>
      <span className="stoqr-preview-tab">Low stock</span>
      <span className="stoqr-preview-tab">Out of stock</span>
      <span className="stoqr-preview-button">Add item</span>
    </div>
    <div className="stoqr-preview-split">
      <aside className="stoqr-preview-card stoqr-preview-sidebar-panel">
        {[
          ['All inventory', '1.2k'],
          ['Lab stores', '438'],
          ['Cold room', '96'],
          ['Dispatch', '284'],
        ].map(([folder, count], index) => (
          <div key={folder} className={`stoqr-preview-folder ${index === 1 ? 'is-active' : ''}`}>
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
              ['Nitrile gloves', 'PPE-442', '1,240', 'Healthy'],
              ['PCR tubes', 'LAB-188', '84', 'Low'],
              ['Barcode labels', 'LBL-024', '0', 'Out'],
              ['Freezer racks', 'FRZ-912', '37', 'Healthy'],
            ].map(([name, sku, qty, status]) => (
              <tr key={sku}>
                <td>{name}</td>
                <td>{sku}</td>
                <td>{qty}</td>
                <td><span className={`stoqr-preview-pill ${status === 'Low' ? 'is-warning' : status === 'Out' ? 'is-danger' : ''}`}>{status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const ScannerPreview = () => (
  <StoqrPreviewFrame active="Scan" eyebrow="Floor-ready scan actions" title="Scanner">
    <div className="stoqr-preview-scanner">
      <section className="stoqr-preview-camera">
        <div className="stoqr-preview-scan-corners" />
        <div className="stoqr-preview-scan-line" />
      </section>
      <section className="stoqr-preview-card">
        <div className="stoqr-preview-card-header">
          <p className="stoqr-preview-card-title">Matched item</p>
          <span className="stoqr-preview-pill">Found</span>
        </div>
        <Barcode />
        <p className="stoqr-preview-value" style={{ fontSize: '0.9rem' }}>PCR tubes</p>
        <p className="stoqr-preview-meta">SKU LAB-188 · Cold room B2</p>
        <div className="stoqr-preview-grid is-two" style={{ marginTop: '0.75rem' }}>
          <span className="stoqr-preview-button">Add stock</span>
          <span className="stoqr-preview-tab">Remove</span>
        </div>
      </section>
    </div>
  </StoqrPreviewFrame>
)

export const LabelStudioPreview = () => (
  <StoqrPreviewFrame active="Labels" eyebrow="Template library and print prep" title="Label Studio">
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
  <StoqrPreviewFrame active="Organisation" eyebrow="Teams, roles, auditability" title="Organisation RBAC">
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
