import { useEffect, useMemo, useState } from 'react'
import { useLabelTemplates, useUpdateLabelTemplateLayout } from '../../hooks/queries/useLabelStudio'
import { LabelPreviewCard } from './LabelPreviewCard'
import {
  controlsToLayout,
  getLabelLayoutSummary,
  getMaxQrScale,
  QR_SCALE_MIN,
  resolveLabelLayout,
  type LabelLayoutControls,
} from './labelLayout'

type ToggleField = 'showName' | 'showSku' | 'showPrice' | 'showBarcode' | 'showQr' | 'showBorder'

const sizePresets = [
  { label: 'Compact', description: '60 x 30 mm', width: 60, height: 30 },
  { label: 'Shelf', description: '100 x 50 mm', width: 100, height: 50 },
  { label: 'Shipping', description: '100 x 75 mm', width: 100, height: 75 },
  { label: 'Bin', description: '150 x 100 mm', width: 150, height: 100 },
]

const fieldOptions: Array<{ key: ToggleField; label: string; description: string }> = [
  { key: 'showName', label: 'Name', description: 'Product title line' },
  { key: 'showSku', label: 'SKU', description: 'Stock code line' },
  { key: 'showPrice', label: 'Price', description: 'Selling price line' },
  { key: 'showBarcode', label: 'Barcode', description: 'Machine-readable barcode' },
  { key: 'showQr', label: 'QR', description: 'Compact QR code block' },
  { key: 'showBorder', label: 'Border', description: 'Printed label outline' },
]

type LabelDesignerTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectedTemplateChange?: (templateId: string) => void
}

