import { Layers3, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Select } from '@repo/ui'
import type { LabelProduct } from '../../api/labelStudio'
import { useCreateLabelPrintJob, useLabelProductFolders, useLabelProducts, useLabelTemplates } from '../../hooks/queries/useLabelStudio'
import { usePageTopBarSearch, useTopBarSearchValue } from '../Search/TopBarSearch'
import { LabelPreviewCard } from './LabelPreviewCard'
import { downloadLabelPdf } from './downloadLabelPdf'
import { buildLabelPlacements, getPlacementPageCount } from './labelRenderPlan'
import { createLabelPdfDataUrl } from './pdfExport'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'

type BatchTarget = 'single' | 'multiple' | 'folder'

type LabelPreviewBatchTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectedTemplateChange?: (templateId: string) => void
}

const sanitizeFileNamePart = (value: string | null | undefined) =>
  (value ?? 'label')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'label'

const buildPdfFileName = (templateName: string | null | undefined, targetName: string | null | undefined) => {
  const timestamp = new Date().toISOString().replace(/[.:]/g, '-')
  return `${sanitizeFileNamePart(templateName)}-${sanitizeFileNamePart(targetName)}-${timestamp}.pdf`
}

const getFolderPathLabel = (
  folderId: string,
  folders: Array<{ id: string; name: string; parent_id: string | null }>,
) => {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]))
  const segments: string[] = []
  const seen = new Set<string>()
  let currentId: string | null = folderId

  while (currentId && !seen.has(currentId)) {
    const currentFolder = folderById.get(currentId)
    if (!currentFolder) break

    segments.unshift(currentFolder.name)
    seen.add(currentId)
    currentId = currentFolder.parent_id
  }

  return segments.join(' / ')
}

