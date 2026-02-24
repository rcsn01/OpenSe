import { useMemo, useState } from 'react'
import { useCreateLabelPrintJob, useLabelPrintJobs, useLabelProducts, useLabelTemplates } from '../../hooks/queries/useLabelStudio'

export const LabelPreviewBatchTab = ({ companyId }: { companyId: string }) => {
  const { data: templates = [], isLoading: loadingTemplates } = useLabelTemplates(companyId)
  const { data: products = [], isLoading: loadingProducts } = useLabelProducts(companyId, '')
  const { data: printJobs = [], isLoading: loadingJobs } = useLabelPrintJobs(companyId)
  const createPrintJobMutation = useCreateLabelPrintJob(companyId)

  const [templateId, setTemplateId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)

  const selectedTemplate = useMemo(() => templates.find((template) => template.id === templateId) ?? null, [templates, templateId])
  const selectedProduct = useMemo(() => products.find((product) => product.id === productId) ?? null, [products, productId])

  const createPrintJob = async () => {
    setMessage(null)
    if (!templateId || !productId || quantity < 1) {
      setMessage('Select template, product, and valid quantity.')
      return
    }

    try {
      await createPrintJobMutation.mutateAsync({
        templateId,
        format: 'pdf',
        quantity,
        payload: {
          productId,
          sku: selectedProduct?.sku,
          name: selectedProduct?.name,
        },
      })
      setMessage('Batch print job queued.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to queue print job.')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Preview & Batch Print</h3>
        {loadingTemplates || loadingProducts ? (
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
              Preview: {selectedTemplate ? selectedTemplate.name : 'No template'} · {selectedProduct ? selectedProduct.name : 'No product'} · x{quantity}
            </div>

            <button className="button" onClick={createPrintJob} disabled={createPrintJobMutation.isPending}>Queue Print Job</button>
            {message && <div className="small muted">{message}</div>}
          </>
        )}
      </div>

      <div className="card stack">
        <h3 className="section-title">Recent Print Jobs</h3>
        {loadingJobs ? (
          <div className="empty-state">Loading print jobs...</div>
        ) : printJobs.length === 0 ? (
          <div className="empty-state">No print jobs yet.</div>
        ) : (
          <div className="list">
            {printJobs.map((job) => (
              <div key={job.id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{job.status.toUpperCase()}</div>
                  <div className="small muted">{job.quantity} labels · {new Date(job.created_at).toLocaleString()}</div>
                </div>
                <span className="pill">{job.template_id ? 'Template' : 'Custom'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
