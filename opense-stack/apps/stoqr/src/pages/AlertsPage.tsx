import { useEffect, useState } from 'react'
import { AddFilterDropdown, Badge, Button, Card, Checkbox, DataTable, type DataTableColumn, Input, Select, Toggle } from '@repo/ui'
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CheckCheck,
  Info,
  Mail,
  MessageSquareText,
  Trash2,
  X,
} from 'lucide-react'
import { Navigate, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { BasePage } from '../components/BasePage'
import { PageAvailabilityGuard } from '../components/PageAvailabilityGuard'
import { Tabs } from '../components/Tabs'
import { useCompany } from '../contexts/CompanyContext'
import type { AppLayoutOutletContext } from '../layouts/AppLayout'

type AlertsTab = 'feed' | 'rules'
type FeedCategory = 'all' | 'stock' | 'procurement' | 'system'
type FeedSeverity = 'critical' | 'warning' | 'info'
type AlertSortKey = 'title' | 'severity' | 'category' | 'status'
type NotificationRouteKey = 'inApp' | 'emailDigest' | 'slack'

type FeedAlert = {
  id: string
  code: string
  timeLabel: string
  title: string
  description: string
  severity: FeedSeverity
  category: FeedCategory
  actionLabel: string
  isRead: boolean
}

const alertFilters: Array<{ id: FeedCategory; label: string }> = [
  { id: 'all', label: 'All Alerts' },
  { id: 'stock', label: 'Stock & Inventory' },
  { id: 'procurement', label: 'Procurement & Orders' },
  { id: 'system', label: 'System & Operations' },
]

const alertFilterOptions = alertFilters.map((filter) => ({ value: filter.id, label: filter.label }))

const alertCategoryLabel: Record<FeedCategory, string> = {
  all: 'All Alerts',
  stock: 'Stock & Inventory',
  procurement: 'Procurement & Orders',
  system: 'System & Operations',
}

const initialAlerts: FeedAlert[] = [
  {
    id: 'alert-1001',
    code: 'ALT-1001',
    timeLabel: '10 mins ago',
    title: 'Out of Stock: Premium Widget',
    description: 'SKU-7782 has reached 0 units. Minimum threshold is 50.',
    severity: 'critical',
    category: 'stock',
    actionLabel: 'Draft PO',
    isRead: false,
  },
  {
    id: 'alert-1002',
    code: 'ALT-1002',
    timeLabel: '2 hours ago',
    title: 'PO Delayed: Alpha Supplies',
    description: 'PO-2024-089 has passed Expected Delivery Date (Oct 12).',
    severity: 'warning',
    category: 'procurement',
    actionLabel: 'View PO',
    isRead: false,
  },
  {
    id: 'alert-1003',
    code: 'ALT-1003',
    timeLabel: '15 mins ago',
    title: 'Hardware Offline: Main Dock Scanner',
    description: 'Scanner device "Dock-Scan-01" lost connection 15 mins ago.',
    severity: 'critical',
    category: 'system',
    actionLabel: 'Resolve',
    isRead: false,
  },
  {
    id: 'alert-1004',
    code: 'ALT-1004',
    timeLabel: '1 day ago',
    title: 'Expiry Warning: Organic Solvent',
    description: 'Batch #B-998 (SKU-4412) expires in 7 days.',
    severity: 'warning',
    category: 'stock',
    actionLabel: 'Draft PO',
    isRead: false,
  },
  {
    id: 'alert-1005',
    code: 'ALT-1005',
    timeLabel: '3 hours ago',
    title: 'Receiving Discrepancy',
    description: 'Scanned qty (45) does not match PO-2024-090 qty (50).',
    severity: 'info',
    category: 'procurement',
    actionLabel: 'View PO',
    isRead: false,
  },
  {
    id: 'alert-1006',
    code: 'ALT-1006',
    timeLabel: '1 day ago',
    title: 'Admin Settings Changed',
    description: 'User "Admin_Sarah" updated global organisation working hours.',
    severity: 'info',
    category: 'system',
    actionLabel: 'Resolve',
    isRead: false,
  },
  {
    id: 'alert-1007',
    code: 'ALT-1007',
    timeLabel: '4 hours ago',
    title: 'Integration Error: Xero Sync',
    description: 'Failed to push 12 invoices to Xero via API. Check connection.',
    severity: 'critical',
    category: 'system',
    actionLabel: 'Resolve',
    isRead: false,
  },
]

const initialThresholds = {
  lowStock: '50',
  expiryWindow: '14',
}

const initialRouting: Record<NotificationRouteKey, boolean> = {
  inApp: true,
  emailDigest: true,
  slack: false,
}

const initialSubscriptions = {
  procurement: 'purchasing-managers',
  system: 'it-admins',
}

const legacyTabRedirects: Record<string, AlertsTab> = {
  notifications: 'feed',
  delivery: 'rules',
  history: 'feed',
}

const severityVariant = {
  critical: 'destructive',
  warning: 'warning',
  info: 'info',
} as const

const severityLabel = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
} as const

