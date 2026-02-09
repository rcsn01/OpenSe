import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { toNumber } from '../../utils'

export const CreateProductModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  companyId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSuccess: () => void; 
  companyId: string 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    quantity_on_hand: 0,
    cost_price: 0,
    selling_price: 0
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('products').insert({
      company_id: companyId,
      ...formData
    })
    setLoading(false)
    if (!error) {
      onSuccess()
      onClose()
      setFormData({ name: '', sku: '', quantity_on_hand: 0, cost_price: 0, selling_price: 0 })
    } else {
      alert(error.message)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 className="section-title">Create Product</h3>
        <form className="stack" onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <label className="stack">
              Name
              <input className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </label>
            <label className="stack">
              SKU
              <input className="input" required value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
            </label>
          </div>
          <div className="grid grid-3">
            <label className="stack">
              Initial Stock
              <input type="number" className="input" value={formData.quantity_on_hand} onChange={e => setFormData({ ...formData, quantity_on_hand: toNumber(e.target.value) })} />
            </label>
            <label className="stack">
              Cost
              <input type="number" className="input" value={formData.cost_price} onChange={e => setFormData({ ...formData, cost_price: toNumber(e.target.value) })} />
            </label>
            <label className="stack">
              Price
              <input type="number" className="input" value={formData.selling_price} onChange={e => setFormData({ ...formData, selling_price: toNumber(e.target.value) })} />
            </label>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="button ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="button" disabled={loading}>{loading ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
