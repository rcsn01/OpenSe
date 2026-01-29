import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { formatCurrency, formatDateTime } from '../utils'
import type { Product } from '../types'

// --- Types ---

type Supplier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

type PurchaseOrder = {
  id: string
  po_number: number
  supplier_id: string | null
  status: 'draft' | 'sent' | 'partial' | 'closed' | 'cancelled'
  expected_date: string | null
  created_at: string
  suppliers?: { name: string }
  total_amount?: number
}

// --- Tab 1: Replenishment (Existing Logic) ---

const ReplenishmentView = ({ products, isLoading }: { products: Product[], isLoading: boolean }) => {
  const lowStock = useMemo(() => 
    products.filter((p) => p.quantity_on_hand <= p.reorder_point), 
  [products])

  if (isLoading) return <div className="empty-state">Loading inventory...</div>

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Replenishment Recommendations</h3>
        {lowStock.length === 0 ? (
           <EmptyState title="Stock Healthy" description="No items are below their reorder point." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th style={{textAlign: 'right'}}>On Hand</th>
                <th style={{textAlign: 'right'}}>Reorder Point</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map(p => (
                <tr key={p.id}>
                  <td style={{fontWeight: 500}}>{p.name}</td>
                  <td className="muted small">{p.sku}</td>
                  <td style={{textAlign: 'right'}}>{p.quantity_on_hand}</td>
                  <td style={{textAlign: 'right'}}>{p.reorder_point}</td>
                  <td><span className="badge warning">Low Stock</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card stack">
        <h3 className="section-title">Actions</h3>
        <p className="muted small">Generate a PO based on these recommendations.</p>
        <button className="button" disabled={lowStock.length === 0}>
           Create PO from Low Stock
        </button>
        <button className="button secondary" onClick={() => window.print()}>
           Print Pick List
        </button>
      </div>
    </div>
  )
}

// --- Tab 2: Purchase Orders ---

const PurchaseOrdersView = ({ companyId }: { companyId: string }) => {
  const [pos, setPos] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  
  // New PO Form
  const [newPoSupplier, setNewPoSupplier] = useState('')
  const [newPoDate, setNewPoDate] = useState('')

  const loadPOs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    setPos((data as any[]) ?? [])
    setLoading(false)
  }

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').eq('company_id', companyId)
    setSuppliers(data as Supplier[] ?? [])
  }

  useEffect(() => { loadPOs(); loadSuppliers(); }, [companyId])

  const handleCreatePO = async () => {
    if (!newPoSupplier) return
    const { error } = await supabase.from('purchase_orders').insert({
      company_id: companyId,
      supplier_id: newPoSupplier,
      expected_date: newPoDate || null,
      status: 'draft'
    })
    if (!error) {
      setIsCreating(false)
      loadPOs()
    }
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'draft': return <span className="pill">Draft</span>
      case 'sent': return <span className="badge warning">On Order</span>
      case 'partial': return <span className="badge warning">Partial</span>
      case 'closed': return <span className="badge success">Received</span>
      default: return <span className="pill">{status}</span>
    }
  }

  return (
    <div className="stack">
      {isCreating ? (
        <div className="card stack" style={{ maxWidth: 500 }}>
          <h3 className="section-title">New Purchase Order</h3>
          <label className="stack">
            Supplier
            <select className="select" value={newPoSupplier} onChange={e => setNewPoSupplier(e.target.value)}>
              <option value="">Select a supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="stack">
            Expected Date
            <input type="date" className="input" value={newPoDate} onChange={e => setNewPoDate(e.target.value)} />
          </label>
          <div className="row">
            <button className="button" onClick={handleCreatePO}>Create Draft</button>
            <button className="button ghost" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex-between">
           <h3 className="section-title">Active Orders</h3>
           <button className="button" onClick={() => setIsCreating(true)}>+ New Purchase Order</button>
        </div>
      )}

      {loading ? <div className="empty-state">Loading orders...</div> : pos.length === 0 ? (
        <EmptyState title="No Purchase Orders" description="Create a PO to track incoming stock." />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {pos.map(po => (
                <tr key={po.id}>
                  <td style={{fontWeight: 600}}>#{po.po_number}</td>
                  <td>{po.suppliers?.name ?? 'Unknown'}</td>
                  <td>{getStatusBadge(po.status)}</td>
                  <td>{po.expected_date ?? '—'}</td>
                  <td className="muted small">{formatDateTime(po.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Tab 3: Suppliers ---

const SuppliersView = ({ companyId }: { companyId: string }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ name: '', contact_name: '', email: '', phone: '' })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').eq('company_id', companyId).order('name')
    setSuppliers(data as Supplier[] ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  const handleSave = async () => {
    if (!formData.name) return
    await supabase.from('suppliers').insert({
      company_id: companyId,
      ...formData
    })
    setIsEditing(false)
    setFormData({ name: '', contact_name: '', email: '', phone: '' })
    load()
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Vendor Directory</h3>
        {loading ? <div className="empty-state">Loading...</div> : suppliers.length === 0 ? (
          <EmptyState title="No Suppliers" description="Add vendors to track sources and lead times." />
        ) : (
          <div className="list">
             {suppliers.map(s => (
               <div key={s.id} className="card" style={{ boxShadow: 'none', background: '#f8fafc' }}>
                  <div className="flex-between">
                    <div style={{fontWeight: 600}}>{s.name}</div>
                    <button className="button ghost small">Edit</button>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {s.contact_name} &middot; {s.email ?? 'No email'} &middot; {s.phone ?? 'No phone'}
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="card stack" style={{ height: 'fit-content' }}>
        <h3 className="section-title">Add Supplier</h3>
        <input className="input" placeholder="Company Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
        <input className="input" placeholder="Contact Person" value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
        <input className="input" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        <input className="input" placeholder="Phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
        <button className="button" onClick={handleSave}>Save Supplier</button>
      </div>
    </div>
  )
}

// --- Tab 4: Receiving Log ---

const ReceivingLogView = ({ companyId }: { companyId: string }) => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('receiving_logs')
        .select(`
          quantity_received, received_at, 
          products(name, sku), 
          purchase_orders(po_number), 
          profiles(full_name, username)
        `)
        .eq('company_id', companyId)
        .order('received_at', { ascending: false })
        .limit(20)
      
      setLogs(data ?? [])
      setLoading(false)
    }
    loadLogs()
  }, [companyId])

  return (
    <div className="card stack">
      <h3 className="section-title">Recent Receipts</h3>
      {loading ? <div className="empty-state">Loading logs...</div> : logs.length === 0 ? (
        <EmptyState title="No Receipts" description="Items received against POs will appear here." />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>PO #</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Receiver</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td className="small muted">{formatDateTime(log.received_at)}</td>
                <td>{log.purchase_orders ? `#${log.purchase_orders.po_number}` : '—'}</td>
                <td>
                  <div style={{fontWeight: 500}}>{log.products?.name ?? 'Unknown'}</div>
                  <div className="small muted">{log.products?.sku}</div>
                </td>
                <td><span className="badge success">+{log.quantity_received}</span></td>
                <td className="small">{log.profiles?.full_name ?? log.profiles?.username}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// --- Main Page ---

export const Procurement = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load products for the Replenishment tab
  useEffect(() => {
    const load = async () => {
      if (!companyId) return
      setIsLoading(true)
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point')
        .eq('company_id', companyId)
        .order('name')
      
      setProducts(data as Product[] ?? [])
      setIsLoading(false)
    }
    load()
  }, [companyId])

  if (!companyId) return <EmptyState title="No company selected" description="Select a company to manage procurement." />

  return (
    <Tabs 
      tabs={[
        {
          id: 'replenishment',
          label: 'Replenishment',
          content: <ReplenishmentView products={products} isLoading={isLoading} />
        },
        {
          id: 'pos',
          label: 'Purchase Orders',
          content: <PurchaseOrdersView companyId={companyId} />
        },
        {
          id: 'suppliers',
          label: 'Suppliers',
          content: <SuppliersView companyId={companyId} />
        },
        {
          id: 'receiving',
          label: 'Receiving Log',
          content: <ReceivingLogView companyId={companyId} />
        }
      ]}
    />
  )
}