import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import type { Product } from '../types'

const detectBarcode = async (
  detector: any,
  video: HTMLVideoElement,
  onResult: (value: string) => void,
) => {
  const barcodes = await detector.detect(video)
  if (barcodes.length > 0 && barcodes[0].rawValue) {
    onResult(barcodes[0].rawValue)
  }
}

export const Scan = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scanValue, setScanValue] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [lastHandledBy, setLastHandledBy] = useState<string>('—')
  const [isScanning, setIsScanning] = useState(false)
  const [scanSupported, setScanSupported] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [checkInType, setCheckInType] = useState<'purchase' | 'return'>('purchase')
  const [checkOutType, setCheckOutType] = useState<'sale' | 'loss'>('sale')
  const [message, setMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    setScanSupported('BarcodeDetector' in window)
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !scanSupported) return
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    streamRef.current = stream
    videoRef.current.srcObject = stream
    await videoRef.current.play()
    setIsScanning(true)

    const BarcodeDetectorCtor = (window as any).BarcodeDetector
    const detector = new BarcodeDetectorCtor({ formats: ['code_128', 'ean_13', 'qr_code', 'ean_8'] })
    let rafId = 0
    const tick = async () => {
      if (!videoRef.current || !isScanning) return
      try {
        await detectBarcode(detector, videoRef.current, (value) => {
          setScanValue(value)
        })
      } catch (error) {
        console.error(error)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafId)
  }, [scanSupported, isScanning])

  useEffect(() => {
    if (scanSupported && isScanning) {
      startCamera()
    }
    return () => stopCamera()
  }, [scanSupported, isScanning, startCamera, stopCamera])

  const lookupProduct = useCallback(
    async (value: string) => {
      if (!companyId || !value) return
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point, description, image_urls, custom_fields')
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
          .select('created_at, profiles (id, full_name, username)')
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
    if (scanValue.trim()) {
      lookupProduct(scanValue.trim())
    }
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

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to scan items." />
  }

  return (
    <div className="stack">
      <div className="card stack">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Mobile scanner</h3>
            <div className="muted small">Scan a barcode or type an SKU to pull product details.</div>
          </div>
          {scanSupported && (
            <button className="button secondary" onClick={() => setIsScanning((prev) => !prev)} type="button">
              {isScanning ? 'Stop camera' : 'Start camera'}
            </button>
          )}
        </div>
        {scanSupported ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20 }}>
            <video ref={videoRef} style={{ width: '100%', height: 320, objectFit: 'cover' }} />
          </div>
        ) : (
          <div className="empty-state">Camera scanning is not supported in this browser.</div>
        )}
        <label className="stack">
          Barcode / SKU
          <input
            className="input"
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            placeholder="Scan or type SKU"
          />
        </label>
      </div>

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
                  Open product
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
              <div className="small muted">Check-in type</div>
              <select className="select" value={checkInType} onChange={(event) => setCheckInType(event.target.value as any)}>
                <option value="purchase">Purchase</option>
                <option value="return">Return</option>
              </select>
              <button
                className="button"
                type="button"
                disabled={!product}
                onClick={() => submitTransaction(checkInType)}
              >
                Check-in
              </button>
            </div>
            <div className="stack">
              <div className="small muted">Check-out type</div>
              <select className="select" value={checkOutType} onChange={(event) => setCheckOutType(event.target.value as any)}>
                <option value="sale">Sale</option>
                <option value="loss">Loss</option>
              </select>
              <button
                className="button"
                type="button"
                disabled={!product}
                onClick={() => submitTransaction(checkOutType)}
              >
                Check-out
              </button>
            </div>
          </div>
          {message && <div className="muted small">{message}</div>}
        </div>
      </div>
    </div>
  )
}
