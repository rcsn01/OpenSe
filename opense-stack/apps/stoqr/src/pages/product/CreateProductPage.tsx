import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Plus, 
  Trash2, 
  Package, 
  DollarSign, 
  Image as ImageIcon,
  Layers,
  Wand2,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase, db } from '../../supabaseClient'
import { useCompany } from '../../contexts/CompanyContext'
import { toNumber } from '../../utils'
import type { Folder } from '../../types'

type CustomFieldDefinition = { key: string; type: 'text' | 'number' | 'boolean' | 'date' }

export const CreateProductPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  
  // Data sources
  const [folders, setFolders] = useState<Folder[]>([])
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([])

  // Form State
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  
  // Inventory State
  const [quantity, setQuantity] = useState<string>('0')
  const [reorderPoint, setReorderPoint] = useState<string>('10')
  const [expiryDate, setExpiryDate] = useState('')

  // Pricing State
  const [costPrice, setCostPrice] = useState<string>('')
  const [sellingPrice, setSellingPrice] = useState<string>('')

  // Organization State
  const [folderId, setFolderId] = useState<string>('')
  
  // Dynamic State
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  // New Custom Field State
  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text')

  // Calculated Margin
  const margin = useMemo(() => {
    const cost = parseFloat(costPrice) || 0
    const sell = parseFloat(sellingPrice) || 0
    if (sell === 0) return 0
    return ((sell - cost) / sell) * 100
  }, [costPrice, sellingPrice])

  useEffect(() => {
    if (!companyId) return
    const loadData = async () => {
      // Fetch Folders
      const { data: folderData } = await db
        .from('folders')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')
      
      if (folderData) setFolders(folderData)

      // Fetch Custom Field Definitions
      const { data: companyData } = await db
        .from('companies')
        .select('settings')
        .eq('id', companyId)
        .single()
      
      const settings = companyData?.settings as { custom_fields?: CustomFieldDefinition[] }
      if (settings?.custom_fields) {
        setCustomFieldDefs(settings.custom_fields)
        const initial: Record<string, any> = {}
        settings.custom_fields.forEach(def => {
            if (def.type === 'boolean') initial[def.key] = false
            else initial[def.key] = ''
        })
        setCustomFields(initial)
      }
    }
    loadData()
  }, [companyId])

  const generateSku = () => {
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD'
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    setSku(`${prefix}-${random}`)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      if (images.length + newFiles.length > 4) {
        toast.error('Maximum 4 images allowed')
        return
      }
      setImages(prev => [...prev, ...newFiles])
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setImagePreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddField = () => {
    if (!newFieldKey.trim()) {
        toast.error("Please enter a field name")
        return
    }
    if (customFieldDefs.some(d => d.key === newFieldKey.trim())) {
        toast.error("Field already exists")
        return
    }
    
    const newDef: CustomFieldDefinition = { key: newFieldKey.trim(), type: newFieldType }
    setCustomFieldDefs([...customFieldDefs, newDef])
    setCustomFields(prev => ({
        ...prev,
        [newDef.key]: newDef.type === 'boolean' ? false : ''
    }))
    setNewFieldKey('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setIsLoading(true)

    try {
        const { data: product, error: insertError } = await db
            .from('products')
            .insert({
                company_id: companyId,
                name,
                sku,
                description: description || null,
                category: category || null,
                quantity_on_hand: toNumber(quantity),
                reorder_point: toNumber(reorderPoint),
                cost_price: toNumber(costPrice),
                selling_price: toNumber(sellingPrice),
                folder_id: folderId === '' ? null : folderId,
                expiry_date: expiryDate || null,
                custom_fields: customFields
            })
            .select()
            .single()

        if (insertError) throw insertError
        if (!product) throw new Error('Product creation failed')

        // Upload Images
        const uploadedUrls: string[] = []
        if (images.length > 0) {
            const uploadPromises = images.map(async (file) => {
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const path = `${companyId}/${product.id}/${Date.now()}_${cleanName}`
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(path, file)
                
                if (uploadError) throw uploadError
                return path
            })

            const results = await Promise.allSettled(uploadPromises)
            results.forEach(res => {
                if (res.status === 'fulfilled') uploadedUrls.push(res.value)
            })

            if (uploadedUrls.length > 0) {
                await db
                    .from('products')
                    .update({ image_urls: uploadedUrls })
                    .eq('id', product.id)
            }
        }

        toast.success('Product created successfully')
        navigate(`/inventory/${product.id}`)

    } catch (error: any) {
        toast.error(error.message || 'Failed to create product')
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
    <div className="stack" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>
      {/* Header */}
      <div className="flex-between sticky top-0 bg-slate-50 py-4 z-10" style={{ margin: '-32px -40px 24px', padding: '32px 40px 16px', background: 'var(--bg)' }}>
        <div className="row">
          <button className="button ghost small icon-button" onClick={() => navigate('/inventory')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title" style={{ fontSize: 24, marginBottom: 4 }}>Add New Product</h1>
            <div className="muted small">Fill in the details to track a new inventory item.</div>
          </div>
        </div>
        <div className="row">
          <button type="button" className="button ghost" onClick={() => navigate('/inventory')}>Discard</button>
          <button type="submit" className="button" form="create-product-form" disabled={isLoading}>
            <Save size={16} />
            {isLoading ? 'Creating...' : 'Save Product'}
          </button>
        </div>
      </div>

      <form id="create-product-form" className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }} onSubmit={handleSubmit}>
        
        {/* --- LEFT COLUMN (Main Info) --- */}
        <div className="stack">
          
          {/* General Information */}
          <div className="card stack">
            <h3 className="section-title row"><Package size={18} /> General Information</h3>
            <label className="stack">
              <span className="small font-semibold">Product Name *</span>
              <input 
                className="input" 
                style={{ fontSize: 16, padding: 12 }}
                required 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Wireless Ergonomic Mouse" 
              />
            </label>
            <div className="grid grid-2">
              <label className="stack">
                <span className="small font-semibold">SKU (Stock Keeping Unit) *</span>
                <div className="row" style={{ gap: 8 }}>
                  <input 
                    className="input" 
                    required 
                    value={sku} 
                    onChange={e => setSku(e.target.value)} 
                    placeholder="e.g. WM-001" 
                    style={{ fontFamily: 'monospace' }}
                  />
                  <button 
                    type="button" 
                    className="button ghost icon-button" 
                    onClick={generateSku}
                    title="Generate Random SKU"
                  >
                    <Wand2 size={18} />
                  </button>
                </div>
              </label>
              <label className="stack">
                <span className="small font-semibold">Category</span>
                <input 
                  className="input" 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  placeholder="e.g. Electronics" 
                  list="categories"
                />
                <datalist id="categories">
                    <option value="Electronics" />
                    <option value="Office Supplies" />
                    <option value="Furniture" />
                </datalist>
              </label>
            </div>
            <label className="stack">
              <span className="small font-semibold">Description</span>
              <textarea 
                className="textarea" 
                rows={4} 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Detailed product specifications..." 
              />
            </label>
          </div>

          {/* Financials & Inventory */}
          <div className="card stack">
            <h3 className="section-title row"><DollarSign size={18} /> Pricing & Inventory</h3>
            
            <div className="grid grid-3" style={{ alignItems: 'end' }}>
                <label className="stack">
                    <span className="small font-semibold">Cost Price</span>
                    <div className="row" style={{ gap: 0 }}>
                        <span className="input" style={{ width: 36, borderRight: 'none', borderRadius: '10px 0 0 10px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>$</span>
                        <input type="number" step="0.01" className="input" style={{ borderRadius: '0 10px 10px 0' }} value={costPrice} onChange={e => setCostPrice(e.target.value)} placeholder="0.00" />
                    </div>
                </label>
                <label className="stack">
                    <span className="small font-semibold">Selling Price</span>
                    <div className="row" style={{ gap: 0 }}>
                        <span className="input" style={{ width: 36, borderRight: 'none', borderRadius: '10px 0 0 10px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>$</span>
                        <input type="number" step="0.01" className="input" style={{ borderRadius: '0 10px 10px 0' }} value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} placeholder="0.00" />
                    </div>
                </label>
                <div className="stack" style={{ paddingBottom: 10 }}>
                    <span className="small muted">Margin</span>
                    <div style={{ fontWeight: 600, color: margin < 0 ? 'var(--danger)' : margin > 20 ? 'var(--success)' : 'var(--text)' }}>
                        {isFinite(margin) ? margin.toFixed(1) : '0.0'}%
                    </div>
                </div>
            </div>

            <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

            <div className="grid grid-2">
                <label className="stack">
                    <span className="small font-semibold">Initial Stock</span>
                    <input type="number" className="input" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
                </label>
                <label className="stack">
                    <span className="small font-semibold">Low Stock Alert</span>
                    <input type="number" className="input" value={reorderPoint} onChange={e => setReorderPoint(e.target.value)} placeholder="10" />
                </label>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="card stack">
            <h3 className="section-title row"><Layers size={18} /> Attributes</h3>
            {customFieldDefs.length === 0 ? (
                <div className="empty-state small" style={{ padding: 20 }}>No custom attributes defined. Add one below.</div>
            ) : (
                <div className="grid grid-2">
                    {customFieldDefs.map(def => (
                        <div key={def.key} className="stack">
                            <div className="flex-between">
                                <span className="small font-semibold">{def.key}</span>
                                <button type="button" onClick={() => {
                                    setCustomFieldDefs(prev => prev.filter(d => d.key !== def.key))
                                    const next = { ...customFields }; delete next[def.key]; setCustomFields(next)
                                }} className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 size={12}/></button>
                            </div>
                            {def.type === 'boolean' ? (
                                <select 
                                    className="select"
                                    value={String(customFields[def.key])}
                                    onChange={e => setCustomFields({ ...customFields, [def.key]: e.target.value === 'true' })}
                                >
                                    <option value="false">No</option>
                                    <option value="true">Yes</option>
                                </select>
                            ) : (
                                <input 
                                    type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
                                    className="input"
                                    value={customFields[def.key] ?? ''}
                                    onChange={e => setCustomFields({ 
                                        ...customFields, 
                                        [def.key]: def.type === 'number' ? parseFloat(e.target.value) : e.target.value 
                                    })}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            <div className="row bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                <input className="input small" placeholder="New Attribute Name" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} />
                <select className="select small" value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} style={{ width: 100 }}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes/No</option>
                    <option value="date">Date</option>
                </select>
                <button type="button" className="button secondary small" onClick={handleAddField}><Plus size={16}/> Add</button>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN (Sidebar) --- */}
        <div className="stack">
          
          {/* Media Upload */}
          <div className="card stack">
            <h3 className="section-title row"><ImageIcon size={18} /> Media</h3>
            
            {imagePreviews.length > 0 && (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {imagePreviews.map((src, idx) => (
                        <div key={idx} style={{ position: 'relative', aspectRatio: '1/1' }}>
                            <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                style={{
                                    position: 'absolute', top: 4, right: 4,
                                    background: 'rgba(0,0,0,0.6)', color: 'white',
                                    border: 'none', borderRadius: 4,
                                    width: 24, height: 24, cursor: 'pointer',
                                    display: 'grid', placeItems: 'center'
                                }}
                            >
                                <X size={14} />
                            </button>
                            {idx === 0 && <span className="badge" style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(255,255,255,0.9)', fontSize: 10 }}>Cover</span>}
                        </div>
                    ))}
                </div>
            )}

            {images.length < 4 && (
              <label 
                className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                style={{ minHeight: 120 }}
              >
                <Upload size={24} className="text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">Click to Upload</span>
                <span className="text-xs text-slate-400 mt-1">Max 4 images (JPG, PNG)</span>
                <input type="file" hidden accept="image/*" multiple onChange={handleImageChange} />
              </label>
            )}
          </div>

          {/* Organization */}
          <div className="card stack">
            <h3 className="section-title">Organization</h3>
            <label className="stack">
              <span className="small font-semibold">Folder</span>
              <select className="select" value={folderId} onChange={e => setFolderId(e.target.value)}>
                <option value="">Root Directory</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>📁 {f.name}</option>
                ))}
              </select>
            </label>
            <label className="stack">
                <span className="small font-semibold">Expiry Date</span>
                <input type="date" className="input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </label>
          </div>

        </div>
      </form>
    </div>
    </div>
  )
}