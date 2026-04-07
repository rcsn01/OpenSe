import { useEffect, useMemo, useState } from 'react'
import { useCreateLabelPrintJob, useLabelProductFolders, useLabelProducts, useLabelTemplates } from '../../hooks/queries/useLabelStudio'
import { LabelDownloadsTab } from './LabelDownloadsTab'
import { downloadLabelPdf } from './downloadLabelPdf'
import { createLabelPdfDataUrl } from './pdfExport'

type BatchTarget = 'product' | 'folder'

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

export const LabelPreviewBatchTab = ({ companyId, selectedTemplateId: initialSelectedTemplateId, onSelectedTemplateChange }: LabelPreviewBatchTabProps) => {
  const { data: templates = [], isLoading: loadingTemplates } = useLabelTemplates(companyId)
  const [targetType, setTargetType] = useState<BatchTarget>('product')
  const [folderId, setFolderId] = useState('')
  const activeFolderId = targetType === 'folder' ? folderId : undefined
  const { data: products = [], isLoading: loadingProducts } = useLabelProducts(companyId, '', activeFolderId)
  const { data: folders = [], isLoading: loadingFolders } = useLabelProductFolders(companyId)
  const createPrintJobMutation = useCreateLabelPrintJob(companyId)

  const [templateId, setTemplateId] = useState(initialSelectedTemplateId ?? '')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId) ?? null, [templates, templateId])
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId) ?? null, [products, productId])
  const selectedFolder = useMemo(() => folders.find((folder) => folder.id === folderId) ?? null, [folders, folderId])

  const batchCount = useMemo(() => {
    const items = targetType === 'folder' ? products.length : (productId ? 1 : 0)
    return items * quantity
  }, [targetType, products.length, productId, quantity])

  useEffect(() => {
    setTemplateId(initialSelectedTemplateId ?? '')
  }, [initialSelectedTemplateId])

  const handleTemplateChange = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId)
    onSelectedTemplateChange?.(nextTemplateId)
    setMessage(null)
  }

  const exportPdf = async () => {
    setMessage(null)
    if (!templateId || quantity < 1) {
      setMessage('Select template and valid quantity.')
      return
    }

    if (targetType === 'product' && !productId) {
      setMessage('Select a product.')
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
        : {
            targetType,
            productId,
            sku: selectedProduct?.sku,
            name: selectedProduct?.name,
          }

    try {
      const productsToExport = targetType === 'folder' ? products : selectedProduct ? [selectedProduct] : []
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
          targetType === 'folder' ? selectedFolder?.name : selectedProduct?.sku ?? selectedProduct?.name,
        ),
      )
      setMessage(historySaved ? 'PDF downloaded.' : 'PDF downloaded, but the export history could not be saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to export PDF.')
    }
  }

  return (
    <div className="export-layout">
      <div className="card stack export-config-card">
        <div>
          <h3 className="section-title" style={{ marginBottom: 4 }}>Export Configuration</h3>
          <p className="small muted" style={{ margin: 0 }}>Set up your batch print job.</p>
        </div>
        {loadingTemplates || loadingProducts || loadingFolders ? (
          <div className="empty-state">Loading data...</div>
        ) : (
          <>
            <div className="export-step">
              <span className="export-step-number">1</span>
              <label className="stack" style={{ gap: 8, flex: 1 }}>
                <span className="export-step-label">Select Template</span>
                <select className="select" aria-label="Template" value={templateId} onChange={(event) => handleTemplateChange(event.target.value)}>
                  <option value="">Select template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="export-step">
              <span className="export-step-number">2</span>
              <div className="stack" style={{ gap: 8, flex: 1 }}>
                <span className="export-step-label">Target Data</span>
                <div className="export-toggle-group" role="radiogroup" aria-label="Target type">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'product'}
                    className={`export-toggle-btn${targetType === 'product' ? ' active' : ''}`}
                    onClick={() => {
                      setTargetType('product')
                      setMessage(null)
                      setProductId('')
                      setFolderId('')
                    }}
                  >
                    Single Product
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetType === 'folder'}
                    className={`export-toggle-btn${targetType === 'folder' ? ' active' : ''}`}
                    onClick={() => {
                      setTargetType('folder')
                      setMessage(null)
                      setProductId('')
                    }}
                  >
                    Entire Folder
                  </button>
                </div>

                {targetType === 'folder' ? (
                  <>
                    <select className="select" aria-label="Folder" value={folderId} onChange={(event) => setFolderId(event.target.value)}>
                      <option value="">Select folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    {selectedFolder && (
                      <span className="export-folder-chip">
                        {selectedFolder.name} · {products.length} items 📁
                      </span>
                    )}
                  </>
                ) : (
                  <select className="select" aria-label="Product" value={productId} onChange={(event) => setProductId(event.target.value)}>
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="export-step">
              <span className="export-step-number">3</span>
              <div className="stack" style={{ gap: 8, flex: 1 }}>
                <span className="export-step-label">Copies per item</span>
                <div className="export-stepper">
                  <button type="button" className="export-stepper-btn" aria-label="Decrease quantity" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>−</button>
                  <input
                    className="export-stepper-value"
                    type="number"
                    min={1}
                    aria-label="Quantity"
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  />
                  <button type="button" className="export-stepper-btn" aria-label="Increase quantity" onClick={() => setQuantity((prev) => prev + 1)}>+</button>
                </div>
              </div>
            </div>

            <button className="button export-batch-btn" onClick={exportPdf} disabled={createPrintJobMutation.isPending}>
              <span className="export-batch-btn-icon">⬇</span>
              Export PDF Batch
            </button>
            {batchCount > 0 && (
              <p className="small muted" style={{ textAlign: 'center', margin: 0 }}>
                Generates a {batchCount}-page PDF document
              </p>
            )}
            {message && <div className="small muted" style={{ textAlign: 'center' }}>{message}</div>}
          </>
        )}
      </div>

      <div className="stack export-right-panel">
        <div className="card export-preview-card">
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Live Preview</h3>
            {batchCount > 0 && <span className="badge neutral">BATCH OF {batchCount}</span>}
          </div>
          <div className="export-preview-canvas">
            {selectedTemplate ? (
              <div className="export-preview-label">
                <span className="export-preview-tag">PREVIEWING</span>
                <span className="export-preview-name" title={selectedTemplate.name}>{selectedTemplate.name}</span>
                <div className="export-preview-placeholder-lines">
                  <div className="export-preview-line" style={{ width: '80%' }} />
                  <div className="export-preview-line" style={{ width: '60%' }} />
                </div>
                <div className="export-preview-barcode" aria-label="Barcode preview">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="export-preview-bar" style={{ width: i % 3 === 0 ? 3 : 1 }} />
                  ))}
                </div>
                {quantity > 0 && <span className="export-preview-qty">x{quantity}</span>}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>Select a template to preview</div>
            )}
          </div>
        </div>

        <LabelDownloadsTab
          companyId={companyId}
          title="Recent Exports"
          emptyStateMessage="No PDF exports yet. Export one here to download it immediately."
        />
      </div>
    </div>
  )
}
