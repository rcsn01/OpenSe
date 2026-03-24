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
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { Dropdown, DropdownItem } from '@repo/ui'
import { useCompany } from '../../contexts/CompanyContext'
import type { ProductAttributeCatalogEntry } from '../../api/products'
import { useCreateProduct, useProductAttributeCatalog, useProductDetail, useProductFolders, useUpdateProduct } from '../../hooks/queries/useProducts'
import { getPublicImageUrl } from '../../utils'

type ProductFormMode = 'create' | 'edit'
type CustomFieldDefinition = { key: string; type: 'text' | 'number' | 'boolean' | 'date' }

const getSettingsStorageKey = (companyId: string) => `stoqr:company-settings:${companyId}`

const readCustomFieldDefs = (companyId: string): CustomFieldDefinition[] => {
  try {
    const raw = localStorage.getItem(getSettingsStorageKey(companyId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as { custom_fields?: CustomFieldDefinition[] }
    return parsed.custom_fields ?? []
  } catch {
    return []
  }
}

const saveCustomFieldDefs = (companyId: string, definitions: CustomFieldDefinition[]) => {
  const storageKey = getSettingsStorageKey(companyId)

  try {
    const raw = localStorage.getItem(storageKey)
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...parsed,
        custom_fields: definitions,
      }),
    )
  } catch {
    // no-op
  }
}

const inferCustomFieldType = (value: unknown): CustomFieldDefinition['type'] => {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
  return 'text'
}

const getDefaultCustomFieldValue = (type: CustomFieldDefinition['type']) => (type === 'boolean' ? false : '')

const parseCustomFieldValue = (type: CustomFieldDefinition['type'], value: string): unknown => {
  if (type === 'number') {
    return value === '' ? '' : Number(value)
  }

  if (type === 'boolean') {
    return value === 'true'
  }

  return value
}

