import { useMemo, useState } from 'react'
import { useReportsData } from '../../hooks/queries/useReports'

type Template = {
  id: string
  name: string
  fields: string[]
}

type Schedule = {
  id: string
  report_type: string
  cadence: 'daily' | 'weekly' | 'monthly'
  day_of_week: number | null
  day_of_month: number | null
  time_of_day: string | null
  recipients: string[] | null
  created_at: string
}

const DEFAULT_TEMPLATES: Template[] = [
  { id: 'weekly-stockout-warning', name: 'Weekly Stockout Warning', fields: ['sku', 'productName', 'category', 'currentStock', 'unitCost', 'totalValue'] },
  { id: 'end-of-month-valuation', name: 'End of Month Valuation', fields: ['sku', 'productName', 'currentStock', 'unitCost', 'totalValue', 'margin'] },
  { id: 'q3-procurement-efficiency', name: 'Q3 Procurement Efficiency', fields: ['sku', 'productName', 'unitCost', 'cogs', 'supplierName', 'weeklyVelocity'] },
  { id: 'daily-shrinkage-report', name: 'Daily Shrinkage Report', fields: ['sku', 'productName', 'category', 'currentStock', 'daysInInventory', 'lastScanned'] },
]

const FIELD_GROUPS = [
  {
    id: 'inventory',
    title: 'Inventory Fields',
    icon: 'cube',
    fields: [
      { id: 'sku', label: 'SKU' },
      { id: 'productName', label: 'Product Name' },
      { id: 'category', label: 'Category' },
      { id: 'currentStock', label: 'Current Stock' },
      { id: 'reorderPoint', label: 'Reorder Point' },
      { id: 'location', label: 'Location' },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Metrics',
    icon: 'chart',
    fields: [
      { id: 'unitCost', label: 'Unit Cost' },
      { id: 'totalValue', label: 'Total Value' },
      { id: 'sellingPrice', label: 'Selling Price' },
      { id: 'margin', label: 'Margin' },
      { id: 'cogs', label: 'COGS' },
      { id: 'holdingCost', label: 'Holding Cost' },
    ],
  },
  {
    id: 'activity',
    title: 'Activity Data',
    icon: 'clock',
    fields: [
      { id: 'lastScanned', label: 'Last Scanned' },
      { id: 'lastReceived', label: 'Last Received' },
      { id: 'daysInInventory', label: 'Days in Inventory' },
      { id: 'weeklyVelocity', label: 'Weekly Velocity' },
      { id: 'supplierName', label: 'Supplier Name' },
    ],
  },
] as const

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatReportType = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatTimeOfDay = (value: string | null) => {
  if (!value) return '8:00 AM'
  const [hours = '08', minutes = '00'] = value.split(':')
  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const formatCadence = (schedule: Schedule) => {
  const timeLabel = formatTimeOfDay(schedule.time_of_day)

  if (schedule.cadence === 'daily') return `Every day at ${timeLabel}`
  if (schedule.cadence === 'monthly') return `Day ${schedule.day_of_month ?? 1} at ${timeLabel}`
  return `Every ${weekdayLabels[schedule.day_of_week ?? 1]} at ${timeLabel}`
}

const fallbackSchedule: Schedule = {
  id: 'fallback-schedule',
  report_type: 'weekly_stockout_warning',
  cadence: 'weekly',
  day_of_week: 1,
  day_of_month: null,
  time_of_day: '08:00:00',
  recipients: ['operations@company.com'],
  created_at: new Date().toISOString(),
}

const Icon = ({ name }: { name: 'plus' | 'file' | 'dots' | 'cube' | 'chart' | 'clock' }) => {
  if (name === 'plus') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    )
  }
  if (name === 'file') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    )
  }
  if (name === 'dots') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="5" r="1.8" />
        <circle cx="12" cy="12" r="1.8" />
        <circle cx="12" cy="19" r="1.8" />
      </svg>
    )
  }
  if (name === 'cube') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 8 4.5v11L12 22 4 17.5v-11L12 2z" />
        <path d="M12 22V11.5" />
        <path d="M20 6.5 12 11.5 4 6.5" />
      </svg>
    )
  }
  if (name === 'chart') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="20" x2="20" y2="20" />
        <line x1="7" y1="16" x2="7" y2="10" />
        <line x1="12" y1="16" x2="12" y2="4" />
        <line x1="17" y1="16" x2="17" y2="8" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  )
}

