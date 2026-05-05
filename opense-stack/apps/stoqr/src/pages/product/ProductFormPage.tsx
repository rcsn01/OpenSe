import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Upload,
  X,
  Plus,
  Trash2,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { BasePage } from '../../components/BasePage'
import { useCompany } from '../../contexts/CompanyContext'
import type { ProductAttributeCatalogEntry } from '../../api/products'
import { useCreateProduct, useProductAttributeCatalog, useProductDetail, useProductFolders, useUpdateProduct } from '../../hooks/queries/useProducts'
import { getPublicImageUrl } from '../../utils'
import type { Folder } from '../../types'

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

const buildFolderPathLabel = (folderId: string, folderMap: Map<string, Folder>) => {
  const labels: string[] = []
  let currentFolder = folderMap.get(folderId)

  while (currentFolder) {
    labels.unshift(currentFolder.name)
    currentFolder = currentFolder.parent_id ? folderMap.get(currentFolder.parent_id) : undefined
  }

  return labels.join(' / ')
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
  const [isAttributePickerOpen, setIsAttributePickerOpen] = useState(false)
  const [isCreatingNewField, setIsCreatingNewField] = useState(false)

  const isSubmitting = mode === 'create' ? createProductMutation.isPending : updateProductMutation.isPending

  const existingAttributeOptions = useMemo(
    () => organisationFieldDefs.filter((definition) => !customFieldDefs.some((field) => field.key === definition.key)),
    [customFieldDefs, organisationFieldDefs],
  )

  const existingAttributeValuesByKey = useMemo(
    () => new Map(attributeCatalog.map((entry) => [entry.key, entry.values])),
    [attributeCatalog],
  )

  const folderOptions = useMemo(() => {
    const folderMap = new Map(folders.map((folder) => [folder.id, folder]))

    return folders
      .map((folder) => ({
        id: folder.id,
        label: buildFolderPathLabel(folder.id, folderMap),
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }, [folders])

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

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
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

  const closeAttributeBuilder = () => {
    setIsAttributePickerOpen(false)
    setIsCreatingNewField(false)
    setSelectedExistingFieldKey('')
    setNewFieldKey('')
    setNewFieldType('text')
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
    closeAttributeBuilder()
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
    closeAttributeBuilder()
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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

  const destination = mode === 'edit' && productId ? `/inventory/${productId}/overview` : '/inventory'
  const heading = mode === 'create' ? 'Add Product' : 'Edit Product'
  const pendingLabel = mode === 'create' ? 'Creating...' : 'Saving...'

  const renderAttributeEditor = (definition: CustomFieldDefinition) => {
    const availableValues = existingAttributeValuesByKey.get(definition.key) ?? []

    if (definition.type === 'boolean') {
      return (
        <select
          className="product-form-line-select"
          value={String(Boolean(customFields[definition.key]))}
          onChange={(event) => {
            setCustomFields({
              ...customFields,
              [definition.key]: event.target.value === 'true',
            })
          }}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      )
    }

    if (availableValues.length > 0) {
      const selectedValue =
        customFields[definition.key] === undefined || customFields[definition.key] === ''
          ? '__empty__'
          : JSON.stringify(customFields[definition.key])

      return (
        <select
          className="product-form-line-select"
          value={selectedValue}
          onChange={(event) => {
            if (event.target.value === '__empty__') {
              setCustomFields((previous) => ({
                ...previous,
                [definition.key]: getDefaultCustomFieldValue(definition.type),
              }))
              return
            }

            setAttributeValueFromSelect(definition, event.target.value, availableValues)
          }}
        >
          <option value="__empty__">Select existing value</option>
          {availableValues.map((value) => (
            <option key={JSON.stringify(value)} value={JSON.stringify(value)}>
              {renderAttributeValueLabel(value)}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={definition.type === 'number' ? 'number' : definition.type === 'date' ? 'date' : 'text'}
        className="product-form-line-input"
        value={String(customFields[definition.key] ?? '')}
        onChange={(event) => {
          setCustomFields({
            ...customFields,
            [definition.key]: parseCustomFieldValue(definition.type, event.target.value),
          })
        }}
      />
    )
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={mode === 'edit' && isLoadingDetail}
      loadingMessage="Loading product..."
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage inventory."
    >
      <div className="product-form-page">
        <form id="product-form" className="product-form-shell" onSubmit={handleSubmit}>
          <div className="product-form-actions">
            <button
              type="button"
              className="product-form-backlink"
              onClick={() => navigate(destination)}
            >
              <ArrowLeft size={14} />
              {mode === 'edit' ? 'Cancel' : 'Back to Inventory'}
            </button>

            <button type="submit" className="product-form-save" disabled={isSubmitting}>
              {isSubmitting ? pendingLabel : 'Save Product'}
            </button>
          </div>

          <div className="product-form-heading">
            <h1 className="product-form-title">{heading}</h1>
          </div>

          <section className="product-form-section">
            <div className="product-form-section-title">General Information</div>

            <div className="product-form-field-grid">
              <label className="product-form-field product-form-field--full">
                <span className="product-form-label">Product Name</span>
                <input
                  className="product-form-line-input"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Aeron Ergonomic Office Chair"
                />
              </label>

              <label className="product-form-field">
                <span className="product-form-label-row">
                  <span className="product-form-label">SKU</span>
                  <button type="button" className="product-form-inline-action" onClick={generateSku}>
                    <Wand2 size={12} />
                    Generate
                  </button>
                </span>
                <input
                  className="product-form-line-input"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label className="product-form-field">
                <span className="product-form-label">Location (Folder/Aisle)</span>
                <select
                  className="product-form-line-select"
                  value={folderId}
                  onChange={(event) => setFolderId(event.target.value)}
                >
                  <option value="">Root Directory</option>
                  {folderOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="product-form-field product-form-field--full">
                <span className="product-form-label">Description</span>
                <textarea
                  className="product-form-line-textarea"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the product, its purpose, and anything the warehouse team should know."
                />
              </label>

              <label className="product-form-field">
                <span className="product-form-label">Expiry Date</span>
                <input
                  type="date"
                  className="product-form-line-input"
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="product-form-section">
            <div className="product-form-section-title">Pricing &amp; Inventory</div>

            <div className="product-form-field-grid">
              <label className="product-form-field">
                <span className="product-form-label">Selling Price</span>
                <div className="product-form-money-field">
                  <span className="product-form-money-prefix">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="product-form-line-input"
                    value={sellingPrice}
                    onChange={(event) => setSellingPrice(event.target.value)}
                    placeholder="0"
                  />
                </div>
              </label>

              <label className="product-form-field">
                <span className="product-form-label">Cost Price</span>
                <div className="product-form-money-field">
                  <span className="product-form-money-prefix">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="product-form-line-input"
                    value={costPrice}
                    onChange={(event) => setCostPrice(event.target.value)}
                    placeholder="0"
                  />
                </div>
              </label>

              <label className="product-form-field">
                <span className="product-form-label">Update Stock</span>
                <input
                  type="number"
                  className="product-form-line-input"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="0"
                />
              </label>

              <label className="product-form-field">
                <span className="product-form-label">Low Stock Alert Threshold</span>
                <input
                  type="number"
                  className="product-form-line-input"
                  value={reorderPoint}
                  onChange={(event) => setReorderPoint(event.target.value)}
                  placeholder="10"
                />
              </label>
            </div>
          </section>

          <section className="product-form-section">
            <div className="product-form-section-head">
              <div className="product-form-section-title">Custom Attributes</div>
              <button
                type="button"
                className="product-form-text-action"
                onClick={() => setIsAttributePickerOpen((current) => !current)}
              >
                <Plus size={14} />
                Add Attribute
              </button>
            </div>

            {customFieldDefs.length > 0 ? (
              <div className="product-form-attributes-table">
                <div className="product-form-attributes-head">
                  <span className="product-form-label">Attribute Name</span>
                  <span className="product-form-label">Attribute Value</span>
                  <span aria-hidden="true" />
                </div>

                {customFieldDefs.map((definition) => (
                  <div key={definition.key} className="product-form-attribute-row">
                    <div className="product-form-attribute-name">{definition.key}</div>
                    <div className="product-form-attribute-value">{renderAttributeEditor(definition)}</div>
                    <button
                      type="button"
                      className="product-form-remove-attribute"
                      aria-label={`Remove ${definition.key}`}
                      onClick={() => {
                        setCustomFieldDefs((previous) => previous.filter((field) => field.key !== definition.key))
                        const nextFields = { ...customFields }
                        delete nextFields[definition.key]
                        setCustomFields(nextFields)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="product-form-empty-copy">No custom attributes added yet.</p>
            )}

            {isAttributePickerOpen ? (
              <div className="product-form-attribute-builder">
                <label className="product-form-field product-form-field--full">
                  <span className="product-form-label">Add From Existing Attributes</span>
                  <select
                    aria-label="Add attribute from existing list"
                    className="product-form-line-select"
                    value={selectedExistingFieldKey}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setSelectedExistingFieldKey(nextValue)

                      if (!nextValue) return

                      if (nextValue === '__new__') {
                        setIsCreatingNewField(true)
                        return
                      }

                      handleAddExistingField(nextValue)
                    }}
                  >
                    <option value="">Select existing attribute</option>
                    {existingAttributeOptions.map((definition) => (
                      <option key={definition.key} value={definition.key}>
                        {definition.key}
                      </option>
                    ))}
                    <option value="__new__">Create new attribute...</option>
                  </select>
                </label>

                {isCreatingNewField ? (
                  <div className="product-form-builder-grid">
                    <label className="product-form-field">
                      <span className="product-form-label">Attribute Name</span>
                      <input
                        className="product-form-line-input"
                        placeholder="Color"
                        value={newFieldKey}
                        onChange={(event) => setNewFieldKey(event.target.value)}
                      />
                    </label>

                    <label className="product-form-field">
                      <span className="product-form-label">Value Type</span>
                      <select
                        className="product-form-line-select"
                        value={newFieldType}
                        onChange={(event) => setNewFieldType(event.target.value as CustomFieldDefinition['type'])}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Yes / No</option>
                        <option value="date">Date</option>
                      </select>
                    </label>

                    <div className="product-form-builder-actions">
                      <button type="button" className="product-form-secondary-action" onClick={handleAddField}>
                        <Plus size={14} />
                        Add Attribute
                      </button>
                      <button type="button" className="product-form-inline-action" onClick={closeAttributeBuilder}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="product-form-inline-action"
                    onClick={() => setIsCreatingNewField(true)}
                  >
                    Create a brand new attribute
                  </button>
                )}
              </div>
            ) : null}
          </section>

          <section className="product-form-section">
            <div className="product-form-section-title">Product Media</div>

            <label className={`product-form-upload-zone${existingImageUrls.length + images.length >= 4 ? ' is-disabled' : ''}`}>
              <Upload size={22} />
              <span className="product-form-upload-title">Click or drag images to upload</span>
              <span className="product-form-upload-caption">JPEG, PNG up to 5 MB</span>
              {existingImageUrls.length + images.length < 4 ? (
                <input type="file" hidden accept="image/*" multiple onChange={handleImageChange} />
              ) : null}
            </label>

            {existingImageUrls.length > 0 || imagePreviews.length > 0 ? (
              <div className="product-form-media-grid">
                {existingImageUrls.map((source, index) => (
                  <div key={`existing-${source}`} className="product-form-media-thumb">
                    <img src={getPublicImageUrl(source)} alt={name || 'Existing product media'} />
                    <button
                      type="button"
                      className="product-form-media-remove"
                      onClick={() => removeExistingImage(index)}
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {imagePreviews.map((source, index) => (
                  <div key={`new-${source}`} className="product-form-media-thumb">
                    <img src={source} alt={name || 'New product media preview'} />
                    <button
                      type="button"
                      className="product-form-media-remove"
                      onClick={() => removeNewImage(index)}
                      aria-label="Remove image"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </form>
      </div>
    </BasePage>
  )
}
