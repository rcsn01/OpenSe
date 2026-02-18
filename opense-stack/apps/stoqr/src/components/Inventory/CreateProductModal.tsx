import { useState } from 'react'
import { toNumber } from '../../utils'
import { useCreateInventoryQuickProduct } from '../../hooks/queries/useInventory'

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
  const createQuickProductMutation = useCreateInventoryQuickProduct(companyId)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createQuickProductMutation.mutateAsync(formData)
      onSuccess()
      onClose()
      setFormData({ name: '', sku: '', quantity_on_hand: 0, cost_price: 0, selling_price: 0 })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create product')
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
            <button type="submit" className="button" disabled={createQuickProductMutation.isPending}>
              {createQuickProductMutation.isPending ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
