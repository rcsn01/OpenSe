import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../supabaseClient'
import { useCompany } from '../../contexts/CompanyContext'
import { toNumber } from '../../utils'
import type { Folder } from '../../types'

type CustomFieldDefinition = { key: string; type: 'text' | 'number' | 'boolean' | 'date' }

export const CreateProduct = () => {
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
  const [quantity, setQuantity] = useState(0)
  const [reorderPoint, setReorderPoint] = useState(10)
  const [costPrice, setCostPrice] = useState(0)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [folderId, setFolderId] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState('')
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  useEffect(() => {
    if (!companyId) return
    const loadData = async () => {
      // Fetch Folders
      const { data: folderData } = await supabase
        .from('folders')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')
      
      if (folderData) setFolders(folderData)

      // Fetch Custom Field Definitions
      const { data: companyData } = await supabase
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      // Limit to 4 images total as per constraint
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

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setIsLoading(true)

    try {
        // 1. Insert Product
        const { data: product, error: insertError } = await supabase
            .from('products')
            .insert({
                company_id: companyId,
                name,
                sku,
                description: description || null,
                category: category || null,
                quantity_on_hand: quantity,
                reorder_point: reorderPoint,
                cost_price: costPrice,
                selling_price: sellingPrice,
                folder_id: folderId === '' ? null : folderId,
                expiry_date: expiryDate || null,
                custom_fields: customFields
            })
            .select()
            .single()

        if (insertError) throw insertError
        if (!product) throw new Error('Product creation failed')

        // 2. Upload Images
        const uploadedUrls: string[] = []
        if (images.length > 0) {
            for (const file of images) {
                // Sanitize filename to avoid issues
                const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                const path = `${companyId}/${product.id}/${cleanName}`
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(path, file)
                
                if (uploadError) {
                    console.error('Upload failed', uploadError)
                    toast.error(`Failed to upload ${file.name}`)
                    continue
                }
                uploadedUrls.push(path)
            }

            // 3. Update Product with Image URLs
            if (uploadedUrls.length > 0) {
                await supabase
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
    <div className="stack" style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="button ghost small" style={{ width: 'fit-content' }} onClick={() => navigate('/inventory')}>
        <ArrowLeft size={16} style={{ marginRight: 8 }} /> Back to Inventory
      </button>
      
      <div className="flex-between">
        <h1 className="page-title">Create New Product</h1>
      </div>

      <form className="stack" onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="card stack">
          <h3 className="section-title">Basic Information</h3>
          <div className="grid grid-2">
            <label className="stack">
              Name *
              <input className="input" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Wireless Mouse" />
            </label>
            <label className="stack">
              SKU *
              <input className="input" required value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. WM-001" />
            </label>
          </div>
          <label className="stack">
            Description
            <textarea className="textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Product details..." />
          </label>
          <div className="grid grid-2">
            <label className="stack">
              Category
              <input className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Electronics" />
            </label>
            <label className="stack">
              Folder
              <select className="select" value={folderId} onChange={e => setFolderId(e.target.value)}>
                <option value="">No Folder</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Inventory & Pricing */}
        <div className="card stack">
          <h3 className="section-title">Inventory & Pricing</h3>
          <div className="grid grid-2">
            <label className="stack">
              Initial Quantity
              <input type="number" className="input" value={quantity} onChange={e => setQuantity(toNumber(e.target.value))} />
            </label>
            <label className="stack">
              Reorder Point
              <input type="number" className="input" value={reorderPoint} onChange={e => setReorderPoint(toNumber(e.target.value))} />
            </label>
            <label className="stack">
              Cost Price ($)
              <input type="number" step="0.01" className="input" value={costPrice} onChange={e => setCostPrice(toNumber(e.target.value))} />
            </label>
            <label className="stack">
              Selling Price ($)
              <input type="number" step="0.01" className="input" value={sellingPrice} onChange={e => setSellingPrice(toNumber(e.target.value))} />
            </label>
            <label className="stack">
              Expiry Date (Optional)
              <input type="date" className="input" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            </label>
          </div>
        </div>

        {/* Images */}
        <div className="card stack">
          <h3 className="section-title">Images</h3>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 16 }}>
            {imagePreviews.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', width: 100, height: 100 }}>
                <img src={src} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  style={{
                    position: 'absolute', top: -8, right: -8,
                    background: 'var(--danger)', color: 'white',
                    border: 'none', borderRadius: '50%',
                    width: 24, height: 24, cursor: 'pointer',
                    display: 'grid', placeItems: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <label style={{ 
                width: 100, height: 100, 
                border: '2px dashed var(--border)', borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--muted)', fontSize: 12
              }}>
                <Upload size={20} style={{ marginBottom: 4 }} />
                Upload
                <input type="file" hidden accept="image/*" multiple onChange={handleImageChange} />
              </label>
            )}
          </div>
          <p className="muted small">Max 4 images.</p>
        </div>

        {/* Custom Fields */}
        {customFieldDefs.length > 0 && (
          <div className="card stack">
            <h3 className="section-title">Additional Attributes</h3>
            <div className="grid grid-2">
              {customFieldDefs.map(def => (
                <label key={def.key} className="stack">
                  {def.key}
                  {def.type === 'boolean' ? (
                    <select 
                      className="select"
                      value={String(customFields[def.key])}
                      onChange={e => handleCustomFieldChange(def.key, e.target.value === 'true')}
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  ) : (
                    <input 
                      type={def.type === 'number' ? 'number' : def.type === 'date' ? 'date' : 'text'}
                      className="input"
                      value={customFields[def.key] ?? ''}
                      onChange={e => handleCustomFieldChange(def.key, def.type === 'number' ? toNumber(e.target.value) : e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <button type="button" className="button ghost" onClick={() => navigate('/inventory')}>Cancel</button>
          <button type="submit" className="button" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  )
}