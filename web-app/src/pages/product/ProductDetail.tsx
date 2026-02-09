import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useCompany } from '../../contexts/CompanyContext'
import type { InventoryTransaction, Product } from '../../types'
import { EmptyState } from '../../components/EmptyState'
import { Tabs } from '../../components/Tabs'
import { getPublicImageUrl, formatCurrency } from '../../utils'
import { ProductAttachmentsTab } from '../../components/ProductDetail/ProductAttachmentsTab'
import { ProductBatchHistoryTab } from '../../components/ProductDetail/ProductBatchHistoryTab'
import { ProductOverviewTab } from '../../components/ProductDetail/ProductOverviewTab'
import { ProductSuppliersTab } from '../../components/ProductDetail/ProductSuppliersTab'
import { 
  ArrowLeft, 
  Printer, 
  MoreHorizontal, 
  AlertTriangle, 
  TrendingUp,
  Package,
  Calendar,
  DollarSign,
  Pencil
} from 'lucide-react'
import { Badge } from '../../components/Badge'
import { toast } from 'sonner'

export const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  
  const [product, setProduct] = useState<Product | null>(null)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!companyId || !id) return
      setIsLoading(true)

      // Fetch Product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', id)
        .single()

      if (productError) {
        console.error(productError)
        setProduct(null)
      } else {
        setProduct(productData as Product)
      }

      // Fetch Transactions
      const { data: transactionData } = await supabase
        .from('inventory_transactions')
        .select(
          'id, transaction_type, quantity_change, stock_after, created_at, notes, profiles (id, full_name, username)'
        )
        .eq('company_id', companyId)
        .eq('product_id', id)
        .order('created_at', { ascending: false })

      const normalized = ((transactionData as any[]) ?? []).map((item) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      }))
      setTransactions(normalized as InventoryTransaction[])
      setIsLoading(false)
    }

    load()
  }, [companyId, id])

  const images = useMemo(() => {
    if (!product?.image_urls?.length) return []
    return product.image_urls.map((url) => getPublicImageUrl(url))
  }, [product])

  // Computed Metrics
  const financials = useMemo(() => {
    if (!product) return { margin: 0, totalValue: 0 }
    const cost = product.cost_price ?? 0
    const sell = product.selling_price ?? 0
    const margin = sell > 0 ? ((sell - cost) / sell) * 100 : 0
    const totalValue = (product.quantity_on_hand ?? 0) * cost
    return { margin, totalValue }
  }, [product])

  const stockStatus = useMemo(() => {
    if (!product) return { label: 'Unknown', variant: 'neutral' as const }
    if (product.quantity_on_hand === 0) return { label: 'Out of Stock', variant: 'danger' as const }
    if (product.quantity_on_hand <= product.reorder_point) return { label: 'Low Stock', variant: 'warning' as const }
    return { label: 'In Stock', variant: 'success' as const }
  }, [product])

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to view details." />
  }

  if (isLoading) {
    return (
      <div className="stack">
        <div className="flex-between" style={{ marginBottom: 24 }}>
          <div className="row">
            <div style={{ width: 32, height: 32, background: '#e2e8f0', borderRadius: 8 }} />
            <div className="stack" style={{ gap: 4 }}>
              <div style={{ width: 120, height: 24, background: '#e2e8f0', borderRadius: 4 }} />
              <div style={{ width: 80, height: 16, background: '#f1f5f9', borderRadius: 4 }} />
            </div>
          </div>
        </div>
        <div className="grid grid-3" style={{ height: 100 }}>
           {[1,2,3].map(i => <div key={i} className="card" style={{ background: '#f8fafc' }} />)}
        </div>
      </div>
    )
  }

  if (!product) {
    return <EmptyState title="Product not found" description="Check the inventory list again." />
  }

  const qrValue = product.sku || product.id

  return (
    <div className="stack" style={{ paddingBottom: 64 }}>
      {/* Top Navigation & Header */}
      <div className="stack" style={{ gap: 24 }}>
        <div className="row">
          <button 
            onClick={() => navigate('/inventory')} 
            className="button ghost small icon-button"
            title="Back to Inventory"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="small muted">
            <Link to="/inventory" className="hover:underline">Inventory</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            {product.category ? <>{product.category}<span style={{ margin: '0 8px' }}>/</span></> : null}
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{product.name}</span>
          </div>
        </div>

        <div className="flex-between wrap" style={{ gap: 16 }}>
          <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
            {images.length > 0 ? (
              <img 
                src={images[0]} 
                alt={product.name} 
                style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: 12, background: '#f1f5f9', display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
                <Package size={24} />
              </div>
            )}
            <div>
              <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>{product.name}</h1>
              <div className="row">
                <span className="badge neutral" style={{ fontFamily: 'monospace' }}>{product.sku}</span>
                <Badge label={stockStatus.label} variant={stockStatus.variant} />
              </div>
            </div>
          </div>

          <div className="row">
            <button className="button secondary" onClick={() => toast.info('Edit mode coming soon')}>
              <Pencil size={16} style={{ marginRight: 8 }} /> Edit
            </button>
            <button className="button secondary icon-button" title="Print Label" onClick={() => window.print()}>
              <Printer size={18} />
            </button>
            <button className="button ghost icon-button" title="More Options">
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {/* Stock Card */}
        <div className="card stat" style={{ borderLeft: stockStatus.variant === 'warning' ? '4px solid var(--warning)' : undefined }}>
          <div className="flex-between">
            <h3 style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Stock Level</h3>
            <Package size={16} className="muted" />
          </div>
          <div className="row" style={{ alignItems: 'baseline', marginTop: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>{product.quantity_on_hand}</span>
            <span className="small muted"> / {product.reorder_point} min</span>
          </div>
        </div>

        {/* Financials Card */}
        <div className="card stat">
          <div className="flex-between">
            <h3 style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Unit Financials</h3>
            <DollarSign size={16} className="muted" />
          </div>
          <div className="stack" style={{ gap: 2, marginTop: 8 }}>
            <div className="flex-between small">
              <span className="muted">Cost:</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(product.cost_price)}</span>
            </div>
            <div className="flex-between small">
              <span className="muted">Sell:</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(product.selling_price)}</span>
            </div>
          </div>
        </div>

        {/* Margin Card */}
        <div className="card stat">
          <div className="flex-between">
            <h3 style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Profit Margin</h3>
            <TrendingUp size={16} className="muted" />
          </div>
          <div className="row" style={{ alignItems: 'baseline', marginTop: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: financials.margin > 30 ? 'var(--success)' : undefined }}>
              {financials.margin.toFixed(1)}%
            </span>
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            Est. Profit: {formatCurrency((product.selling_price ?? 0) - (product.cost_price ?? 0))}
          </div>
        </div>

        {/* Asset Value Card */}
        <div className="card stat">
          <div className="flex-between">
            <h3 style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Asset Value</h3>
            <AlertTriangle size={16} className="muted" style={{ opacity: 0 }} /> {/* Spacer */}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {formatCurrency(financials.totalValue)}
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            Total Cost Basis
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <ProductOverviewTab
                product={product}
                transactions={transactions}
                images={images}
                qrValue={qrValue}
              />
            ),
          },
          {
            id: 'suppliers',
            label: 'Suppliers & POs',
            content: <ProductSuppliersTab productId={product.id} companyId={companyId} />,
          },
          {
            id: 'batch',
            label: 'Batch History',
            content: <ProductBatchHistoryTab productId={product.id} companyId={companyId} />,
          },
          {
            id: 'attachments',
            label: 'Files',
            content: <ProductAttachmentsTab productId={product.id} companyId={companyId} />,
          },
        ]}
      />
    </div>
  )
}