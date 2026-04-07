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
    <div className="grid" style={{ gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Preview & Batch</h3>
        {loadingTemplates || loadingProducts || loadingFolders ? (
          <div className="empty-state">Loading data...</div>
        ) : (
          <>
            <label className="stack">
              Template
              <select className="select" value={templateId} onChange={(event) => handleTemplateChange(event.target.value)}>
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="stack">
              Scope
              <select
                className="select"
                value={targetType}
                onChange={(event) => {
                  const nextType = event.target.value as BatchTarget
                  setTargetType(nextType)
                  setMessage(null)
                  setProductId('')
                  if (nextType === 'product') {
                    setFolderId('')
                  }
                }}
              >
                <option value="product">Single Product</option>
                <option value="folder">Entire Folder</option>
              </select>
            </label>

            {targetType === 'folder' ? (
              <label className="stack">
                Folder
                <select className="select" value={folderId} onChange={(event) => setFolderId(event.target.value)}>
                  <option value="">Select folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {targetType === 'product' ? (
              <label className="stack">
                Product
                <select className="select" value={productId} onChange={(event) => setProductId(event.target.value)}>
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="small muted">Products in folder: {products.length}</div>
            )}

            <label className="stack">
              Quantity
              <input
                className="input"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </label>

            <div className="small muted">
              Preview: {selectedTemplate ? selectedTemplate.name : 'No template'} ·{' '}
              {targetType === 'product'
                ? selectedProduct?.name ?? 'No product'
                : selectedFolder
                  ? `${selectedFolder.name} (${products.length} products)`
                  : 'No folder'} · x{quantity}
            </div>

            <button className="button" onClick={exportPdf} disabled={createPrintJobMutation.isPending}>Export PDF</button>
            {message && <div className="small muted">{message}</div>}
          </>
        )}
      </div>

      <LabelDownloadsTab
        companyId={companyId}
        title="Recent Downloads"
        emptyStateMessage="No PDF exports yet. Export one here to download it immediately."
      />
    </div>
  )
}
