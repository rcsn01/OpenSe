import { useState } from 'react'
import { useCreateLabelTemplate, useLabelTemplates } from '../../hooks/queries/useLabelStudio'

type TemplateLibraryTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectTemplate?: (templateId: string) => void
}

export const TemplateLibraryTab = ({ companyId, selectedTemplateId, onSelectTemplate }: TemplateLibraryTabProps) => {
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const createTemplateMutation = useCreateLabelTemplate(companyId)
  const [name, setName] = useState('')
  const [templateType, setTemplateType] = useState<'product' | 'shelf' | 'bin' | 'shipping'>('product')
  const [message, setMessage] = useState<string | null>(null)

  const createTemplate = async () => {
    setMessage(null)
    if (!name.trim()) {
      setMessage('Template name is required.')
      return
    }

    try {
      await createTemplateMutation.mutateAsync({
        name: name.trim(),
        templateType,
        layout: {},
        variableFields: ['barcode', 'sku', 'name', 'price', 'qr'],
      })
      setName('')
      setMessage('Template created. Select it from the library to design it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create template.')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Create Template</h3>
        <label className="stack">
          Template Name
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Product Default" />
        </label>
        <label className="stack">
          Type
          <select className="select" value={templateType} onChange={(event) => setTemplateType(event.target.value as 'product' | 'shelf' | 'bin' | 'shipping')}>
            <option value="product">Product</option>
            <option value="shelf">Shelf</option>
            <option value="bin">Bin</option>
            <option value="shipping">Shipping</option>
          </select>
        </label>
        <button className="button" onClick={createTemplate} disabled={createTemplateMutation.isPending}>Create Template</button>
        {message && <div className="small muted">{message}</div>}
      </div>

      <div className="card stack">
        <h3 className="section-title">Template Library</h3>
        {isLoading ? (
          <div className="empty-state">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="empty-state">No templates found.</div>
        ) : (
          <div className="list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className="flex-between"
                onClick={() => onSelectTemplate?.(template.id)}
                aria-label={`Edit ${template.name} template`}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  background: 'transparent',
                  textAlign: 'left',
                  gap: 12,
                  cursor: 'pointer',
                  color: 'inherit',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'var(--type-weight-bold)' }}>
                    <span>{template.name}</span>
                    {selectedTemplateId === template.id ? <span className="pill">Editing</span> : null}
                  </div>
                  <div className="small muted">{template.template_type} · {template.is_system ? 'System' : 'Custom'}</div>
                </div>
                <span className="pill">{template.variable_fields.length} vars</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
