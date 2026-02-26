import { useMemo, useState } from 'react'
import { useLabelTemplates, useUpdateLabelTemplateLayout } from '../../hooks/queries/useLabelStudio'

type LayoutControls = {
  width: number
  height: number
  fontSize: number
  showBarcode: boolean
  showQr: boolean
  showSku: boolean
  showName: boolean
  showPrice: boolean
}

const defaultControls: LayoutControls = {
  width: 100,
  height: 50,
  fontSize: 12,
  showBarcode: true,
  showQr: false,
  showSku: true,
  showName: true,
  showPrice: false,
}

const controlsFromLayout = (layout: Record<string, unknown> | null | undefined): LayoutControls => {
  const nextControls: LayoutControls = { ...defaultControls }
  if (!layout || typeof layout !== 'object') return nextControls

  if (typeof layout.width === 'number') nextControls.width = layout.width
  if (typeof layout.height === 'number') nextControls.height = layout.height
  if (typeof layout.fontSize === 'number') nextControls.fontSize = layout.fontSize
  if (typeof layout.showBarcode === 'boolean') nextControls.showBarcode = layout.showBarcode
  if (typeof layout.showQr === 'boolean') nextControls.showQr = layout.showQr
  if (typeof layout.showSku === 'boolean') nextControls.showSku = layout.showSku
  if (typeof layout.showName === 'boolean') nextControls.showName = layout.showName
  if (typeof layout.showPrice === 'boolean') nextControls.showPrice = layout.showPrice

  return nextControls
}

const controlsToLayout = (controls: LayoutControls): Record<string, unknown> => ({
  width: controls.width,
  height: controls.height,
  fontSize: controls.fontSize,
  showBarcode: controls.showBarcode,
  showQr: controls.showQr,
  showSku: controls.showSku,
  showName: controls.showName,
  showPrice: controls.showPrice,
})

export const LabelDesignerTab = ({ companyId }: { companyId: string }) => {
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [controls, setControls] = useState<LayoutControls>(defaultControls)
  const [message, setMessage] = useState<string | null>(null)
  const updateLayoutMutation = useUpdateLabelTemplateLayout(companyId)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )

  const onTemplateChange = (id: string) => {
    setSelectedTemplateId(id)
    const template = templates.find((entry) => entry.id === id)
    setControls(controlsFromLayout(template?.layout))
    setMessage(null)
  }

  const saveLayout = async () => {
    setMessage(null)
    if (!selectedTemplate) {
      setMessage('Select a template first.')
      return
    }

    try {
      await updateLayoutMutation.mutateAsync({
        templateId: selectedTemplate.id,
        layout: controlsToLayout(controls),
        variableFields: selectedTemplate.variable_fields,
      })
      setMessage('Design saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save design.')
    }
  }

  const toggleControl = (field: keyof LayoutControls) => {
    setControls((currentControls) => ({ ...currentControls, [field]: !currentControls[field] }))
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
              Label Width (mm)
              <input
                className="input"
                type="number"
                min={20}
                value={controls.width}
                onChange={(event) => setControls((currentControls) => ({ ...currentControls, width: Number(event.target.value) || 20 }))}
              />
            </label>

            <label className="stack">
              Label Height (mm)
              <input
                className="input"
                type="number"
                min={20}
                value={controls.height}
                onChange={(event) => setControls((currentControls) => ({ ...currentControls, height: Number(event.target.value) || 20 }))}
              />
            </label>

            <label className="stack">
              Font Size (pt)
              <input
                className="input"
                type="number"
                min={8}
                value={controls.fontSize}
                onChange={(event) => setControls((currentControls) => ({ ...currentControls, fontSize: Number(event.target.value) || 8 }))}
              />
            </label>

            <div className="stack">
              <label className="flex-between" style={{ alignItems: 'center' }}>
                <span>Show Name</span>
                <input type="checkbox" checked={controls.showName} onChange={() => toggleControl('showName')} />
              </label>
              <label className="flex-between" style={{ alignItems: 'center' }}>
                <span>Show SKU</span>
                <input type="checkbox" checked={controls.showSku} onChange={() => toggleControl('showSku')} />
              </label>
              <label className="flex-between" style={{ alignItems: 'center' }}>
                <span>Show Price</span>
                <input type="checkbox" checked={controls.showPrice} onChange={() => toggleControl('showPrice')} />
              </label>
              <label className="flex-between" style={{ alignItems: 'center' }}>
                <span>Show Barcode</span>
                <input type="checkbox" checked={controls.showBarcode} onChange={() => toggleControl('showBarcode')} />
              </label>
              <label className="flex-between" style={{ alignItems: 'center' }}>
                <span>Show QR</span>
                <input type="checkbox" checked={controls.showQr} onChange={() => toggleControl('showQr')} />
              </label>
            </div>

          <div className="small muted">
              Variables: {selectedTemplate ? selectedTemplate.variable_fields.join(', ') : 'Select a template'}
          </div>

            <button className="button" onClick={saveLayout} disabled={updateLayoutMutation.isPending}>Save Design</button>
          {message && <div className="small muted">{message}</div>}
        </>
      )}
      </div>

      <div className="card stack">
        <h3 className="section-title">GUI Preview</h3>
        {!selectedTemplateId ? (
          <div className="empty-state">Select a template to preview design settings.</div>
        ) : (
          <>
            <div className="small muted">Template: {selectedTemplate?.name ?? 'Unknown'}</div>
            <div className="small muted">Size: {controls.width}mm × {controls.height}mm</div>
            <div className="small muted">Font: {controls.fontSize}pt</div>
            <div className="small muted">
              Fields: {[
                controls.showName ? 'Name' : null,
                controls.showSku ? 'SKU' : null,
                controls.showPrice ? 'Price' : null,
                controls.showBarcode ? 'Barcode' : null,
                controls.showQr ? 'QR' : null,
              ].filter(Boolean).join(', ') || 'None'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
