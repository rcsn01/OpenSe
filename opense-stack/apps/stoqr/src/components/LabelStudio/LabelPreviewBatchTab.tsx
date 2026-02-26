import { useMemo, useState } from 'react'
import { useCreateLabelPrintJob, useLabelProductFolders, useLabelProducts, useLabelTemplates } from '../../hooks/queries/useLabelStudio'
import { createLabelPdfDataUrl } from './pdfExport'

type BatchTarget = 'product' | 'folder'

export const LabelPreviewBatchTab = ({ companyId }: { companyId: string }) => {
  const { data: templates = [], isLoading: loadingTemplates } = useLabelTemplates(companyId)
  const [targetType, setTargetType] = useState<BatchTarget>('product')
  const [folderId, setFolderId] = useState('')
  const activeFolderId = targetType === 'folder' ? folderId : undefined
  const { data: products = [], isLoading: loadingProducts } = useLabelProducts(companyId, '', activeFolderId)
  const { data: folders = [], isLoading: loadingFolders } = useLabelProductFolders(companyId)
  const createPrintJobMutation = useCreateLabelPrintJob(companyId)

  const [templateId, setTemplateId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId) ?? null, [templates, templateId])
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId) ?? null, [products, productId])
  const selectedFolder = useMemo(() => folders.find((folder) => folder.id === folderId) ?? null, [folders, folderId])

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

      await createPrintJobMutation.mutateAsync({
        templateId,
        format: 'pdf',
        quantity,
        payload,
        outputUrl,
        status: 'completed',
      })
      setMessage('PDF exported. Open the Downloads tab to download it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to export PDF.')
    }
  }

  return (
    <div className="card stack">
      <h3 className="section-title">Preview & Batch</h3>
      {loadingTemplates || loadingProducts || loadingFolders ? (
          <div className="empty-state">Loading data...</div>
        ) : (
          <>
            <label className="stack">
              Template
              <select className="select" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
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
  )
}