const feedPageSize = 5

const roleSubscriptionOptions = {
  procurement: [
    { value: 'purchasing-managers', label: 'Purchasing Managers only' },
    { value: 'buyers-and-managers', label: 'Buyers and Purchasing Managers' },
    { value: 'ops-and-procurement', label: 'Operations and Procurement leads' },
  ],
  system: [
    { value: 'it-admins', label: 'IT & Admins' },
    { value: 'warehouse-leads', label: 'Warehouse Leads and IT' },
    { value: 'admins-only', label: 'Admins only' },
  ],
} as const

const matchesAlertSearch = (alert: FeedAlert, searchTerm: string) => {
  const searchable = [
    alert.code,
    alert.title,
    alert.description,
    severityLabel[alert.severity],
    alert.timeLabel,
  ]

  return searchable.some((value) => value.toLowerCase().includes(searchTerm))
}

const getAlertSortValue = (alert: FeedAlert, sortKey: AlertSortKey) => {
  if (sortKey === 'severity') return severityLabel[alert.severity]
  if (sortKey === 'category') return alertCategoryLabel[alert.category]
  if (sortKey === 'status') return alert.isRead ? 'Read' : 'Unread'

  return alert.title
}

const renderSeverityIcon = (severity: FeedSeverity) => {
  if (severity === 'critical') return <AlertCircle size={12} aria-hidden="true" />
  if (severity === 'warning') return <AlertTriangle size={12} aria-hidden="true" />
  return <Info size={12} aria-hidden="true" />
}