export const ProductFormPage = ({ mode, productId }: { mode: ProductFormMode; productId?: string }) => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const createProductMutation = useCreateProduct(companyId)
  const updateProductMutation = useUpdateProduct(companyId, mode === 'edit' ? productId ?? null : null)
  const { data: folders = [] } = useProductFolders(companyId)
  const { data: attributeCatalog = [] } = useProductAttributeCatalog(companyId)
  const { data: detailData, isLoading: isLoadingDetail } = useProductDetail(
    companyId,
    mode === 'edit' ? productId ?? null : null,
  )

  const [organisationFieldDefs, setOrganisationFieldDefs] = useState<CustomFieldDefinition[]>([])
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefinition[]>([])

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState<string>('0')
  const [reorderPoint, setReorderPoint] = useState<string>('10')
  const [expiryDate, setExpiryDate] = useState('')
  const [costPrice, setCostPrice] = useState<string>('')
  const [sellingPrice, setSellingPrice] = useState<string>('')
  const [folderId, setFolderId] = useState<string>('')
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({})
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])

  const [newFieldKey, setNewFieldKey] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text')
  const [selectedExistingFieldKey, setSelectedExistingFieldKey] = useState('')
  const [isCreatingNewField, setIsCreatingNewField] = useState(false)

  const margin = useMemo(() => {
    const cost = parseFloat(costPrice) || 0
    const sell = parseFloat(sellingPrice) || 0
    if (sell === 0) return 0
    return ((sell - cost) / sell) * 100
  }, [costPrice, sellingPrice])

  const isSubmitting = mode === 'create' ? createProductMutation.isPending : updateProductMutation.isPending

  const existingAttributeOptions = useMemo(
    () => organisationFieldDefs.filter((definition) => !customFieldDefs.some((field) => field.key === definition.key)),
    [customFieldDefs, organisationFieldDefs],
  )

  const existingAttributeValuesByKey = useMemo(
    () => new Map(attributeCatalog.map((entry) => [entry.key, entry.values])),
    [attributeCatalog],
  )

  useEffect(() => {
    if (!companyId) return
    const customFieldDefinitions = readCustomFieldDefs(companyId)
    setOrganisationFieldDefs(customFieldDefinitions)

    if (mode === 'create') {
      setCustomFieldDefs([])
      setCustomFields({})
    }
  }, [companyId, mode])

  useEffect(() => {
    if (!attributeCatalog.length) return

    setOrganisationFieldDefs((previous) => {
      const next = [...previous]
      let hasChanges = false

      attributeCatalog.forEach((entry) => {
        if (next.some((field) => field.key === entry.key)) return

        next.push({ key: entry.key, type: entry.type })
        hasChanges = true
      })

      if (hasChanges && companyId) {
        saveCustomFieldDefs(companyId, next)
      }

      return hasChanges ? next : previous
    })
  }, [attributeCatalog, companyId])

  useEffect(() => {
    if (mode !== 'edit') return
    const product = detailData?.product
    if (!product) return

    setName(product.name ?? '')
    setSku(product.sku ?? '')
    setDescription(product.description ?? '')
    setQuantity(String(product.quantity_on_hand ?? 0))
    setReorderPoint(String(product.reorder_point ?? 0))
    setCostPrice(product.cost_price !== null && product.cost_price !== undefined ? String(product.cost_price) : '')
    setSellingPrice(product.selling_price !== null && product.selling_price !== undefined ? String(product.selling_price) : '')
    setFolderId(product.folder_id ?? '')
    setExpiryDate(product.expiry_date ?? '')
    setExistingImageUrls(product.image_urls ?? [])
    setImages([])
    setImagePreviews((previous) => {
      previous.forEach((url) => URL.revokeObjectURL(url))
      return []
    })

    const productCustomFields = (product.custom_fields ?? {}) as Record<string, unknown>
    setCustomFields(productCustomFields)

    setCustomFieldDefs(
      Object.entries(productCustomFields).map(([fieldKey, fieldValue]) => {
        const existingDefinition = organisationFieldDefs.find((definition) => definition.key === fieldKey)

        return {
          key: fieldKey,
          type: existingDefinition?.type ?? inferCustomFieldType(fieldValue),
        }
      }),
    )

    setOrganisationFieldDefs((previous) => {
      const next = [...previous]
      let hasChanges = false

      Object.entries(productCustomFields).forEach(([fieldKey, fieldValue]) => {
        if (next.some((definition) => definition.key === fieldKey)) return

        next.push({ key: fieldKey, type: inferCustomFieldType(fieldValue) })
        hasChanges = true
      })

      if (hasChanges && companyId) {
        saveCustomFieldDefs(companyId, next)
      }

      return hasChanges ? next : previous
    })
  }, [companyId, detailData, mode, organisationFieldDefs])

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imagePreviews])

  const generateSku = () => {
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD'
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')
    setSku(`${prefix}-${random}`)
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return
    const newFiles = Array.from(event.target.files)

    if (existingImageUrls.length + images.length + newFiles.length > 4) {
      toast.error('Maximum 4 images allowed')
      return
    }

    setImages((previous) => [...previous, ...newFiles])
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
    setImagePreviews((previous) => [...previous, ...newPreviews])
  }

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
  }

  const removeNewImage = (index: number) => {
    setImages((previous) => previous.filter((_, imageIndex) => imageIndex !== index))
    setImagePreviews((previous) => {
      const target = previous[index]
      if (target) URL.revokeObjectURL(target)
      return previous.filter((_, imageIndex) => imageIndex !== index)
    })
  }

  const handleAddField = () => {
    if (!newFieldKey.trim()) {
      toast.error('Please enter a field name')
      return
    }
    const normalizedKey = newFieldKey.trim()
    if (organisationFieldDefs.some((definition) => definition.key === normalizedKey)) {
      toast.error('Field already exists')
      return
    }

    const newDefinition: CustomFieldDefinition = { key: normalizedKey, type: newFieldType }

    setOrganisationFieldDefs((previous) => {
      const next = [...previous, newDefinition]

      if (companyId) {
        saveCustomFieldDefs(companyId, next)
      }

      return next
    })

    setCustomFieldDefs((previous) => [...previous, newDefinition])
    setCustomFields((previous) => ({
      ...previous,
      [newDefinition.key]: getDefaultCustomFieldValue(newDefinition.type),
    }))
    setNewFieldKey('')
    setNewFieldType('text')
    setIsCreatingNewField(false)
  }

  const handleAddExistingField = (fieldKey: string) => {
    const definition = organisationFieldDefs.find((field) => field.key === fieldKey)
    if (!definition) return

    if (customFieldDefs.some((field) => field.key === fieldKey)) {
      toast.error('Field already exists')
      return
    }

    setCustomFieldDefs((previous) => [...previous, definition])
    setCustomFields((previous) => ({
      ...previous,
      [fieldKey]: getDefaultCustomFieldValue(definition.type),
    }))
  }

  const renderAttributeValueLabel = (value: string | number | boolean) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  const setAttributeValueFromSelect = (
    definition: CustomFieldDefinition,
    selectedValue: string,
    availableValues: ProductAttributeCatalogEntry['values'],
  ) => {
    const value = availableValues.find((entry) => JSON.stringify(entry) === selectedValue)
    if (value === undefined) return

    setCustomFields((previous) => ({
      ...previous,
      [definition.key]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!companyId) return

    try {
      const payload = {
        name,
        sku,
        description,
        quantity,
        reorderPoint,
        costPrice,
        sellingPrice,
        folderId,
        expiryDate,
        customFields,
      }

      if (mode === 'create') {
        const result = await createProductMutation.mutateAsync({
          payload,
          images,
        })

        toast.success('Product created successfully')
        navigate(`/inventory/${result.id}/overview`)
        return
      }

      if (!productId) {
        toast.error('Missing product id')
        return
      }

      await updateProductMutation.mutateAsync({
        payload,
        images,
        retainedImageUrls: existingImageUrls,
      })

      toast.success('Product updated successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save product'
      toast.error(message)
    }
  }

  if (mode === 'edit' && isLoadingDetail) {
    return <div className="empty-state">Loading product...</div>
  }

  const destination = mode === 'edit' && productId ? `/inventory/${productId}/overview` : '/inventory'
  const heading = mode === 'create' ? 'Add New Product' : 'Edit Product'
  const subheading =
    mode === 'create'
      ? 'Fill in the details to track a new inventory item.'
      : 'Update product information and save your changes.'
  const submitLabel = mode === 'create' ? 'Save Product' : 'Update Product'
  const pendingLabel = mode === 'create' ? 'Creating...' : 'Saving...'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="stack" style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 80 }}>
        <div
          className="flex-between sticky top-0 bg-slate-50 py-4 z-10"
          style={{ margin: '-32px -40px 24px', padding: '32px 40px 16px', background: 'var(--bg)' }}
        >
          <div className="row">
            <button className="button ghost small icon-button" onClick={() => navigate(destination)}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="page-title" style={{ fontSize: 'var(--type-size-3xl)', marginBottom: 4 }}>
                {heading}
              </h1>
              <div className="muted small">{subheading}</div>
            </div>
          </div>
          <div className="row">
            <button type="button" className="button ghost" onClick={() => navigate(destination)}>
              Discard
            </button>
            <button type="submit" className="button" form="product-form" disabled={isSubmitting}>
              <Save size={16} />
              {isSubmitting ? pendingLabel : submitLabel}
            </button>
          </div>
        </div>

        <form
          id="product-form"
          className="grid"
          style={{ gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}
          onSubmit={handleSubmit}
        >
          <div className="stack">
            <div className="card stack">
              <h3 className="section-title row">
                <Package size={18} /> General Information
              </h3>
              <label className="stack">
                <span className="small font-semibold">Product Name *</span>
                <input
                  className="input"
                  style={{ fontSize: 'var(--type-size-md)', padding: 12 }}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                      onChange={(event) => setSku(event.target.value)}
                      placeholder="e.g. WM-001"
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
              </div>
              <label className="stack">
                <span className="small font-semibold">Description</span>
                <textarea
                  className="textarea"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Detailed product specifications..."
                />
              </label>
            </div>

            <div className="card stack">
              <h3 className="section-title row">
                <DollarSign size={18} /> Pricing & Inventory
              </h3>

              <div className="grid grid-3" style={{ alignItems: 'end' }}>
                <label className="stack">
                  <span className="small font-semibold">Cost Price</span>
                  <div className="row" style={{ gap: 0 }}>
                    <span
                      className="input"
                      style={{
                        width: 36,
                        borderRight: 'none',
                        borderRadius: '10px 0 0 10px',
                        background: '#f8fafc',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      style={{ borderRadius: '0 10px 10px 0' }}
                      value={costPrice}
                      onChange={(event) => setCostPrice(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </label>
                <label className="stack">
                  <span className="small font-semibold">Selling Price</span>
                  <div className="row" style={{ gap: 0 }}>
                    <span
                      className="input"
                      style={{
                        width: 36,
                        borderRight: 'none',
                        borderRadius: '10px 0 0 10px',
                        background: '#f8fafc',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      style={{ borderRadius: '0 10px 10px 0' }}
                      value={sellingPrice}
                      onChange={(event) => setSellingPrice(event.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </label>
                <div className="stack" style={{ paddingBottom: 10 }}>
                  <span className="small muted">Margin</span>
                  <div
                    style={{
                      fontWeight: 'var(--type-weight-semibold)',
                      color: margin < 0 ? 'var(--danger)' : margin > 20 ? 'var(--success)' : 'var(--text)',
                    }}
                  >
                    {isFinite(margin) ? margin.toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>

              <hr style={{ borderColor: 'var(--border)', margin: '8px 0' }} />

              <div className="grid grid-2">
                <label className="stack">
                  <span className="small font-semibold">Initial Stock</span>
                  <input
                    type="number"
                    className="input"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="stack">
                  <span className="small font-semibold">Low Stock Alert</span>
                  <input
                    type="number"
                    className="input"
                    value={reorderPoint}
                    onChange={(event) => setReorderPoint(event.target.value)}
                    placeholder="10"
                  />
                </label>
              </div>
            </div>

            <div className="card stack">
              <h3 className="section-title row">
                <Layers size={18} /> Attributes
              </h3>
              {customFieldDefs.length === 0 ? (
                <div className="empty-state small" style={{ padding: 20 }}>
                  No custom attributes defined. Add one below.
                </div>
              ) : (
                <div className="grid grid-2">
                  {customFieldDefs.map((definition) => (
                    <div key={definition.key} className="stack">
                      <div className="flex-between">
                        <span className="small font-semibold">{definition.key}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomFieldDefs((previous) => previous.filter((field) => field.key !== definition.key))
                            const next = { ...customFields }
                            delete next[definition.key]
                            setCustomFields(next)
                          }}
                          className="text-red-500 hover:bg-red-50 rounded p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {definition.type === 'boolean' ? (
                        <select
                          className="select"
                          value={String(customFields[definition.key])}
                          onChange={(event) =>
                            setCustomFields({ ...customFields, [definition.key]: event.target.value === 'true' })
                          }
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      ) : (existingAttributeValuesByKey.get(definition.key)?.length ?? 0) > 0 ? (
                        <Dropdown
                          className="min-w-[180px]"
                          trigger={
                            <button
                              type="button"
                              className="select small text-left"
                              aria-label={`Select existing value for ${definition.key}`}
                            >
                              {customFields[definition.key] === undefined || customFields[definition.key] === ''
                                ? 'Select existing value'
                                : renderAttributeValueLabel(customFields[definition.key] as string | number | boolean)}
                            </button>
                          }
                        >
                          <DropdownItem
                            onClick={() => {
                              setCustomFields((previous) => ({
                                ...previous,
                                [definition.key]: getDefaultCustomFieldValue(definition.type),
                              }))
                            }}
                          >
                            Select existing value
                          </DropdownItem>
                          {(existingAttributeValuesByKey.get(definition.key) ?? []).map((value) => (
                            <DropdownItem
                              key={JSON.stringify(value)}
                              onClick={() => {
                                setAttributeValueFromSelect(
                                  definition,
                                  JSON.stringify(value),
                                  existingAttributeValuesByKey.get(definition.key) ?? [],
                                )
                              }}
                            >
                              {renderAttributeValueLabel(value)}
                            </DropdownItem>
                          ))}
                        </Dropdown>
                      ) : (
                        <input
                          type={definition.type === 'number' ? 'number' : definition.type === 'date' ? 'date' : 'text'}
                          className="input"
                          value={String(customFields[definition.key] ?? '')}
                          onChange={(event) =>
                            setCustomFields({
                              ...customFields,
                              [definition.key]: parseCustomFieldValue(definition.type, event.target.value),
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="stack bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2">
                <select
                  aria-label="Add attribute from existing list"
                  className="select small"
                  value={selectedExistingFieldKey}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setSelectedExistingFieldKey('')

                    if (!nextValue) return

                    if (nextValue === '__new__') {
                      setIsCreatingNewField(true)
                      return
                    }

                    handleAddExistingField(nextValue)
                    setIsCreatingNewField(false)
                  }}
                >
                  <option value="">Select existing attribute</option>
                  {existingAttributeOptions.map((definition) => (
                    <option key={definition.key} value={definition.key}>{definition.key}</option>
                  ))}
                  <option value="__new__">Create new attribute...</option>
                </select>

                {isCreatingNewField && (
                  <div className="row">
                    <input
                      className="input small"
                      placeholder="New Attribute Name"
                      value={newFieldKey}
                      onChange={(event) => setNewFieldKey(event.target.value)}
                    />
                    <select
                      className="select small"
                      value={newFieldType}
                      onChange={(event) => setNewFieldType(event.target.value as CustomFieldDefinition['type'])}
                      style={{ width: 100 }}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Yes/No</option>
                      <option value="date">Date</option>
                    </select>
                    <button type="button" className="button secondary small" onClick={handleAddField}>
                      <Plus size={16} /> Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="card stack">
              <h3 className="section-title row">
                <ImageIcon size={18} /> Media
              </h3>

              {(existingImageUrls.length > 0 || imagePreviews.length > 0) && (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {existingImageUrls.map((source, index) => (
                    <div key={`existing-${source}`} style={{ position: 'relative', aspectRatio: '1/1' }}>
                      <img
                        src={getPublicImageUrl(source)}
                        alt="preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          width: 24,
                          height: 24,
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((source, index) => (
                    <div key={`new-${source}`} style={{ position: 'relative', aspectRatio: '1/1' }}>
                      <img
                        src={source}
                        alt="preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(0,0,0,0.6)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          width: 24,
                          height: 24,
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {existingImageUrls.length + images.length < 4 && (
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

            <div className="card stack">
              <h3 className="section-title">Organization</h3>
              <label className="stack">
                <span className="small font-semibold">Folder</span>
                <select className="select" value={folderId} onChange={(event) => setFolderId(event.target.value)}>
                  <option value="">Root Directory</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      📁 {folder.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stack">
                <span className="small font-semibold">Expiry Date</span>
                <input
                  type="date"
                  className="input"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </label>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