export const LabelDesignerTab = ({ companyId, selectedTemplateId: initialSelectedTemplateId, onSelectedTemplateChange }: LabelDesignerTabProps) => {
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialSelectedTemplateId ?? '')
  const [controls, setControls] = useState<LabelLayoutControls>(resolveLabelLayout(null))
  const [message, setMessage] = useState<string | null>(null)
  const updateLayoutMutation = useUpdateLabelTemplateLayout(companyId)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )
  const selectedTemplateLayoutKey = JSON.stringify(selectedTemplate?.layout ?? null)

  useEffect(() => {
    setSelectedTemplateId(initialSelectedTemplateId ?? '')
  }, [initialSelectedTemplateId])

  useEffect(() => {
    if (!selectedTemplateId) {
      setControls(resolveLabelLayout(null))
      return
    }

    setControls(resolveLabelLayout(selectedTemplate?.layout))
    setMessage(null)
  }, [selectedTemplateId, selectedTemplateLayoutKey])

  const previewSummaryItems = useMemo(
    () => {
      const summary = getLabelLayoutSummary(controls)

      return [
        { label: 'Size', value: summary.size },
        { label: 'Type', value: summary.type },
        { label: 'Fields', value: summary.fields },
      ]
    },
    [controls],
  )
  const maxQrScale = useMemo(() => getMaxQrScale(controls), [controls])

  const onTemplateChange = (id: string) => {
    setSelectedTemplateId(id)
    onSelectedTemplateChange?.(id)
    setMessage(null)
  }

  const updateControl = <TKey extends keyof LabelLayoutControls>(field: TKey, value: LabelLayoutControls[TKey]) => {
    setControls((currentControls) => resolveLabelLayout({ ...currentControls, [field]: value }))
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

  const toggleControl = (field: ToggleField) => {
    updateControl(field, !controls[field])
  }

  const resetToSavedLayout = () => {
    setControls(resolveLabelLayout(selectedTemplate?.layout))
    setMessage(null)
  }

  return (
    <div className="label-designer-layout">
      <div className="card stack label-designer-card">
        <div className="label-designer-header">
          <div>
            <h3 className="section-title" style={{ marginBottom: 4 }}>Label Designer</h3>
            <p className="small muted" style={{ margin: 0 }}>Adjust sizing, spacing, field visibility, and machine-readable elements.</p>
          </div>
          <button className="button ghost small" type="button" onClick={resetToSavedLayout} disabled={!selectedTemplate}>
            Reset to saved
          </button>
        </div>
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

            <section className="label-designer-section">
              <div>
                <h4 className="label-designer-section-title">Size presets</h4>
                <p className="small muted" style={{ margin: 0 }}>Start with a common format, then tune the details below.</p>
              </div>
              <div className="label-designer-preset-grid">
                {sizePresets.map((preset) => {
                  const isActive = controls.width === preset.width && controls.height === preset.height
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      className={`label-designer-preset${isActive ? ' is-active' : ''}`}
                      onClick={() => {
                        updateControl('width', preset.width)
                        updateControl('height', preset.height)
                      }}
                    >
                      <span className="label-designer-preset-title">{preset.label}</span>
                      <span className="small muted">{preset.description}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="label-designer-section">
              <div>
                <h4 className="label-designer-section-title">Canvas</h4>
                <p className="small muted" style={{ margin: 0 }}>Control label size, spacing, and text flow.</p>
              </div>
              <div className="grid grid-2 label-designer-control-grid">
                <label className="stack">
                  Label Width (mm)
                  <input
                    className="input"
                    type="number"
                    min={20}
                    max={200}
                    value={controls.width}
                    onChange={(event) => updateControl('width', Number(event.target.value) || 20)}
                  />
                </label>

                <label className="stack">
                  Label Height (mm)
                  <input
                    className="input"
                    type="number"
                    min={20}
                    max={200}
                    value={controls.height}
                    onChange={(event) => updateControl('height', Number(event.target.value) || 20)}
                  />
                </label>

                <label className="stack">
                  Font Size (pt)
                  <input
                    className="input"
                    type="number"
                    min={8}
                    max={48}
                    value={controls.fontSize}
                    onChange={(event) => updateControl('fontSize', Number(event.target.value) || 8)}
                  />
                </label>

                <label className="stack">
                  Content Padding (pt)
                  <input
                    className="input"
                    type="number"
                    min={4}
                    max={24}
                    value={controls.padding}
                    onChange={(event) => updateControl('padding', Number(event.target.value) || 4)}
                  />
                </label>

                <label className="stack">
                  Name Lines
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={3}
                    value={controls.nameLines}
                    onChange={(event) => updateControl('nameLines', Number(event.target.value) || 1)}
                  />
                </label>

                <label className="stack">
                  Text Alignment
                  <select className="select" value={controls.textAlign} onChange={(event) => updateControl('textAlign', event.target.value as LabelLayoutControls['textAlign'])}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="label-designer-section">
              <div>
                <h4 className="label-designer-section-title">Machine-readable</h4>
                <p className="small muted" style={{ margin: 0 }}>Scale barcode and QR blocks without changing the label size.</p>
              </div>
              <div className="grid grid-2 label-designer-control-grid">
                <label className="stack">
                  Barcode Scale (%)
                  <input
                    className="input"
                    type="number"
                    min={50}
                    max={160}
                    value={controls.barcodeScale}
                    onChange={(event) => updateControl('barcodeScale', Number(event.target.value) || 50)}
                  />
                </label>

                <label className="stack">
                  QR Scale (%)
                  <div className="label-designer-slider-shell">
                    <div className="label-designer-slider-header">
                      <span className="small muted">Current</span>
                      <span className="small muted">{controls.qrScale}%</span>
                    </div>
                    <input
                      className="label-designer-slider"
                      type="range"
                      aria-label="QR Scale (%)"
                      min={QR_SCALE_MIN}
                      max={maxQrScale}
                      step={1}
                      value={controls.qrScale}
                      onChange={(event) => updateControl('qrScale', Number(event.target.value) || QR_SCALE_MIN)}
                    />
                    <div className="label-designer-slider-values small muted">
                      <span>{QR_SCALE_MIN}%</span>
                      <span>{maxQrScale}%</span>
                    </div>
                  </div>
                </label>
              </div>
            </section>

            <section className="label-designer-section">
              <div>
                <h4 className="label-designer-section-title">Visible fields</h4>
                <p className="small muted" style={{ margin: 0 }}>Turn each piece of label content on or off for this template.</p>
              </div>
              <div className="label-designer-field-grid">
                {fieldOptions.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    className={`label-designer-field-toggle${controls[field.key] ? ' is-active' : ''}`}
                    aria-pressed={controls[field.key]}
                    onClick={() => toggleControl(field.key)}
                  >
                    <span className="label-designer-field-title">{field.label}</span>
                    <span className="small muted">{field.description}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="label-designer-footer">
              <div className="stack" style={{ gap: 8 }}>
                <span className="small muted">Available variables</span>
                <div className="row wrap">
                  {(selectedTemplate?.variable_fields ?? []).map((field) => (
                    <span key={field} className="pill">{field}</span>
                  ))}
                  {!selectedTemplate ? <span className="small muted">Select a template</span> : null}
                </div>
              </div>

              <div className="row wrap">
                <button className="button secondary" type="button" onClick={resetToSavedLayout} disabled={!selectedTemplate}>
                  Reset
                </button>
                <button className="button" onClick={saveLayout} disabled={updateLayoutMutation.isPending}>Save Design</button>
              </div>
            </div>

            {message ? <div className="small muted">{message}</div> : null}
          </>
        )}
      </div>

      <LabelPreviewCard
        title="Live Design Preview"
        description="Every change renders here before you save it to the template."
        templateName={selectedTemplate?.name}
        layout={controls}
        variableFields={selectedTemplate?.variable_fields}
        emptyMessage="Select a template to preview design settings."
        summaryItems={selectedTemplateId ? previewSummaryItems : undefined}
      />
    </div>
  )
}
