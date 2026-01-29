import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Product } from '../types'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'

// --- Tab 1: Item Labels (Existing) ---

const ItemLabelsTab = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProducts = async () => {
    if (!companyId) return
    setIsLoading(true)
    let query = supabase
      .from('products')
      .select('id, name, sku')
      .eq('company_id', companyId)
      .order('name')

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      setProducts([])
    } else {
      setProducts((data as Product[]) ?? [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [companyId, search])

  const selectedProducts = useMemo(() => {
    return products.filter((product) => selectedIds.includes(product.id))
  }, [products, selectedIds])

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Select items</h3>
        <input
          className="input"
          placeholder="Search products"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {isLoading ? (
          <div className="empty-state">Loading products...</div>
        ) : (
          <div className="list" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {products.map((product) => (
              <label key={product.id} className="row" style={{ alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={(event) => {
                    setSelectedIds((prev) =>
                      event.target.checked
                        ? [...prev, product.id]
                        : prev.filter((id) => id !== product.id),
                    )
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div className="small muted">SKU {product.sku}</div>
                </div>
              </label>
            ))}
          </div>
        )}
        <button className="button" type="button" onClick={() => window.print()} disabled={selectedIds.length === 0}>
          Print labels
        </button>
        <div className="muted small">Selected: {selectedIds.length}</div>
      </div>
      <div className="card stack">
        <h3 className="section-title">Label preview</h3>
        {selectedProducts.length === 0 ? (
          <EmptyState title="No labels" description="Select items to generate labels." />
        ) : (
          <div className="label-grid">
            {selectedProducts.map((product) => (
              <div key={product.id} className="label-card">
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div className="small muted">SKU {product.sku}</div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    product.sku,
                  )}`}
                  alt="QR"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Tab 2: Location Labels ---

type LocationLabel = {
  id: string
  code: string
  label: string
}

const LocationLabelsTab = () => {
  const [locations, setLocations] = useState<LocationLabel[]>([])
  const [zone, setZone] = useState('A')
  const [aisle, setAisle] = useState('1')
  const [shelf, setShelf] = useState('1')
  const [bin, setBin] = useState('')

  const handleAdd = () => {
    const codeComponents = [zone, aisle, shelf, bin].filter(Boolean)
    const code = `LOC-${codeComponents.join('-')}`
    const label = `Zone ${zone}, Aisle ${aisle}, Shelf ${shelf}${bin ? `, Bin ${bin}` : ''}`
    
    const newLocation: LocationLabel = {
      id: Math.random().toString(36).substring(7),
      code: code.toUpperCase(),
      label
    }
    
    setLocations(prev => [...prev, newLocation])
  }

  const handleClear = () => setLocations([])

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Generate Locations</h3>
        <p className="muted small">Create barcodes for shelves and bins.</p>
        
        <div className="grid grid-2">
           <label className="stack">
              Zone
              <input className="input" value={zone} onChange={e => setZone(e.target.value)} placeholder="e.g A" />
           </label>
           <label className="stack">
              Aisle
              <input className="input" value={aisle} onChange={e => setAisle(e.target.value)} placeholder="e.g 1" />
           </label>
           <label className="stack">
              Shelf
              <input className="input" value={shelf} onChange={e => setShelf(e.target.value)} placeholder="e.g B" />
           </label>
           <label className="stack">
              Bin (Optional)
              <input className="input" value={bin} onChange={e => setBin(e.target.value)} placeholder="e.g 01" />
           </label>
        </div>

        <button className="button" onClick={handleAdd}>Add to Queue</button>
        <button className="button ghost" onClick={handleClear} disabled={locations.length === 0}>Clear Queue</button>
      </div>

      <div className="card stack">
         <div className="flex-between">
            <h3 className="section-title">Print Queue</h3>
            <div className="muted small">{locations.length} labels</div>
         </div>
         
         {locations.length === 0 ? (
           <EmptyState title="Queue Empty" description="Add locations to generate shelf labels." />
         ) : (
           <div className="label-grid">
              {locations.map(loc => (
                 <div key={loc.id} className="label-card" style={{ borderColor: '#94a3b8', borderStyle: 'solid', borderWidth: 2 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{loc.code}</div>
                    <div className="small muted">{loc.label}</div>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(loc.code)}`}
                      alt="QR"
                    />
                 </div>
              ))}
           </div>
         )}
         
         {locations.length > 0 && (
            <button className="button" onClick={() => window.print()}>Print Batch</button>
         )}
      </div>
    </div>
  )
}

// --- Tab 3: Shipping Labels ---

const ShippingLabelsTab = () => {
  const { companyName } = useCompany()
  const [recipient, setRecipient] = useState('')
  const [address, setAddress] = useState('')
  const [weight, setWeight] = useState('')
  const [generated, setGenerated] = useState<any>(null)
  
  const handleGenerate = () => {
    if (!recipient || !address) return
    // Mock generation
    setGenerated({
      tracking: `1Z999${Math.floor(Math.random() * 1000000)}042`,
      date: new Date().toLocaleDateString(),
      service: 'Ground',
      weight: weight || '1.0'
    })
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
       <div className="card stack">
          <h3 className="section-title">Shipping Details</h3>
          <label className="stack">
             Recipient Name
             <input className="input" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Customer Name" />
          </label>
          <label className="stack">
             Address
             <textarea className="textarea" rows={3} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, Zip" />
          </label>
          <label className="stack">
             Weight (lbs)
             <input className="input" type="number" value={weight} onChange={e => setWeight(e.target.value)} />
          </label>
          <label className="stack">
             Service
             <select className="select">
                <option>UPS Ground</option>
                <option>FedEx 2Day</option>
                <option>USPS Priority</option>
             </select>
          </label>
          <button className="button" onClick={handleGenerate}>Create Label</button>
       </div>

       <div className="card stack">
          <h3 className="section-title">Label Preview (4x6)</h3>
          {!generated ? (
             <EmptyState title="No Label" description="Enter details to generate a shipping label." />
          ) : (
             <div style={{ 
                width: 400, 
                height: 600, 
                border: '1px solid #000', 
                padding: 20, 
                margin: '0 auto', 
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: 'monospace'
             }}>
                <div style={{ borderBottom: '2px solid #000', paddingBottom: 10 }}>
                   <div style={{ fontWeight: 700, fontSize: 24 }}>FTS LOGISTICS</div>
                   <div className="small">FROM: {companyName?.toUpperCase() ?? 'WAREHOUSE'}</div>
                </div>
                
                <div style={{ padding: '20px 0' }}>
                   <div className="small muted">SHIP TO:</div>
                   <div style={{ fontSize: 18, fontWeight: 600 }}>{recipient.toUpperCase()}</div>
                   <div style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>{address.toUpperCase()}</div>
                </div>

                <div className="grid grid-2" style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '10px 0' }}>
                   <div>
                      <div className="small">WEIGHT</div>
                      <div>{generated.weight} LBS</div>
                   </div>
                   <div>
                      <div className="small">DATE</div>
                      <div>{generated.date}</div>
                   </div>
                </div>

                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                   <div style={{ fontSize: 48, fontWeight: 700 }}>{generated.service.toUpperCase()}</div>
                </div>

                <div style={{ textAlign: 'center' }}>
                   {/* Barcode Mock */}
                   <div style={{ height: 60, background: '#000', width: '80%', margin: '0 auto 10px' }}></div>
                   <div className="small">TRACKING #: {generated.tracking}</div>
                </div>
             </div>
          )}
          {generated && (
             <div className="row" style={{ justifyContent: 'center' }}>
                <button className="button secondary" onClick={() => window.print()}>Print 4x6</button>
             </div>
          )}
       </div>
    </div>
  )
}

// --- Main Page ---

export const LabelStudio = () => {
  const { companyId } = useCompany()

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to access label tools." />
  }

  return (
    <div className="stack">
       <Tabs 
          tabs={[
             { id: 'items', label: 'Item Labels', content: <ItemLabelsTab /> },
             { id: 'locations', label: 'Bin / Shelf', content: <LocationLabelsTab /> },
             { id: 'shipping', label: 'Shipping', content: <ShippingLabelsTab /> }
          ]}
       />
    </div>
  )
}