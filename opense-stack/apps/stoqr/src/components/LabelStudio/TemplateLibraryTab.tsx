import { useCallback, useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Package2, Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@repo/ui'
import { useCreateLabelTemplate, useLabelTemplates } from '../../hooks/queries/useLabelStudio'
import { usePageTopBarSearch, useTopBarSearchValue } from '../Search/TopBarSearch'
import type { SearchSuggestion } from '../../lib/pageSearch'
import { getEnabledLabelFields, resolveLabelLayout } from './labelLayout'
import {
  buildLabelTemplateSearchSuggestions,
  filterLabelTemplates,
  getLabelTemplateIdFromSuggestion,
} from './templateSearch'

type TemplateLibraryTabProps = {
  companyId: string
  selectedTemplateId?: string
  onSelectTemplate?: (templateId: string) => void
}

type TemplateTableRow = {
  id: string
  name: string
  dimensionsLabel: string
  width: number
  height: number
  activeFields: string[]
  lastModifiedLabel: string
  lastModifiedSortValue: number
  isSelected: boolean
}

type TemplateSortField = 'templateName' | 'dimensions' | 'activeFields' | 'lastModified'

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

const getDateSortValue = (dateString: string | null | undefined) => {
  if (!dateString) return 0
  const timestamp = new Date(dateString).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const TemplateLibraryTab = ({ companyId, selectedTemplateId, onSelectTemplate }: TemplateLibraryTabProps) => {
  const { searchValue } = useTopBarSearchValue()
  const { data: templates = [], isLoading } = useLabelTemplates(companyId)
  const createTemplateMutation = useCreateLabelTemplate(companyId)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCompactView, setIsCompactView] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia('(max-width: 640px)').matches
  })
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [tableSortField, setTableSortField] = useState<TemplateSortField | null>('lastModified')
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const syncCompactView = () => {
      setIsCompactView(mediaQuery.matches)
    }

    syncCompactView()
    mediaQuery.addEventListener('change', syncCompactView)

    return () => {
      mediaQuery.removeEventListener('change', syncCompactView)
    }
  }, [])

  const filteredTemplates = useMemo(
    () => filterLabelTemplates(templates, searchValue),
    [searchValue, templates],
  )
  const tableRows = useMemo<TemplateTableRow[]>(() => filteredTemplates.map((template) => {
    const controls = resolveLabelLayout(template.layout)

    return {
      id: template.id,
      name: template.name,
      dimensionsLabel: formatDimensions(template.layout),
      width: controls.width,
      height: controls.height,
      activeFields: getEnabledLabelFields(controls),
      lastModifiedLabel: formatDate(template.updated_at ?? template.created_at),
      lastModifiedSortValue: getDateSortValue(template.updated_at ?? template.created_at),
      isSelected: selectedTemplateId === template.id,
    }
  }), [filteredTemplates, selectedTemplateId])
  const sortedTableRows = useMemo(() => {
    if (!tableSortField) {
      return tableRows
    }

    return [...tableRows].sort((left, right) => {
      let comparison = 0

      switch (tableSortField) {
        case 'templateName':
          comparison = left.name.localeCompare(right.name)
          break
        case 'dimensions':
          comparison = (left.width * left.height) - (right.width * right.height)
          break
        case 'activeFields':
          comparison = left.activeFields.join(', ').localeCompare(right.activeFields.join(', '))
          break
        case 'lastModified':
          comparison = left.lastModifiedSortValue - right.lastModifiedSortValue
          break
        default:
          comparison = 0
      }

      return tableSortDirection === 'asc' ? comparison : -comparison
    })
  }, [tableRows, tableSortDirection, tableSortField])
  const handleTableSort = (field: TemplateSortField) => {
    if (tableSortField === field) {
      setTableSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTableSortField(field)
    setTableSortDirection('asc')
  }

  const columns = useMemo<DataTableColumn<TemplateTableRow, TemplateSortField>[]>(() => [
    {
      id: 'templateName',
      header: 'Template Name',
      sortKey: 'templateName',
      width: '34%',
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
      sortKey: 'dimensions',
      width: '14%',
      renderCell: (row) => row.dimensionsLabel,
    },
    {
      id: 'activeFields',
      header: 'Active Fields',
      sortKey: 'activeFields',
      width: '28%',
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
      sortKey: 'lastModified',
      width: '16%',
      renderCell: (row) => row.lastModifiedLabel,
    },
    {
      id: 'actions',
      header: 'Actions',
      sortable: false,
      width: '8%',
      align: 'right',
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
  const handleSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    const templateId = getLabelTemplateIdFromSuggestion(suggestion)
    if (templateId) {
      onSelectTemplate?.(templateId)
    }
  }, [onSelectTemplate])

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'label-studio-templates',
    placeholder: 'Search templates...',
    defaultSuggestions: [
      { id: 'labels-templates', title: 'Label Templates', subtitle: 'Open and manage saved label templates', value: 'template', badge: 'Labels' },
    ],
    suggestions: buildLabelTemplateSearchSuggestions(filteredTemplates),
    onSuggestionSelect: handleSuggestionSelect,
  }), [filteredTemplates, handleSuggestionSelect]))

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
        {!isCompactView ? (
          <DataTable
            variant="operational"
            columns={columns}
            rows={sortedTableRows}
            getRowId={(row) => row.id}
            emptyState={<div className="empty-state">{isLoading ? 'Loading templates...' : 'No templates found.'}</div>}
            minTableWidth={920}
            tableLayout="fixed"
            sortField={tableSortField}
            sortDirection={tableSortDirection}
            onSortChange={handleTableSort}
            rowClassName={(row) => row.isSelected ? 'label-template-table-row is-editing' : 'label-template-table-row'}
          />
        ) : null}

        {isCompactView ? (
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
        ) : null}
      </div>

      {showCreateForm && (
        <div className="label-template-create-panel">
          <label className="label-template-create-field label-template-create-field-stack">
            Template Name
            <input
              className="label-template-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Retail Shelf Tag"
            />
          </label>
          <div className="label-template-create-actions">
            <button
              type="button"
              className="label-template-action-button label-template-action-button--primary"
              onClick={createTemplate}
              disabled={createTemplateMutation.isPending}
            >
              Create Template
            </button>
            <button
              type="button"
              className="label-template-action-button label-template-action-button--ghost"
              onClick={() => { setShowCreateForm(false); setName(''); setMessage(null) }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {message ? <div className="label-template-message">{message}</div> : null}

      <div className="label-template-create-cta-wrap">
        <button className="label-template-create-cta" type="button" onClick={() => setShowCreateForm((current) => !current)}>
          <Plus size={16} />
          {showCreateForm ? 'Hide new template' : 'Create new template'}
        </button>
      </div>
    </div>
  )
}
