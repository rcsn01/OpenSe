import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { InventoryTransaction, Product } from '../types'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { formatCurrency, formatDateTime, getPublicImageUrl } from '../utils'

// --- Types ---

type SupplierSummary = {
  supplier_id: string
  supplier_name: string
  last_po_date: string
  last_unit_cost: number
  total_quantity: number
}

type Attachment = {
  name: string
  id: string
  created_at: string
  mimetype: string
  size: number
}

// --- Components ---

const ProductOverview = ({ 
  product, 
  transactions, 
  images, 
  qrValue 
}: { 
  product: Product
  transactions: InventoryTransaction[]
  images: string[]
  qrValue: string
}) => {
  const customFields = product.custom_fields ?? {}

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card stack">
          <div className="flex-between">
            <div>
              <h2 style={{ margin: 0 }}>{product.name}</h2>
              <div className="muted small">SKU {product.sku}</div>
            </div>
            <span
              className={`badge ${product.quantity_on_hand <= product.reorder_point ? 'warning' : 'success'}`}
            >
              {product.quantity_on_hand <= product.reorder_point ? 'Low stock' : 'In stock'}
            </span>
          </div>
          <p className="muted">{product.description ?? 'No description provided.'}</p>
          <div className="row wrap">
            <span className="pill">Quantity: {product.quantity_on_hand}</span>
            <span className="pill">Reorder at: {product.reorder_point}</span>
            <span className="pill">Cost: {formatCurrency(product.cost_price)}</span>
            <span className="pill">Selling: {formatCurrency(product.selling_price)}</span>
            {product.category && <span className="pill">Category: {product.category}</span>}
            {product.expiry_date && <span className="pill">Expiry: {product.expiry_date}</span>}
          </div>
          <div>
            <h3 className="section-title">Custom fields</h3>
            {Object.keys(customFields).length === 0 ? (
              <EmptyState title="No custom fields" description="Add values in product settings." />
            ) : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {Object.entries(customFields).map(([key, value]) => (
                  <div key={key} className="card" style={{ boxShadow: 'none' }}>
                    <div className="muted small">{key}</div>
                    <div style={{ fontWeight: 600 }}>{String(value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card stack">
          <h3 className="section-title">Item photos</h3>
          {images.length === 0 ? (
            <EmptyState title="No images" description="Upload images to the product." />
          ) : (
            <div className="image-grid">
              {images.map((url) => (
                <div className="image-card" key={url}>
                  <img src={url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
          <div>
            <h3 className="section-title">Barcode / QR</h3>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                  qrValue,
                )}`}
                alt="QR Code"
                width={140}
                height={140}
                style={{ borderRadius: 12, border: '1px solid var(--border)' }}
              />
              <div className="stack">
                <div style={{ fontWeight: 600 }}>QR payload</div>
                <div className="muted small">{qrValue}</div>
                <button
                  className="button ghost"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(qrValue)}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3 className="section-title">Activity history</h3>
        {transactions.length === 0 ? (
          <EmptyState title="No activity" description="Transactions for this product appear here." />
        ) : (
          <div className="timeline">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="timeline-item">
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{transaction.transaction_type}</div>
                    <div className="small muted">{formatDateTime(transaction.created_at)}</div>
                  </div>
                  <span className="badge success">
                    {transaction.quantity_change > 0 ? '+' : ''}
                    {transaction.quantity_change}
                  </span>
                </div>
                <div className="small muted" style={{ marginTop: 8 }}>
                  {transaction.profiles?.full_name ?? transaction.profiles?.username ?? 'Unknown'}
                  {transaction.stock_after !== null ? ` · Stock after: ${transaction.stock_after}` : ''}
                </div>
                {transaction.notes && <div className="small">{transaction.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const ProductSuppliers = ({ 
  productId, 
  companyId 
}: { 
  productId: string
  companyId: string 
}) => {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true)
      // We derive "Linked Suppliers" from Purchase Order History
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          unit_cost, quantity_ordered,
          purchase_orders!inner(created_at, suppliers!inner(id, name))
        `)
        .eq('purchase_orders.company_id', companyId)
        .eq('product_id', productId)
        .order('created_at', { ascending: false, foreignTable: 'purchase_orders' })

      if (error) {
        console.error(error)
        setSuppliers([])
      } else {
        const raw = (data as any[]) ?? []
        const summaryMap: Record<string, SupplierSummary> = {}

        raw.forEach(item => {
          const sId = item.purchase_orders.suppliers.id
          const sName = item.purchase_orders.suppliers.name
          const date = item.purchase_orders.created_at
          
          if (!summaryMap[sId]) {
            summaryMap[sId] = {
              supplier_id: sId,
              supplier_name: sName,
              last_po_date: date,
              last_unit_cost: item.unit_cost,
              total_quantity: 0
            }
          }
          summaryMap[sId].total_quantity += item.quantity_ordered
          
          // Keep most recent date and cost
          if (new Date(date) > new Date(summaryMap[sId].last_po_date)) {
             summaryMap[sId].last_po_date = date
             summaryMap[sId].last_unit_cost = item.unit_cost
          }
        })

        setSuppliers(Object.values(summaryMap))
      }
      setIsLoading(false)
    }

    loadSuppliers()
  }, [productId, companyId])

  if (isLoading) return <div className="empty-state">Loading supplier data...</div>

  return (
    <div className="stack">
      <div className="card">
         <div className="flex-between">
            <h3 className="section-title">Linked Vendors</h3>
            <button className="button secondary small">Link New Vendor</button>
         </div>
         <p className="muted small">Suppliers who have provided this product based on purchase history.</p>

         {suppliers.length === 0 ? (
            <EmptyState title="No suppliers found" description="Create a Purchase Order to link suppliers." />
         ) : (
            <table className="table">
              <thead>
                <tr>
                   <th>Vendor Name</th>
                   <th>Vendor SKU</th>
                   <th style={{textAlign: 'right'}}>Last Cost</th>
                   <th style={{textAlign: 'right'}}>Total Purchased</th>
                   <th>Last Order</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                   <tr key={s.supplier_id}>
                      <td style={{fontWeight: 600}}>{s.supplier_name}</td>
                      <td className="muted small">Same as SKU</td>
                      <td style={{textAlign: 'right'}}>{formatCurrency(s.last_unit_cost)}</td>
                      <td style={{textAlign: 'right'}}>{s.total_quantity}</td>
                      <td className="small muted">{new Date(s.last_po_date).toLocaleDateString()}</td>
                   </tr>
                ))}
              </tbody>
            </table>
         )}
      </div>
    </div>
  )
}

const ProductBatchHistory = ({ 
  productId, 
  companyId 
}: { 
  productId: string
  companyId: string 
}) => {
  const [batches, setBatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBatches = async () => {
      setIsLoading(true)
      // Fetch 'sale' transactions to simulate Batch traceability (outbound)
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          created_at, quantity_change, notes,
          profiles (full_name)
        `)
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .eq('transaction_type', 'sale')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error(error)
      } else {
        setBatches((data as any[]) ?? [])
      }
      setIsLoading(false)
    }
    loadBatches()
  }, [productId, companyId])

  return (
     <div className="stack">
        <div className="card stack">
           <h3 className="section-title">Traceability</h3>
           <p className="muted small">Track which customers received inventory batches.</p>
           {isLoading ? <div className="empty-state">Loading history...</div> : batches.length === 0 ? (
              <EmptyState title="No distribution history" description="Sales transactions will appear here for traceability." />
           ) : (
              <table className="table">
                 <thead>
                    <tr>
                       <th>Date</th>
                       <th>Batch / Serial #</th>
                       <th>Customer</th>
                       <th>Quantity</th>
                    </tr>
                 </thead>
                 <tbody>
                    {batches.map((b, i) => (
                       <tr key={i}>
                          <td className="small muted">{formatDateTime(b.created_at)}</td>
                          <td className="small" style={{fontFamily: 'monospace'}}>
                             {/* Mocking Batch ID if note is empty */}
                             {b.notes && b.notes.length > 5 ? b.notes : `BATCH-${new Date(b.created_at).getTime().toString().slice(-6)}`}
                          </td>
                          <td>
                             {b.profiles?.full_name ?? 'Unknown / Retail Sale'}
                          </td>
                          <td><span className="badge">{Math.abs(b.quantity_change)}</span></td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           )}
        </div>
     </div>
  )
}

const ProductAttachments = ({ 
  productId, 
  companyId 
}: { 
  productId: string
  companyId: string 
}) => {
  const [files, setFiles] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Use a simulated folder path for this product's attachments
  // Note: RLS Policy requires company_id at root of path
  const STORAGE_PATH = `${companyId}/${productId}`

  const loadFiles = async () => {
    setIsLoading(true)
    const { data, error } = await supabase.storage
      .from('product-images')
      .list(STORAGE_PATH)

    if (error) {
       console.error("Error listing files", error)
       setFiles([])
    } else {
       // Filter out likely image files if we want only docs, 
       // but typically attachments can be anything.
       // We'll show everything in this folder.
       const fileList = data.map(f => ({
          name: f.name,
          id: f.id,
          created_at: f.created_at,
          mimetype: f.metadata?.mimetype ?? 'application/octet-stream',
          size: f.metadata?.size ?? 0
       }))
       setFiles(fileList)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadFiles()
  }, [productId, companyId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0]
     if (!file) return

     setUploading(true)
     // Use original name, overwrite if exists
     const { error } = await supabase.storage
       .from('product-images')
       .upload(`${STORAGE_PATH}/${file.name}`, file, {
          upsert: true
       })
     
     setUploading(false)
     if (error) {
        alert("Upload failed: " + error.message)
     } else {
        loadFiles()
     }
  }

  const handleDownload = async (filename: string) => {
     const { data } = supabase.storage
       .from('product-images')
       .getPublicUrl(`${STORAGE_PATH}/${filename}`)
     
     if (data) window.open(data.publicUrl, '_blank')
  }

  return (
     <div className="stack">
        <div className="card stack">
           <div className="flex-between">
              <div>
                 <h3 className="section-title">Files & Compliance</h3>
                 <p className="muted small">SDS, Manuals, Warranty Info, etc.</p>
              </div>
              <label className={`button small ${uploading ? 'secondary' : ''}`}>
                 {uploading ? 'Uploading...' : 'Upload File'}
                 <input type="file" hidden onChange={handleUpload} accept=".pdf,.doc,.docx,.xls,.xlsx" />
              </label>
           </div>

           {isLoading ? <div className="empty-state">Loading files...</div> : files.length === 0 ? (
              <EmptyState title="No attachments" description="Upload PDFs or documents for this product." />
           ) : (
              <div className="list">
                 {files.map(f => (
                    <div key={f.id} className="card" style={{ boxShadow: 'none', background: '#f8fafc', padding: 12 }}>
                       <div className="flex-between">
                          <div className="row">
                             <div style={{ 
                                width: 32, height: 32, background: '#cbd5e1', 
                                borderRadius: 6, display: 'grid', placeItems: 'center',
                                fontSize: 10, fontWeight: 700, color: '#475569'
                             }}>
                                {f.name.split('.').pop()?.toUpperCase().slice(0,3)}
                             </div>
                             <div>
                                <div style={{fontWeight: 500, fontSize: 14}}>{f.name}</div>
                                <div className="small muted">
                                   {(f.size / 1024).toFixed(1)} KB &middot; {new Date(f.created_at).toLocaleDateString()}
                                </div>
                             </div>
                          </div>
                          <button className="button ghost small" onClick={() => handleDownload(f.name)}>
                             View
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
     </div>
  )
}

// --- Main Page Component ---

export const ProductDetail = () => {
  const { id } = useParams()
  const { companyId } = useCompany()
  const [product, setProduct] = useState<Product | null>(null)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!companyId || !id) return
      setIsLoading(true)

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(
          'id, name, sku, description, category, quantity_on_hand, reorder_point, cost_price, selling_price, folder_id, image_urls, custom_fields, expiry_date',
        )
        .eq('company_id', companyId)
        .eq('id', id)
        .single()

      if (productError) {
        console.error(productError)
        setProduct(null)
      } else {
        setProduct(productData as Product)
      }

      const { data: transactionData } = await supabase
        .from('inventory_transactions')
        .select(
          'id, transaction_type, quantity_change, stock_after, created_at, notes, profiles (id, full_name, username) ',
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

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to view details." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading product...</div>
  }

  if (!product) {
    return <EmptyState title="Product not found" description="Check the inventory list again." />
  }

  const qrValue = product.sku || product.id

  return (
    <div className="stack">
      {/* Page Header */}
      <div className="flex-between" style={{marginBottom: 8}}>
         <h1 className="page-title" style={{fontSize: 24, marginBottom: 0}}>Product Details</h1>
      </div>

      <Tabs 
         tabs={[
            {
               id: 'overview',
               label: 'Overview',
               content: (
                  <ProductOverview 
                     product={product} 
                     transactions={transactions} 
                     images={images} 
                     qrValue={qrValue} 
                  />
               )
            },
            {
               id: 'suppliers',
               label: 'Suppliers',
               content: <ProductSuppliers productId={product.id} companyId={companyId} />
            },
            {
               id: 'batch',
               label: 'Batch History',
               content: <ProductBatchHistory productId={product.id} companyId={companyId} />
            },
            {
               id: 'attachments',
               label: 'Attachments',
               content: <ProductAttachments productId={product.id} companyId={companyId} />
            }
         ]}
      />
    </div>
  )
}