export const CustomSavedReportsTab = ({ companyId }: { companyId: string | null }) => {
  const { data } = useReportsData(companyId)
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [activeTemplateId, setActiveTemplateId] = useState(DEFAULT_TEMPLATES[0].id)
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_TEMPLATES[0].fields)
  const [dateRange, setDateRange] = useState('last-30-days')
  const [sortBy, setSortBy] = useState('total-value-desc')

  const schedules = ((data?.schedules ?? []) as Schedule[])
  const featuredSchedule = schedules[0] ?? fallbackSchedule

  const activeTemplate = useMemo(
    () => templates.find((template) => template.id === activeTemplateId) ?? null,
    [templates, activeTemplateId],
  )

  const handleTemplateSelect = (template: Template) => {
    setActiveTemplateId(template.id)
    setSelectedFields(template.fields)
  }

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields((current) => {
      if (current.includes(fieldId)) {
        return current.filter((field) => field !== fieldId)
      }
      return [...current, fieldId]
    })
  }

  const handleSaveTemplate = () => {
    const nextTemplate: Template = {
      id: `custom-template-${Date.now()}`,
      name: `Custom Report ${templates.filter((item) => item.id.startsWith('custom-template-')).length + 1}`,
      fields: selectedFields,
    }

    setTemplates((current) => [nextTemplate, ...current])
    setActiveTemplateId(nextTemplate.id)
  }

  return (
    <div className="custom-reports-layout">
      <div className="custom-reports-sidebar stack">
        <div className="card stack custom-reports-sidecard">
          <div className="flex-between">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Saved Templates</h3>
            <button className="icon-button" type="button" aria-label="Add template">
              <Icon name="plus" />
            </button>
          </div>

          <div className="template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-item ${template.id === activeTemplateId ? 'active' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <span className="template-item-icon">
                  <Icon name="file" />
                </span>
                <span className="template-item-content">{template.name}</span>
                <span className="template-item-action" aria-hidden="true">
                  <Icon name="dots" />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="card stack custom-reports-sidecard">
          <div className="flex-between">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Scheduled Delivery</h3>
            <button className="icon-button" type="button" aria-label="Add schedule">
              <Icon name="plus" />
            </button>
          </div>

          <div className="schedule-card">
            <div style={{ fontWeight: 'var(--type-weight-semibold)', color: 'var(--text)' }}>
              {formatReportType(featuredSchedule.report_type)}
            </div>
            <div className="small muted">{formatCadence(featuredSchedule)}</div>
            <div className="small muted" style={{ marginTop: 8 }}>To:</div>
            <div className="small" style={{ color: 'var(--color-muted-foreground)' }}>
              {featuredSchedule.recipients?.[0] ?? 'operations@company.com'}
            </div>
          </div>
        </div>
      </div>

      <div className="card stack report-builder-card">
        <div className="builder-header flex-between">
          <div className="stack" style={{ gap: 4 }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Report Builder</h3>
            <div className="small muted">Create a custom data view by selecting fields below.</div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="button ghost" onClick={handleSaveTemplate}>Save Template</button>
            <button type="button" className="button" style={{ background: 'var(--color-foreground)', color: 'var(--shade-white-1)' }}>Generate Report</button>
          </div>
        </div>

        <div className="builder-divider" />

        <div className="builder-fields-grid">
          {FIELD_GROUPS.map((group) => (
            <div key={group.id} className="builder-field-column stack">
              <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span className="builder-group-icon"><Icon name={group.icon} /></span>
                <div style={{ fontWeight: 'var(--type-weight-semibold)', color: 'var(--text)' }}>{group.title}</div>
              </div>

              <div className="builder-field-list">
                {group.fields.map((field) => (
                  <label key={field.id} className="builder-field-option">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                    />
                    <span>{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="builder-divider" />

        <div className="stack" style={{ gap: 14 }}>
          <div style={{ fontWeight: 'var(--type-weight-semibold)', color: 'var(--text)' }}>Filters & Sorting</div>
          <div className="builder-filters-row">
            <select className="select" value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
              <option value="last-7-days">Date Range: Last 7 Days</option>
              <option value="last-30-days">Date Range: Last 30 Days</option>
              <option value="quarter">Date Range: This Quarter</option>
              <option value="ytd">Date Range: Year to Date</option>
            </select>
            <select className="select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="total-value-desc">Sort By: Total Value (Desc)</option>
              <option value="total-value-asc">Sort By: Total Value (Asc)</option>
              <option value="stock-desc">Sort By: Current Stock (Desc)</option>
              <option value="stock-asc">Sort By: Current Stock (Asc)</option>
              <option value="name-asc">Sort By: Product Name (A-Z)</option>
            </select>
          </div>
          {activeTemplate ? (
            <div className="small muted">
              Active template: {activeTemplate.name}. {selectedFields.length} fields selected.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
