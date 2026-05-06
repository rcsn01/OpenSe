import { useState, useMemo } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@repo/ui'
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
    <Dialog open onClose={onClose}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isPrice ? 'Price Adjustment' : 'Quantity Adjustment'}</DialogTitle>
          <DialogDescription>
            Apply to {count} selected product{count !== 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--color-foreground)]">
            {isPrice ? 'Percentage change' : 'Units to add or remove'}
          </span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              autoFocus
              value={isPrice ? pricePct : quantityDelta}
              onChange={(e) =>
                isPrice
                  ? setPricePct(Number(e.target.value) || 0)
                  : setQuantityDelta(Number(e.target.value) || 0)
              }
              placeholder="0"
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose()
              }}
            />
            <span className="shrink-0 text-sm text-[var(--color-muted-foreground)]">
              {isPrice ? '%' : 'units'}
            </span>
          </div>
          <span className="text-sm text-[var(--color-muted-foreground)]">
            {isPrice
              ? 'Positive values increase, negative values decrease.'
              : 'Positive values add stock, negative values subtract.'}
          </span>
        </label>

        {hint && (
          <div className="bulk-preview mt-3">
            <ArrowUpDown size={13} />
            <span>{hint}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={() => void handleApply()}
            disabled={isDisabled}
          >
            {bulkUpdateMutation.isPending ? 'Applying\u2026' : 'Apply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
