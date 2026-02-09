import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { EmptyState } from '../EmptyState'

type Supplier = {
  id: string
  name: string
  contact_name: string | null
  email: string | null
  phone: string | null
}

export const SuppliersTab = ({ companyId }: { companyId: string }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ name: '', contact_name: '', email: '', phone: '' })

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').eq('company_id', companyId).order('name')
    setSuppliers((data as Supplier[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [companyId])

  const handleSave = async () => {
    if (!formData.name) return
    await supabase.from('suppliers').insert({
      company_id: companyId,
      ...formData,
    })
    setFormData({ name: '', contact_name: '', email: '', phone: '' })
    load()
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Vendor Directory</h3>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : suppliers.length === 0 ? (
          <EmptyState title="No Suppliers" description="Add vendors to track sources and lead times." />
        ) : (
          <div className="list">
            {suppliers.map((s) => (
              <div key={s.id} className="card" style={{ boxShadow: 'none', background: '#f8fafc' }}>
                <div className="flex-between">
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
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
        <input className="input" placeholder="Company Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <input className="input" placeholder="Contact Person" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
        <input className="input" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
        <input className="input" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        <button className="button" onClick={handleSave}>Save Supplier</button>
      </div>
    </div>
  )
}
