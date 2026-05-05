import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, Eye, QrCode, ScanBarcode, Type } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLabelTemplates, useUpdateLabelTemplateLayout } from '../../hooks/queries/useLabelStudio'
import { LabelPreviewCard } from './LabelPreviewCard'
import {
  controlsToLayout,
  getMaxQrScale,
  QR_SCALE_MIN,
  resolveLabelLayout,
  type LabelLayoutControls,
} from './labelLayout'

type ToggleField = 'showName' | 'showSku' | 'showPrice' | 'showBarcode' | 'showQr' | 'showBorder'

const alignmentOptions: Array<{
  value: LabelLayoutControls['textAlign']
  label: string
  icon: typeof AlignLeft
}> = [
  { value: 'left', label: 'Left aligned', icon: AlignLeft },
  { value: 'center', label: 'Center aligned', icon: AlignCenter },
  { value: 'right', label: 'Right aligned', icon: AlignRight },
]

const visibilityOptions: Array<{ key: Extract<ToggleField, 'showName' | 'showSku' | 'showPrice' | 'showBorder'>; label: string; description: string }> = [
  { key: 'showName', label: 'Product Name', description: 'Show the primary product title on label.' },
  { key: 'showSku', label: 'SKU / Article No.', description: 'Show the stock code under the product name.' },
  { key: 'showPrice', label: 'Price Field', description: 'Show the product selling price in the preview.' },
  { key: 'showBorder', label: 'Label Border', description: 'Render the printed border around the label.' },
]

const identifierOptions: Array<{ key: Extract<ToggleField, 'showBarcode' | 'showQr'>; label: string; description: string }> = [
  { key: 'showBarcode', label: 'Barcode (1D)', description: 'Enable the linear barcode block on the label.' },
  { key: 'showQr', label: 'QR Code (2D)', description: 'Enable the QR code block on the label.' },
]

const previewSample = {
  id: 'premium-wireless-headphones',
  name: 'Premium Wireless Headphones',
  sku: 'AUDIO-WH-01',
  selling_price: 299,
}

type LabelDesignerTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectedTemplateChange?: (templateId: string) => void
  onClose?: () => void
}

type SwitchRowProps = {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}

const SwitchRow = ({ label, description, checked, onToggle }: SwitchRowProps) => (
  <button
    type="button"
    className={`label-studio-switch-row${checked ? ' is-active' : ''}`}
    role="switch"
    aria-checked={checked}
    onClick={onToggle}
  >
    <span className="label-studio-switch-copy">
      <span className="label-studio-switch-label">{label}</span>
      <span className="label-studio-switch-description">{description}</span>
    </span>
    <span className="label-studio-switch-control" aria-hidden="true">
      <span className="label-studio-switch-thumb" />
    </span>
  </button>
)

type SliderControlProps = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  ariaLabel?: string
  onChange: (value: number) => void
}

const SliderControl = ({ label, value, min, max, step = 1, ariaLabel, onChange }: SliderControlProps) => (
  <label className="label-studio-range-control">
    <div className="label-studio-range-header">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <input
      className="label-studio-range-input"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel ?? label}
      onChange={(event) => onChange(Number(event.target.value) || min)}
    />
  </label>
)

