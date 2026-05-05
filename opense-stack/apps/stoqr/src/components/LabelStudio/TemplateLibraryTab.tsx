import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Package2, Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@repo/ui'
import { useOutletContext } from 'react-router-dom'
import { useCreateLabelTemplate, useLabelTemplates } from '../../hooks/queries/useLabelStudio'
import { getEnabledLabelFields, getLabelLayoutSummary, resolveLabelLayout } from './labelLayout'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'
import type { AppLayoutOutletContext } from '../../layouts/AppLayout'

type TemplateLibraryTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectTemplate?: (templateId: string) => void
  searchTerm?: string
}

type TemplateTableRow = {
  id: string
  name: string
  dimensionsLabel: string
  activeFields: string[]
  lastModifiedLabel: string
  isSelected: boolean
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 7) return `${Math.max(diffDays, 1)} ${diffDays === 1 ? 'day' : 'days'} ago`
  if (diffWeeks < 5) return `${Math.max(diffWeeks, 1)} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`
  if (diffMonths < 12) return `${Math.max(diffMonths, 1)} ${diffMonths === 1 ? 'month' : 'months'} ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatDimensions = (layout: Record<string, unknown>) => {
  const controls = resolveLabelLayout(layout)
  return `${controls.width}x${controls.height}mm`
}

export const TemplateLibraryTab = ({ companyId, selectedTemplateId, onSelectTemplate, searchTerm = '' }: TemplateLibraryTabProps) => {
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const createTemplateMutation = useCreateLabelTemplate(companyId)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const filteredTemplates = useMemo(() => fuzzySearchItems(templates, normalizePageSearchTerm(searchTerm), [
    {
      key: (template) => template.name,
      maxRanking: fuzzyRankings.WORD_STARTS_WITH,
    },
    {
      key: (template) => {
        const summary = getLabelLayoutSummary(template.layout)
        return [summary.size, summary.type, summary.fields]
      },
      maxRanking: fuzzyRankings.CONTAINS,
    },
  ]), [searchTerm, templates])
  const tableRows = useMemo<TemplateTableRow[]>(() => filteredTemplates.map((template) => {
    const controls = resolveLabelLayout(template.layout)

    return {
      id: template.id,
      name: template.name,
      dimensionsLabel: formatDimensions(template.layout),
      activeFields: getEnabledLabelFields(controls),
      lastModifiedLabel: formatDate(template.updated_at ?? template.created_at),
      isSelected: selectedTemplateId === template.id,
    }
  }), [filteredTemplates, selectedTemplateId])
  const columns = useMemo<DataTableColumn<TemplateTableRow>[]>(() => [
    {
      id: 'templateName',
      header: 'Template Name',
      renderCell: (row) => (
        <div className="label-template-name-cell">
          <span className="label-template-name-icon" aria-hidden="true">
            <Package2 size={14} />
          </span>
          <div className="label-template-name-copy">
            <div className="label-template-name-row">
              <button
                type="button"
                className="label-template-name-button"
                onClick={() => onSelectTemplate?.(row.id)}
                aria-label={`Edit ${row.name} template`}
              >
                <span className="label-template-name">{row.name}</span>
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'dimensions',
      header: 'Dimensions',
      renderCell: (row) => row.dimensionsLabel,
    },
    {
      id: 'activeFields',
      header: 'Active Fields',
      renderCell: (row) => (
        <div className="label-template-field-list">
          {row.activeFields.map((field) => (
            <span key={field} className="label-template-field-pill">{field}</span>
          ))}
        </div>
      ),
    },
    {
      id: 'lastModified',
      header: 'Last Modified',
      renderCell: (row) => row.lastModifiedLabel,
    },
    {
      id: 'actions',
      header: 'Actions',
      renderCell: (row) => (
        <button
          type="button"
          className="label-template-action"
          aria-label={`Template actions for ${row.name}`}
          onClick={() => onSelectTemplate?.(row.id)}
        >
          <MoreHorizontal size={16} />
        </button>
      ),
    },
  ], [onSelectTemplate])

  useEffect(() => {
    layoutContext?.setTopBarSearchConfig({
      suggestions: filteredTemplates.slice(0, 8).map((template) => {
        const summary = getLabelLayoutSummary(template.layout)
        return {
          id: `label-template-${template.id}`,
          title: template.name,
          subtitle: `${summary.size} · ${summary.type}`,
          value: template.name,
          badge: 'Template',
        }
      }),
      onSuggestionSelect: (suggestion) => {
        const matchedTemplate = templates.find((template) => template.name === suggestion.value)
        if (matchedTemplate) {
          onSelectTemplate?.(matchedTemplate.id)
        }
      },
    })
  }, [filteredTemplates, layoutContext, onSelectTemplate, templates])

  const createTemplate = async () => {
    setMessage(null)
    if (!name.trim()) {
      setMessage('Template name is required.')
      return
    }

    try {
      await createTemplateMutation.mutateAsync({
        name: name.trim(),
        layout: {},
        variableFields: ['barcode', 'sku', 'name', 'price', 'qr'],
      })
      setName('')
      setShowCreateForm(false)
      setMessage('Template created. Click its name to edit it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create template.')
    }
  }

  return (
    <div className="label-template-library">
      <div className="label-template-table-shell">
        <DataTable
          columns={columns}
          rows={tableRows}
          getRowId={(row) => row.id}
          emptyState={<div className="empty-state">{isLoading ? 'Loading templates...' : 'No templates found.'}</div>}
          rowClassName={(row) => row.isSelected ? 'label-template-table-row is-editing' : 'label-template-table-row'}
        />

        <div className="label-template-mobile-list" aria-label="Template library mobile list">
          {isLoading ? (
            <div className="empty-state">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="empty-state">No templates found.</div>
          ) : (
            filteredTemplates.map((template) => {
              const controls = resolveLabelLayout(template.layout)
              const activeFields = getEnabledLabelFields(controls)
              const isSelected = selectedTemplateId === template.id

              return (
                <button
                  key={template.id}
                  type="button"
                  className={`label-template-mobile-card${isSelected ? ' is-editing' : ''}`}
                  aria-label={`Edit ${template.name} template`}
                  onClick={() => onSelectTemplate?.(template.id)}
                >
                  <div className="label-template-mobile-topline">
                    <span className="label-template-name">{template.name}</span>
                    <span className="label-template-mobile-dimensions">{formatDimensions(template.layout)}</span>
                  </div>
                  <div className="label-template-mobile-meta">{formatDate(template.updated_at ?? template.created_at)}</div>
                  <div className="label-template-field-list">
                    {activeFields.map((field) => (
                      <span key={field} className="label-template-field-pill">{field}</span>
                    ))}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="label-template-create-panel">
          <label className="stack label-template-create-field">
            Template Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retail Shelf Tag" />
          </label>
          <div className="label-template-create-actions">
            <button className="button" onClick={createTemplate} disabled={createTemplateMutation.isPending}>Create Template</button>
            <button className="button ghost" onClick={() => { setShowCreateForm(false); setName(''); setMessage(null) }}>Cancel</button>
          </div>
        </div>
      )}

      {message ? <div className="small muted label-template-message">{message}</div> : null}

      <div className="label-template-create-cta-wrap">
        <button className="label-template-create-cta" type="button" onClick={() => setShowCreateForm((current) => !current)}>
          <Plus size={16} />
          {showCreateForm ? 'Hide new template' : 'Create new template'}
        </button>
      </div>
    </div>
  )
}
