import { useMemo, useState } from 'react'
import { useLabelTemplates, useUpdateLabelTemplateLayout } from '../../hooks/queries/useLabelStudio'

export const LabelDesignerTab = ({ companyId }: { companyId: string }) => {
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [layoutText, setLayoutText] = useState('{}')
  const [message, setMessage] = useState<string | null>(null)
  const updateLayoutMutation = useUpdateLabelTemplateLayout(companyId)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )

  const onTemplateChange = (id: string) => {
    setSelectedTemplateId(id)
    const template = templates.find((entry) => entry.id === id)
    setLayoutText(JSON.stringify(template?.layout ?? {}, null, 2))
    setMessage(null)
  }

  const saveLayout = async () => {
    setMessage(null)
    if (!selectedTemplate) {
      setMessage('Select a template first.')
      return
    }

    try {
      const parsed = JSON.parse(layoutText)
      await updateLayoutMutation.mutateAsync({
        templateId: selectedTemplate.id,
        layout: parsed,
        variableFields: selectedTemplate.variable_fields,
      })
      setMessage('Layout saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invalid layout JSON.')
    }
  }

  return (
    <div className="card stack">
      <h3 className="section-title">Label Designer</h3>
      {isLoading ? (
        <div className="empty-state">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">Create a template first in the Templates tab.</div>
      ) : (
        <>
          <label className="stack">
            Template
            <select className="select" value={selectedTemplateId} onChange={(event) => onTemplateChange(event.target.value)}>
              <option value="">Select template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <label className="stack">
            Layout JSON
            <textarea
              className="input"
              style={{ minHeight: 280, fontFamily: 'monospace' }}
              value={layoutText}
              onChange={(event) => setLayoutText(event.target.value)}
            />
          </label>

          <div className="small muted">
            Variables: {selectedTemplate ? selectedTemplate.variable_fields.join(', ') : 'Select a template'}
          </div>

          <button className="button" onClick={saveLayout} disabled={updateLayoutMutation.isPending}>Save Layout</button>
          {message && <div className="small muted">{message}</div>}
        </>
      )}
    </div>
  )
}
