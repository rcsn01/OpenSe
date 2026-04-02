import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useBulkUpdateInventoryProducts } from '../../../hooks/queries/useInventory'
import type { InventoryProduct } from '../types'

type Props = {
  mode: 'price' | 'quantity'
  companyId: string | null
  selectedProducts: InventoryProduct[]
  onClose: () => void
  onComplete: () => void
}

export const BulkAdjustModal = ({ mode, companyId, selectedProducts, onClose, onComplete }: Props) => {
  const bulkUpdateMutation = useBulkUpdateInventoryProducts(companyId)
  const [pricePct, setPricePct] = useState(0)
  const [quantityDelta, setQuantityDelta] = useState(0)

  const isPrice = mode === 'price'
  const count = selectedProducts.length

  const priceHint = useMemo(() => {
    if (pricePct === 0 || count === 0) return null
    const n = selectedProducts.filter((p) => p.selling_price != null).length
    const dir = pricePct > 0 ? 'increase' : 'decrease'
    return `${n} product${n !== 1 ? 's' : ''} will ${dir} by ${Math.abs(pricePct)}%`
  }, [pricePct, selectedProducts, count])

  const qtyHint = useMemo(() => {
    if (quantityDelta === 0 || count === 0) return null
    const dir = quantityDelta > 0 ? 'added to' : 'removed from'
    return `${Math.abs(quantityDelta)} unit${Math.abs(quantityDelta) !== 1 ? 's' : ''} ${dir} ${count} product${count !== 1 ? 's' : ''}`
  }, [quantityDelta, count])

  const handleApply = async () => {
    const productIds = selectedProducts.map((p) => p.id)
    if (productIds.length === 0) return

    try {
      if (isPrice) {
        const updated = await bulkUpdateMutation.mutateAsync({
          productIds,
          priceMultiplier: 1 + pricePct / 100,
        })
        toast.success(`Price updated across ${updated} product${updated !== 1 ? 's' : ''}.`)
      } else {
        const updated = await bulkUpdateMutation.mutateAsync({ productIds, quantityDelta })
        toast.success(`Quantity adjusted for ${updated} product${updated !== 1 ? 's' : ''}.`)
      }
      onComplete()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to update ${mode}.`)
    }
  }

  const hint = isPrice ? priceHint : qtyHint
  const isDisabled = bulkUpdateMutation.isPending || (isPrice ? pricePct === 0 : quantityDelta === 0)

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 className="section-title" style={{ marginBottom: 12 }}>
          {isPrice ? 'Price Adjustment' : 'Quantity Adjustment'}
        </h3>
        <p className="small muted" style={{ marginBottom: 16 }}>
          Apply to {count} selected product{count !== 1 ? 's' : ''}.
        </p>

        <label className="stack" style={{ gap: 6 }}>
          <span className="small" style={{ fontWeight: 'var(--type-weight-medium)' }}>
            {isPrice ? 'Percentage change' : 'Units to add or remove'}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              type="number"
              autoFocus
              value={isPrice ? pricePct : quantityDelta}
              onChange={(e) =>
                isPrice
                  ? setPricePct(Number(e.target.value) || 0)
                  : setQuantityDelta(Number(e.target.value) || 0)
              }
              style={{ borderRadius: 8 }}
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
              }}
            />
            <span className="muted" style={{ fontSize: 'var(--type-size-sm)', flexShrink: 0 }}>
              {isPrice ? '%' : 'units'}
            </span>
          </div>
          <span className="small muted">
            {isPrice
              ? 'Positive values increase, negative values decrease.'
              : 'Positive values add stock, negative values subtract.'}
          </span>
        </label>

        {hint && (
          <div className="bulk-preview" style={{ marginTop: 12 }}>
            <ArrowUpDown size={13} />
            <span>{hint}</span>
          </div>
        )}

        <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="button ghost small" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button small"
            type="button"
            onClick={() => void handleApply()}
            disabled={isDisabled}
          >
            {bulkUpdateMutation.isPending ? 'Applying\u2026' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
