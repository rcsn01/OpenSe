import { useState } from 'react'
import { toast } from 'sonner'
import { toNumber } from '../../../utils'
import { useUpdateInventoryProductField } from '../../../hooks/queries/useInventory'
import type { InventoryProduct } from '../types'

export const useInlineProductEdit = (companyId: string | null, onRefresh: () => void) => {
  const updateProductFieldMutation = useUpdateInventoryProductField(companyId)
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'quantity_on_hand' | 'selling_price' } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const startEdit = (product: InventoryProduct, field: 'quantity_on_hand' | 'selling_price') => {
    if (isSaving) return
    setEditingCell({ id: product.id, field })
    setEditingValue(String(product[field] ?? ''))
  }

  const commitEdit = async (
    cellSnapshot: { id: string; field: 'quantity_on_hand' | 'selling_price' } | null = editingCell,
    valueSnapshot: string = editingValue,
  ) => {
    if (!cellSnapshot || isSaving) return
    if (!companyId) {
      toast.error('No company selected')
      return
    }

    const value = toNumber(valueSnapshot)
    setIsSaving(true)

    try {
      await updateProductFieldMutation.mutateAsync({
        productId: cellSnapshot.id,
        field: cellSnapshot.field,
        value,
      })
      toast.success('Inventory updated')
      onRefresh()
    } catch (error) {
      toast.error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    setIsSaving(false)
    setEditingCell((current) =>
      current && current.id === cellSnapshot.id && current.field === cellSnapshot.field ? null : current,
    )
    setEditingValue('')
  }

  const cancelEdit = () => {
    if (isSaving) return
    setEditingCell(null)
    setEditingValue('')
  }

  return {
    editingCell,
    editingValue,
    isSaving,
    setEditingValue,
    startEdit,
    commitEdit,
    cancelEdit,
  }
}
