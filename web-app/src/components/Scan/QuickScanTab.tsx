import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import type { Product } from '../../types'
import { EmptyState } from '../EmptyState'

export const QuickScanTab = ({ scanValue, companyId }: { scanValue: string; companyId: string }) => {
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [lastHandledBy, setLastHandledBy] = useState<string>('—')
  const [quantity, setQuantity] = useState(1)
  const [checkInType, setCheckInType] = useState<'purchase' | 'return'>('purchase')
  const [checkOutType, setCheckOutType] = useState<'sale' | 'loss'>('sale')
  const [message, setMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const lookupProduct = useCallback(
    async (value: string) => {
      if (!companyId || !value) return
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point, description')
        .eq('company_id', companyId)
        .or(`sku.eq.${value},id.eq.${value}`)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error(error)
        setProduct(null)
        return
      }

      setProduct((data as Product) ?? null)

      if (data?.id) {
        const { data: transactionData } = await supabase
          .from('inventory_transactions')
          .select('created_at, profiles (full_name, username)')
          .eq('company_id', companyId)
          .eq('product_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const profile = Array.isArray(transactionData?.[0]?.profiles)
          ? transactionData?.[0]?.profiles?.[0]
          : transactionData?.[0]?.profiles
        setLastHandledBy(profile?.full_name ?? profile?.username ?? 'Unknown')
      }
    },
    [companyId],
  )

  useEffect(() => {
    if (scanValue) lookupProduct(scanValue)
  }, [scanValue, lookupProduct])

  const submitTransaction = async (transactionType: 'purchase' | 'return' | 'sale' | 'loss') => {
    if (!companyId || !product || !userId) return
    setMessage(null)

    const { error } = await supabase.from('inventory_transactions').insert({
      company_id: companyId,
      product_id: product.id,
      performed_by: userId,
      transaction_type: transactionType,
      quantity_change: quantity,
      notes: 'Scanner quick action',
    })

    setMessage(error ? error.message : 'Transaction recorded.')
    if (!error) {
      lookupProduct(product.sku)
    }
  }

  return (
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">Item details</h3>
        {!product ? (
          <EmptyState title="No item selected" description="Scan a barcode to load product info." />
        ) : (
          <>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 600 }}>{product.name}</div>
                <div className="small muted">SKU {product.sku}</div>
              </div>
              <button className="button ghost" onClick={() => navigate(`/inventory/${product.id}`)}>
                Open
              </button>
            </div>
            <div className="row wrap">
              <span className="pill">On hand: {product.quantity_on_hand}</span>
              <span className="pill">Reorder: {product.reorder_point}</span>
            </div>
            <div className="small muted">Last handled by {lastHandledBy}</div>
          </>
        )}
      </div>
      <div className="card stack">
        <h3 className="section-title">Quick actions</h3>
        <label className="stack">
          Quantity
          <input
            className="input"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <div className="grid grid-2">
          <div className="stack">
            <div className="small muted">Check-in</div>
            <div className="row">
              <select className="select" value={checkInType} onChange={(e) => setCheckInType(e.target.value as 'purchase' | 'return')}>
                <option value="purchase">Buy</option>
                <option value="return">Return</option>
              </select>
              <button
                className="button"
                disabled={!product}
                onClick={() => submitTransaction(checkInType)}
              >
                Go
              </button>
            </div>
          </div>
          <div className="stack">
            <div className="small muted">Check-out</div>
            <div className="row">
              <select className="select" value={checkOutType} onChange={(e) => setCheckOutType(e.target.value as 'sale' | 'loss')}>
                <option value="sale">Sale</option>
                <option value="loss">Loss</option>
              </select>
              <button
                className="button"
                disabled={!product}
                onClick={() => submitTransaction(checkOutType)}
              >
                Go
              </button>
            </div>
          </div>
        </div>
        {message && <div className="muted small">{message}</div>}
      </div>
    </div>
  )
}