export const LabelDesignerTab = ({ companyId, selectedTemplateId: initialSelectedTemplateId, onClose }: LabelDesignerTabProps) => {
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const selectedTemplateId = initialSelectedTemplateId ?? ''
  const [controls, setControls] = useState<LabelLayoutControls>(resolveLabelLayout(null))
  const [message, setMessage] = useState<string | null>(null)
  const updateLayoutMutation = useUpdateLabelTemplateLayout(companyId)

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId]
  )
  const selectedTemplateLayoutKey = JSON.stringify(selectedTemplate?.layout ?? null)

  useEffect(() => {
    if (!selectedTemplateId) {
      setControls(resolveLabelLayout(null))
      return
    }

    setControls(resolveLabelLayout(selectedTemplate?.layout))
    setMessage(null)
  }, [selectedTemplateId, selectedTemplateLayoutKey])

  const maxQrScale = useMemo(() => getMaxQrScale(controls), [controls])
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedTemplate) return false

    return JSON.stringify(controlsToLayout(controls)) !== JSON.stringify(controlsToLayout(resolveLabelLayout(selectedTemplate.layout)))
  }, [controls, selectedTemplate, selectedTemplateLayoutKey])

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
    <div className="label-studio-designer">
      <header className="label-studio-editor-topbar">
        <div className="label-studio-editor-heading">
          <button type="button" className="label-studio-back-button" onClick={onClose} aria-label="Back to templates">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="label-studio-editor-title">{selectedTemplate?.name ?? 'Label Studio'}</h2>
            <p className="label-studio-editor-subtitle">Template Editor</p>
          </div>
        </div>

        <div className="label-studio-editor-actions">
          <button
            type="button"
            className="label-studio-text-button"
            onClick={resetToSavedLayout}
            disabled={!selectedTemplate || !hasUnsavedChanges}
          >
            Discard
          </button>
          <button
            type="button"
            className="label-studio-primary-button"
            onClick={saveLayout}
            disabled={!selectedTemplate || updateLayoutMutation.isPending}
          >
            {updateLayoutMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>

      {message ? <div className="label-studio-editor-message" role="status">{message}</div> : null}

      {isLoading ? (
        <div className="empty-state">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="empty-state">Create a template first in the Templates tab.</div>
      ) : !selectedTemplate ? (
        <div className="empty-state">Select a template from the Templates tab to open the editor.</div>
      ) : (
        <div className="label-studio-editor-grid">
          <div className="label-studio-editor-main">
            <section className="label-studio-editor-panel label-studio-editor-panel--canvas">
              <div className="label-studio-editor-panel-header">
                <span className="label-studio-editor-panel-label">
                  <Eye size={12} />
                  Live Canvas
                </span>

                <div className="label-studio-canvas-zoom" aria-label="Canvas zoom preview">
                  <button type="button" className="label-studio-canvas-zoom-button" disabled aria-hidden="true">-</button>
                  <span>100%</span>
                  <button type="button" className="label-studio-canvas-zoom-button" disabled aria-hidden="true">+</button>
                </div>
              </div>

              <div className="label-studio-canvas-area">
                <LabelPreviewCard
                  className="label-studio-designer-preview-card"
                  title="Live Canvas"
                  templateName={selectedTemplate.name}
                  layout={controls}
                  variableFields={selectedTemplate.variable_fields}
                  emptyMessage="Select a template to preview design settings."
                  sampleProduct={previewSample}
                  hideHeader
                  showTemplateMeta={false}
                  showVariableFields={false}
                  showSummaryItems={false}
                />
              </div>
            </section>

            <div className="label-studio-editor-bottom-grid">
              <section className="label-studio-editor-panel">
                <div className="label-studio-editor-panel-header">
                  <span className="label-studio-editor-panel-label">Canvas Dimensions</span>
                </div>

                <div className="label-studio-dimension-grid">
                  <label className="stack label-studio-readonly-field">
                    Display Name
                    <input className="input" value={selectedTemplate.name} readOnly />
                  </label>

                  <label className="stack">
                    Width (mm)
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
                    Height (mm)
                    <input
                      className="input"
                      type="number"
                      min={20}
                      max={200}
                      value={controls.height}
                      onChange={(event) => updateControl('height', Number(event.target.value) || 20)}
                    />
                  </label>
                </div>
              </section>

              <section className="label-studio-editor-panel">
                <div className="label-studio-editor-panel-header">
                  <span className="label-studio-editor-panel-label">Visibility Settings</span>
                </div>

                <div className="label-studio-switch-grid">
                  {visibilityOptions.map((option) => (
                    <SwitchRow
                      key={option.key}
                      label={option.label}
                      description={option.description}
                      checked={controls[option.key]}
                      onToggle={() => toggleControl(option.key)}
                    />
                  ))}
                </div>
              </section>
            </div>

            <section className="label-studio-editor-panel">
              <div className="label-studio-editor-panel-header">
                <span className="label-studio-editor-panel-label">
                  <Type size={12} />
                  Test Preview Data
                </span>
              </div>

              <div className="label-studio-preview-data-grid">
                <div className="label-studio-preview-data-item">
                  <span className="label-studio-preview-data-label">Name</span>
                  <span className="label-studio-preview-data-value">{previewSample.name}</span>
                </div>
                <div className="label-studio-preview-data-item">
                  <span className="label-studio-preview-data-label">SKU</span>
                  <span className="label-studio-preview-data-value">{previewSample.sku}</span>
                </div>
                <div className="label-studio-preview-data-item">
                  <span className="label-studio-preview-data-label">Price</span>
                  <span className="label-studio-preview-data-value">${previewSample.selling_price.toFixed(2)}</span>
                </div>
              </div>
            </section>
          </div>

          <aside className="label-studio-editor-sidebar">
            <section className="label-studio-editor-panel">
              <div className="label-studio-editor-panel-header">
                <span className="label-studio-editor-panel-label">
                  <ScanBarcode size={12} />
                  Identifiers
                </span>
              </div>

              <div className="label-studio-switch-grid">
                {identifierOptions.map((option) => (
                  <SwitchRow
                    key={option.key}
                    label={option.label}
                    description={option.description}
                    checked={controls[option.key]}
                    onToggle={() => toggleControl(option.key)}
                  />
                ))}
              </div>

              <SliderControl
                label="Barcode Scale"
                ariaLabel="Barcode Scale (%)"
                value={controls.barcodeScale}
                min={50}
                max={160}
                onChange={(value) => updateControl('barcodeScale', value)}
              />

              <SliderControl
                label="QR Code Scale"
                ariaLabel="QR Scale (%)"
                value={controls.qrScale}
                min={QR_SCALE_MIN}
                max={maxQrScale}
                onChange={(value) => updateControl('qrScale', value)}
              />
            </section>

            <section className="label-studio-editor-panel">
              <div className="label-studio-editor-panel-header">
                <span className="label-studio-editor-panel-label">
                  <QrCode size={12} />
                  Global Styling
                </span>
              </div>

              <div className="label-studio-alignment-block">
                <div className="label-studio-range-header">
                  <span>Content Alignment</span>
                </div>
                <div className="label-studio-alignment-group" role="group" aria-label="Text Alignment">
                  {alignmentOptions.map((option) => {
                    const Icon = option.icon

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`label-studio-alignment-button${controls.textAlign === option.value ? ' is-active' : ''}`}
                        aria-label={option.label}
                        aria-pressed={controls.textAlign === option.value}
                        onClick={() => updateControl('textAlign', option.value)}
                      >
                        <Icon size={16} />
                      </button>
                    )
                  })}
                </div>
              </div>

              <SliderControl
                label="Primary Font Size"
                ariaLabel="Primary Font Size"
                value={controls.fontSize}
                min={8}
                max={48}
                onChange={(value) => updateControl('fontSize', value)}
              />

              <SliderControl
                label="Canvas Padding"
                ariaLabel="Content Padding (pt)"
                value={controls.padding}
                min={4}
                max={24}
                onChange={(value) => updateControl('padding', value)}
              />

              <SliderControl
                label="Name Lines"
                ariaLabel="Name Lines"
                value={controls.nameLines}
                min={1}
                max={3}
                onChange={(value) => updateControl('nameLines', value)}
              />
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