export const AlertsPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab } = useParams<{ tab?: string }>()
  const [alerts, setAlerts] = useState(initialAlerts)
  const [activeFilter, setActiveFilter] = useState<FeedCategory>('all')
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([])
  const [fallbackSearchTerm] = useState('')
  const [tablePage, setTablePage] = useState(1)
  const [tableSortField, setTableSortField] = useState<AlertSortKey>('title')
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [thresholds, setThresholds] = useState(initialThresholds)
  const [routing, setRouting] = useState(initialRouting)
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const searchTerm = layoutContext?.topBarSearchValue ?? fallbackSearchTerm
  const hasSelectedAlerts = selectedAlertIds.length > 0

  useEffect(() => {
    setTablePage(1)
  }, [searchTerm])

  const legacyTabRedirect = tab ? legacyTabRedirects[tab] : undefined

  if (legacyTabRedirect) {
    return <Navigate to={`/alerts/${legacyTabRedirect}`} replace />
  }

  if (tab !== 'feed' && tab !== 'rules') {
    return <Navigate to="/alerts/feed" replace />
  }

  const activeTab = tab as AlertsTab
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const visibleAlerts = alerts.filter((alert) => {
    const matchesFilter = activeFilter === 'all' || alert.category === activeFilter
    const matchesSearch = normalizedSearchTerm.length === 0 || matchesAlertSearch(alert, normalizedSearchTerm)

    return matchesFilter && matchesSearch
  })
  const sortedAlerts = [...visibleAlerts].sort((left, right) => {
    const comparison = getAlertSortValue(left, tableSortField).localeCompare(getAlertSortValue(right, tableSortField))
    return tableSortDirection === 'asc' ? comparison : -comparison
  })
  const totalAlertPages = Math.max(1, Math.ceil(sortedAlerts.length / feedPageSize))
  const currentTablePage = Math.min(tablePage, totalAlertPages)
  const pagedAlerts = sortedAlerts.slice((currentTablePage - 1) * feedPageSize, currentTablePage * feedPageSize)
  const allVisibleSelected = visibleAlerts.length > 0 && visibleAlerts.every((alert) => selectedAlertIds.includes(alert.id))
  const unreadCount = alerts.filter((alert) => !alert.isRead).length
  const alertFilterItems = alertFilterOptions.filter((filter) => filter.value !== activeFilter)

  const alertColumns: Array<DataTableColumn<FeedAlert, AlertSortKey>> = [
    {
      id: 'select',
      header: '',
      width: 48,
      renderCell: (alert) => (
        <Checkbox
          checked={selectedAlertIds.includes(alert.id)}
          onChange={(event) => updateSelection(alert.id, event.target.checked)}
          aria-label={`Select ${alert.code}`}
        />
      ),
    },
    {
      id: 'title',
      header: 'Alert',
      sortKey: 'title',
      renderCell: (alert) => (
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="font-semibold uppercase tracking-[0.08em] text-[var(--color-foreground)]">{alert.code}</span>
            <span aria-hidden="true">•</span>
            <span>{alert.timeLabel}</span>
          </div>
          <div className={`text-base text-[var(--color-foreground)] ${alert.isRead ? 'font-medium' : 'font-semibold'}`}>
            {alert.title}
          </div>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{alert.description}</p>
        </div>
      ),
    },
    {
      id: 'severity',
      header: 'Severity',
      sortKey: 'severity',
      renderCell: (alert) => (
        <Badge variant={severityVariant[alert.severity]} size="md" className="gap-1.5">
          {renderSeverityIcon(alert.severity)}
          {severityLabel[alert.severity]}
        </Badge>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      sortKey: 'category',
      renderCell: (alert) => alertCategoryLabel[alert.category],
    },
    {
      id: 'status',
      header: 'Status',
      sortKey: 'status',
      renderCell: (alert) => (
        <Badge variant={alert.isRead ? 'secondary' : 'success'} size="sm">
          {alert.isRead ? 'Read' : 'Unread'}
        </Badge>
      ),
    },
    {
      id: 'action',
      header: '',
      align: 'right',
      renderCell: (alert) => (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="shadow-none"
          onClick={() => handleAlertAction(alert.id)}
        >
          {alert.actionLabel}
        </Button>
      ),
    },
  ]

  const updateSelection = (alertId: string, checked: boolean) => {
    setSelectedAlertIds((currentIds) => {
      if (checked) {
        return currentIds.includes(alertId) ? currentIds : [...currentIds, alertId]
      }

      return currentIds.filter((currentId) => currentId !== alertId)
    })
  }

  const toggleSelectAllVisible = (checked: boolean) => {
    const visibleIds = visibleAlerts.map((alert) => alert.id)

    setSelectedAlertIds((currentIds) => {
      if (checked) {
        return [...new Set([...currentIds, ...visibleIds])]
      }

      return currentIds.filter((currentId) => !visibleIds.includes(currentId))
    })
  }

  const markSelectedAsRead = () => {
    if (selectedAlertIds.length === 0) return

    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) => (selectedAlertIds.includes(alert.id) ? { ...alert, isRead: true } : alert)),
    )
    setSelectedAlertIds([])
  }

  const dismissSelectedAlerts = () => {
    if (selectedAlertIds.length === 0) return

    setAlerts((currentAlerts) => currentAlerts.filter((alert) => !selectedAlertIds.includes(alert.id)))
    setSelectedAlertIds([])
  }

  const handleAlertAction = (alertId: string) => {
    setAlerts((currentAlerts) =>
      currentAlerts.map((alert) => (alert.id === alertId ? { ...alert, isRead: true } : alert)),
    )
  }

  const handleFilterChange = (value: string) => {
    setActiveFilter(value as FeedCategory)
    setTablePage(1)
  }

  const handleTableSort = (field: AlertSortKey) => {
    if (tableSortField === field) {
      setTableSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTableSortField(field)
    setTableSortDirection('asc')
    setTablePage(1)
  }

  const feedContent = (
    <Card className="overflow-hidden" padding="none">
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1 sm:gap-3">
            <Checkbox
              checked={allVisibleSelected}
              onChange={(event) => toggleSelectAllVisible(event.target.checked)}
              label="Select All"
              aria-label="Select all visible alerts"
            />

            {(activeFilter !== 'all' || hasSelectedAlerts) ? (
              <div className="hidden h-5 w-px bg-[var(--color-border)] sm:block" aria-hidden="true" />
            ) : null}

            {activeFilter !== 'all' ? (
              <div className="inline-flex items-center gap-1 rounded-[4px] bg-[rgba(102,193,63,0.06)] px-2 py-1 text-xs font-medium text-[var(--color-foreground)]">
                <span className="opacity-60">Category:</span>
                <span>{alertCategoryLabel[activeFilter]}</span>
                <button
                  type="button"
                  aria-label={`Clear ${alertCategoryLabel[activeFilter]} filter`}
                  onClick={() => handleFilterChange('all')}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border-none bg-transparent p-0 text-[var(--color-foreground)] opacity-35 transition-opacity hover:opacity-70"
                >
                  <X size={10} />
                </button>
              </div>
            ) : null}

            {hasSelectedAlerts ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={markSelectedAsRead}>
                  <CheckCheck size={14} aria-hidden="true" />
                  Mark Read
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={dismissSelectedAlerts}>
                  <Trash2 size={14} aria-hidden="true" />
                  Dismiss
                </Button>
              </>
            ) : (
              <AddFilterDropdown
                items={alertFilterItems}
                onSelect={handleFilterChange}
                ariaLabel="Alert category filter"
                label="Filter"
              />
            )}
          </div>

          <div className="text-sm text-[var(--color-muted-foreground)]">
            Showing {visibleAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      </div>

      <DataTable
        columns={alertColumns}
        rows={pagedAlerts}
        getRowId={(alert) => alert.id}
        emptyState="No alerts match the current filters."
        sortField={tableSortField}
        sortDirection={tableSortDirection}
        onSortChange={handleTableSort}
        minTableWidth={900}
        tableWrapClassName="border-0"
        footerClassName="px-4 pb-4 pt-0"
        pagination={{
          currentPage: currentTablePage,
          totalItems: visibleAlerts.length,
          itemsPerPage: feedPageSize,
          onPageChange: setTablePage,
        }}
      />
    </Card>
  )

  const rulesContent = (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden" padding="none">
        <div className="border-b border-[var(--color-border)] px-6 py-5">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Global Threshold Settings</h2>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Set default triggers for physical inventory alerts.
          </p>
        </div>

        <div className="divide-y divide-[var(--color-border)]">
          <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Default Low Stock Threshold</h3>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Alert when any item drops below this quantity.
              </p>
            </div>
            <div className="flex items-center gap-3 md:flex-shrink-0">
              <div className="w-24">
                <Input
                  type="number"
                  value={thresholds.lowStock}
                  onChange={(event) => setThresholds((current) => ({ ...current, lowStock: event.target.value }))}
                  aria-label="Default Low Stock Threshold"
                />
              </div>
              <span className="text-sm text-[var(--color-muted-foreground)]">units</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Expiry Warning Window</h3>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Days before expiration to trigger an alert.
              </p>
            </div>
            <div className="flex items-center gap-3 md:flex-shrink-0">
              <div className="w-24">
                <Input
                  type="number"
                  value={thresholds.expiryWindow}
                  onChange={(event) => setThresholds((current) => ({ ...current, expiryWindow: event.target.value }))}
                  aria-label="Expiry Warning Window"
                />
              </div>
              <span className="text-sm text-[var(--color-muted-foreground)]">days</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden" padding="none">
          <div className="border-b border-[var(--color-border)] px-6 py-5">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Notification Routing</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Where should alerts be sent?</p>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[var(--color-info-light)] p-3 text-[var(--color-info)]">
                  <BellRing size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">In-App Notifications</h3>
                </div>
              </div>
              <Toggle
                checked={routing.inApp}
                onChange={(event) => setRouting((current) => ({ ...current, inApp: event.target.checked }))}
                aria-label="Toggle In-App Notifications"
              />
            </div>

            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[var(--color-muted)] p-3 text-[var(--color-foreground)]">
                  <Mail size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Email Digest (Daily)</h3>
                </div>
              </div>
              <Toggle
                checked={routing.emailDigest}
                onChange={(event) => setRouting((current) => ({ ...current, emailDigest: event.target.checked }))}
                aria-label="Toggle Email Digest"
              />
            </div>

            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[var(--color-success-light)] p-3 text-[var(--color-success)]">
                  <MessageSquareText size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Slack Webhook</h3>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">#warehouse-alerts</p>
                </div>
              </div>
              <Toggle
                checked={routing.slack}
                onChange={(event) => setRouting((current) => ({ ...current, slack: event.target.checked }))}
                aria-label="Toggle Slack Webhook"
              />
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden" padding="none">
          <div className="border-b border-[var(--color-border)] px-6 py-5">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Role Subscriptions</h2>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Route alerts by department.</p>
          </div>

          <div className="flex flex-col gap-5 px-6 py-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--color-foreground)]">Procurement Alerts</span>
              <Select
                value={subscriptions.procurement}
                onChange={(event) => setSubscriptions((current) => ({ ...current, procurement: event.target.value }))}
                options={[...roleSubscriptionOptions.procurement]}
                aria-label="Procurement Alerts subscription"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-[var(--color-foreground)]">System & Hardware Errors</span>
              <Select
                value={subscriptions.system}
                onChange={(event) => setSubscriptions((current) => ({ ...current, system: event.target.value }))}
                options={[...roleSubscriptionOptions.system]}
                aria-label="System & Hardware Errors subscription"
              />
            </label>
          </div>
        </Card>
      </div>
    </div>
  )

  return (
    <BasePage
      companyId={companyId}
      isLoading={false}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view alerts."
      containerClassName="flex flex-col gap-4"
    >
      <PageAvailabilityGuard companyId={companyId} feature="alerts">
        <h1 className="sr-only">Alerts</h1>
        <Tabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/alerts/${nextTab}`)}
          bottomSpacing
          tabs={[
            { id: 'feed', label: 'Alerts Feed', count: unreadCount, content: feedContent },
            { id: 'rules', label: 'Alert Rules', content: rulesContent },
          ]}
        />
      </PageAvailabilityGuard>
    </BasePage>
  )
}