export const LabelPreviewBatchTab = ({ companyId, selectedTemplateId: initialSelectedTemplateId, onSelectedTemplateChange }: LabelPreviewBatchTabProps) => {
  const { searchValue } = useTopBarSearchValue()
  const { data: templates = [], isLoading: loadingTemplates } = useLabelTemplates(companyId)
  const [targetType, setTargetType] = useState<BatchTarget>('single')
  const [folderId, setFolderId] = useState('')
  const activeFolderId = targetType === 'folder' && folderId ? folderId : undefined
  const { data: products = [], isLoading: loadingProducts } = useLabelProducts(companyId, '', activeFolderId)
  const { data: folders = [], isLoading: loadingFolders } = useLabelProductFolders(companyId)
  const createPrintJobMutation = useCreateLabelPrintJob(companyId)

  const [templateId, setTemplateId] = useState(initialSelectedTemplateId ?? '')
  const [productId, setProductId] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const normalizedSearchTerm = normalizePageSearchTerm(searchValue)
  const normalizedProductSearch = normalizePageSearchTerm(productSearch || searchValue)
  const filteredTemplates = useMemo(() => fuzzySearchItems(templates, normalizedSearchTerm, [
    {
      key: (template) => template.name,
      maxRanking: fuzzyRankings.WORD_STARTS_WITH,
    },
  ]), [normalizedSearchTerm, templates])
  const filteredProducts = useMemo(() => fuzzySearchItems(products, normalizedProductSearch, [
    {
      key: (product) => product.sku,
      maxRanking: fuzzyRankings.STARTS_WITH,
    },
    {
      key: (product) => product.name,
      maxRanking: fuzzyRankings.WORD_STARTS_WITH,
    },
  ]), [normalizedProductSearch, products])

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId) ?? null, [templates, templateId])
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId) ?? null, [products, productId])
  const selectedProducts = useMemo<LabelProduct[]>(
    () => selectedProductIds
      .map((selectedId) => products.find((product) => product.id === selectedId))
      .filter((product): product is LabelProduct => Boolean(product)),
    [products, selectedProductIds],
  )
  const selectedFolder = useMemo(() => folders.find((folder) => folder.id === folderId) ?? null, [folders, folderId])
  const templateOptions = useMemo(
    () => filteredTemplates.map((template) => ({ value: template.id, label: template.name })),
    [filteredTemplates],
  )
  const folderOptions = useMemo(
    () => folders
      .map((folder) => ({ value: folder.id, label: getFolderPathLabel(folder.id, folders) || folder.name }))
      .sort((left, right) => left.label.localeCompare(right.label)),
    [folders],
  )
  const selectedFolderLabel = selectedFolder ? getFolderPathLabel(selectedFolder.id, folders) || selectedFolder.name : null
  const productsToPreview = useMemo(
    () => {
      if (targetType === 'folder') {
        return folderId ? products : []
      }

      if (targetType === 'multiple') {
        return selectedProducts
      }

      return selectedProduct ? [selectedProduct] : []
    },
    [products, selectedProduct, selectedProducts, targetType],
  )
  const selectedListProducts = useMemo(
    () => (targetType === 'multiple' ? selectedProducts : selectedProduct ? [selectedProduct] : []),
    [selectedProduct, selectedProducts, targetType],
  )
  const searchableProducts = useMemo(
    () => filteredProducts.filter((product) => {
      if (targetType === 'multiple') {
        return !selectedProductIds.includes(product.id)
      }

      return true
    }),
    [filteredProducts, selectedProductIds, targetType],
  )

  const showInitialLoading = loadingTemplates || loadingFolders || (loadingProducts && targetType !== 'folder')
  const exportPageCount = useMemo(() => {
    if (!selectedTemplate || productsToPreview.length === 0) return 0

    return getPlacementPageCount(buildLabelPlacements(productsToPreview, quantity, selectedTemplate.layout))
  }, [productsToPreview, quantity, selectedTemplate])

  useEffect(() => {
    setTemplateId(initialSelectedTemplateId ?? '')
  }, [initialSelectedTemplateId])

  const previewSuggestions = useMemo(
    () => [
      ...filteredTemplates.slice(0, 4).map((template) => ({
        id: `preview-template-${template.id}`,
        title: template.name,
        subtitle: 'Label template',
        value: template.name,
        badge: 'Template',
      })),
      ...filteredProducts.slice(0, 4).map((product) => ({
        id: `preview-product-${product.id}`,
        title: product.name,
        subtitle: product.sku,
        value: product.sku || product.name,
        badge: 'Product',
      })),
    ],
    [filteredProducts, filteredTemplates],
  )

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'label-studio-preview',
    placeholder: 'Search label products...',
    defaultSuggestions: [
      { id: 'labels-preview', title: 'Preview Batch', subtitle: 'Queue products and preview print output', value: 'preview batch', badge: 'Labels' },
    ],
    suggestions: previewSuggestions,
  }), [previewSuggestions]))

  const switchTargetType = (nextTargetType: BatchTarget) => {
    setTargetType(nextTargetType)
    setMessage(null)
    setFolderId('')
    setProductId('')
    setSelectedProductIds([])
    setProductSearch('')
  }

  const handleTemplateChange = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId)
    onSelectedTemplateChange?.(nextTemplateId)
    setMessage(null)
  }

  const addProductSelection = (nextProductId: string) => {
    setMessage(null)
    setProductSearch('')

    if (targetType === 'multiple') {
      setSelectedProductIds((currentIds) => currentIds.includes(nextProductId) ? currentIds : [...currentIds, nextProductId])
      return
    }

    setProductId(nextProductId)
  }

  const removeSelectedProduct = (selectedId: string) => {
    setMessage(null)

    if (targetType === 'multiple') {
      setSelectedProductIds((currentIds) => currentIds.filter((productId) => productId !== selectedId))
      return
    }

    if (productId === selectedId) {
      setProductId('')
    }
  }

  const exportPdf = async () => {
    setMessage(null)
    if (!templateId || quantity < 1) {
      setMessage('Select template and valid quantity.')
      return
    }

    if (targetType === 'single' && !productId) {
      setMessage('Select a product.')
      return
    }

    if (targetType === 'multiple' && selectedProductIds.length === 0) {
      setMessage('Select at least one product.')
      return
    }

    if (targetType === 'folder') {
      if (!folderId) {
        setMessage('Select a folder.')
        return
      }

      if (products.length === 0) {
        setMessage('Selected folder has no products.')
        return
      }
    }

    const payload =
      targetType === 'folder'
        ? {
            targetType,
            folderId,
            productIds: products.map((product) => product.id),
            products: products.map((product) => ({ id: product.id, sku: product.sku, name: product.name })),
          }
        : targetType === 'multiple'
          ? {
              targetType,
              productIds: selectedProducts.map((product) => product.id),
              products: selectedProducts.map((product) => ({ id: product.id, sku: product.sku, name: product.name })),
            }
        : {
            targetType,
            productId,
            sku: selectedProduct?.sku,
            name: selectedProduct?.name,
          }

    try {
      const productsToExport = productsToPreview
      const outputUrl = await createLabelPdfDataUrl({
        templateName: selectedTemplate?.name ?? 'Unknown template',
        layout: selectedTemplate?.layout,
        products: productsToExport,
        quantity,
      })

      let historySaved = true

      try {
        await createPrintJobMutation.mutateAsync({
          templateId,
          format: 'pdf',
          quantity,
          payload,
          outputUrl,
          status: 'completed',
        })
      } catch {
        historySaved = false
      }

      downloadLabelPdf(
        outputUrl,
        buildPdfFileName(
          selectedTemplate?.name,
          targetType === 'folder'
            ? selectedFolderLabel
            : targetType === 'multiple'
              ? `${selectedProducts.length}-item-batch`
              : selectedProduct?.sku ?? selectedProduct?.name,
        ),
      )
      setMessage(historySaved ? 'PDF downloaded.' : 'PDF downloaded, but the export history could not be saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to export PDF.')
    }
  }

  return (
    <div className="label-batch-layout">
      <div className="label-batch-sidebar">
        <div className="label-batch-sidebar-header">
          <h3 className="label-batch-sidebar-title">Export & Batch</h3>
          <p className="label-batch-sidebar-description">Select target products and print your labels.</p>
        </div>

        {showInitialLoading ? (
          <div className="empty-state">Loading data...</div>
        ) : (
          <>
            <section className="label-batch-section">
              <span className="label-batch-section-label">1. Select Template</span>
              <label className="flex flex-col gap-2">
                <Select
                  className="label-batch-select"
                  aria-label="Template"
                  value={templateId}
                  placeholder="Select template"
                  options={templateOptions}
                  onChange={(event) => handleTemplateChange(event.target.value)}
                />
              </label>
            </section>

            <section className="label-batch-section">
              <span className="label-batch-section-label">2. Target Selection</span>
              <div className="flex flex-col gap-3">
                <div className="label-batch-target-toggle" role="radiogroup" aria-label="Target type">
                  <Button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'single'}
                    variant={targetType === 'single' ? 'primary' : 'outline'}
                    className={`label-batch-target-button${targetType === 'single' ? ' is-active' : ''}`}
                    onClick={() => switchTargetType('single')}
                  >
                    Single
                  </Button>
                  <Button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'multiple'}
                    variant={targetType === 'multiple' ? 'primary' : 'outline'}
                    className={`label-batch-target-button${targetType === 'multiple' ? ' is-active' : ''}`}
                    onClick={() => switchTargetType('multiple')}
                  >
                    Multiple
                  </Button>
                  <Button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'folder'}
                    variant={targetType === 'folder' ? 'primary' : 'outline'}
                    className={`label-batch-target-button${targetType === 'folder' ? ' is-active' : ''}`}
                    onClick={() => switchTargetType('folder')}
                  >
                    Folder
                  </Button>
                </div>

                {targetType === 'folder' ? (
                  <>
                    <Select
                      className="label-batch-select"
                      aria-label="Folder"
                      value={folderId}
                      placeholder="Select folder"
                      options={folderOptions}
                      onChange={(event) => setFolderId(event.target.value)}
                    />
                    {selectedFolder && (
                      <div className="label-batch-folder-summary">{selectedFolderLabel} · {products.length} items</div>
                    )}
                  </>
                ) : (
                  <>
                    <Input
                      className="label-batch-search-input"
                      type="search"
                      aria-label="Product Search"
                      placeholder="Search products by SKU or Name..."
                      value={productSearch}
                      prefix={<Search size={15} />}
                      onChange={(event) => setProductSearch(event.target.value)}
                    />

                    {productSearch.trim().length > 0 ? (
                      <div className="label-batch-search-results">
                        {searchableProducts.slice(0, 6).map((product) => (
                          <Button
                            key={product.id}
                            type="button"
                            variant="ghost"
                            className="label-batch-search-result"
                            onClick={() => addProductSelection(product.id)}
                          >
                            <span className="label-batch-search-result-name">{product.name}</span>
                            <span className="label-batch-search-result-sku">{product.sku || 'No SKU'}</span>
                          </Button>
                        ))}
                        {searchableProducts.length === 0 ? <div className="label-batch-search-empty">No matching products.</div> : null}
                      </div>
                    ) : null}

                    <div
                      className={`label-batch-selected-list${targetType === 'multiple' ? ' is-scrollable' : ''}`}
                      aria-label={targetType === 'multiple' ? 'Selected products' : undefined}
                      role={targetType === 'multiple' ? 'region' : undefined}
                    >
                      {selectedListProducts.length === 0 ? (
                        <div className="label-batch-selected-empty">No products selected.</div>
                      ) : (
                        selectedListProducts.map((product) => (
                          <div key={product.id} className="label-batch-selected-item">
                            <div className="label-batch-selected-copy">
                              <span className="label-batch-selected-name" title={product.name}>{product.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="label-batch-remove-button"
                              aria-label={`Remove ${product.name}`}
                              onClick={() => removeSelectedProduct(product.id)}
                            >
                              <X size={14} aria-hidden="true" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="label-batch-section">
              <span className="label-batch-section-label">3. Print Options</span>
              <div className="label-batch-quantity-row">
                <span className="label-batch-quantity-label">Copies per item</span>
                <div className="label-batch-quantity-control">
                  <Input
                    className="label-batch-quantity-input"
                    type="number"
                    min={1}
                    aria-label="Quantity"
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  />
                </div>
              </div>
            </section>

            <Button
              type="button"
              className="label-batch-export-button"
              onClick={exportPdf}
              loading={createPrintJobMutation.isPending}
            >
              Export PDF
            </Button>
            {message ? <div className="label-batch-message">{message}</div> : null}
          </>
        )}
      </div>

      <div className="label-batch-preview-pane">
        <section className="label-batch-preview-shell">
          <div className="label-batch-preview-header">
            <span className="label-batch-preview-title">
              <Layers3 size={14} />
              A4 Layout Preview
            </span>
            <span className="label-batch-preview-page">Page 1 of {Math.max(exportPageCount, 1)}</span>
          </div>

          <div className="label-batch-preview-canvas" role="region" aria-label="PDF preview">
            <LabelPreviewCard
              className="label-batch-preview-card"
              title="A4 Layout Preview"
              templateName={selectedTemplate?.name}
              layout={selectedTemplate?.layout}
              variableFields={selectedTemplate?.variable_fields}
              quantity={quantity}
              emptyMessage="Select a template and target products to preview the PDF page."
              previewMode="page"
              products={productsToPreview}
              hideHeader
              showTemplateMeta={false}
              showVariableFields={false}
              showSummaryItems={false}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
