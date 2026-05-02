import { DataTable } from '@repo/ui'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useCreateLabelTemplate, useLabelTemplates } from '../../hooks/queries/useLabelStudio'
import { getLabelLayoutSummary } from './labelLayout'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'
import type { AppLayoutOutletContext } from '../../layouts/AppLayout'

type TemplateLibraryTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectTemplate?: (templateId: string) => void
  searchTerm?: string
}

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hrs ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
      setMessage('Template created. Select it from the library to design it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create template.')
    }
  }

  return (
    <div className="card stack">
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <h3 className="section-title" style={{ margin: 0 }}>Template Library</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="button" onClick={() => setShowCreateForm(!showCreateForm)}>
            + New Template
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <label className="stack" style={{ flex: 1 }}>
            Template Name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retail Shelf Tag" />
          </label>
          <button className="button" onClick={createTemplate} disabled={createTemplateMutation.isPending}>Create Template</button>
          <button className="button ghost" onClick={() => { setShowCreateForm(false); setName(''); setMessage(null) }}>Cancel</button>
        </div>
      )}

      {message && <div className="small muted" style={{ padding: '8px 0' }}>{message}</div>}

      {isLoading ? (
        <div className="empty-state">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="empty-state">No templates found.</div>
      ) : (
        <DataTable
          columns={[
            {
              id: 'name',
              header: 'Name',
              renderCell: (template) => {
                const isEditing = selectedTemplateId === template.id

                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{template.name}</span>
                      {isEditing && <span className="badge warning">Editing</span>}
                    </div>
                    <div className="small muted">
                      Updated {formatDate(template.updated_at ?? template.created_at)}
                    </div>
                  </>
                )
              },
            },
            {
              id: 'size',
              header: 'Size',
              renderCell: (template) => getLabelLayoutSummary(template.layout).size,
            },
            {
              id: 'type',
              header: 'Type',
              renderCell: (template) => getLabelLayoutSummary(template.layout).type,
            },
            {
              id: 'fields',
              header: 'Fields',
              renderCell: (template) => getLabelLayoutSummary(template.layout).fields,
            },
          ]}
          rows={filteredTemplates}
          getRowId={(template) => template.id}
          onRowClick={(template) => onSelectTemplate?.(template.id)}
          getRowProps={(template) => ({
            role: 'button',
            tabIndex: 0,
            'aria-label': `Open ${template.name} template`,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectTemplate?.(template.id)
              }
            },
          })}
          getRowStyle={(template) => (
            selectedTemplateId === template.id ? { background: 'rgba(37, 99, 235, 0.04)' } : undefined
          )}
        />
      )}
    </div>
  )
}
