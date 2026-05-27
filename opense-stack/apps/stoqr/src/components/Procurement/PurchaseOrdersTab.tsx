import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FilterDropdown,
  Input,
  Select,
} from '@repo/ui'
import { BellRing, Building2, CheckCircle2, Plus, Sparkles } from 'lucide-react'
import type { PurchaseOrder } from '../../api/procurement'
import { usePageTopBarSearch, useTopBarSearchValue } from '../Search/TopBarSearch'
import {
  useCreatePurchaseOrder,
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
  useProcurementSuppliers,
} from '../../hooks/queries/useProcurementTabs'
import { useProcurementProducts } from '../../hooks/queries/useProcurement'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'
import { formatCurrency } from '../../utils'

type StatusFilter = 'all' | PurchaseOrder['status']
type PurchaseOrderSortField = 'poNumber' | 'supplier' | 'created' | 'expected' | 'total' | 'workflow'

type WorkflowBadge = {
  label: string
  variant: 'warning' | 'info' | 'secondary' | 'success' | 'destructive'
}

type OrderWorkflowSummary = {
  status: WorkflowBadge
  orderedUnits: number
  receivedUnits: number
}

const statusLabels: Record<PurchaseOrder['status'], string> = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  not_started: 'Not Started',
  awaiting_supplier: 'Awaiting Supplier',
  in_transit: 'In Transit',
  partial_receipt: 'Partial Receipt',
  received: 'Received',
  cancelled: 'Cancelled',
  denied: 'Denied',
  awaiting_return: 'Awaiting Return',
  shipped_to_vendor: 'Shipped to Vendor',
  return_resolved: 'Return Resolved',
}

const statusVariants: Record<PurchaseOrder['status'], 'warning' | 'info' | 'secondary' | 'success' | 'destructive'> = {
  pending_approval: 'warning',
  approved: 'success',
  not_started: 'secondary',
  awaiting_supplier: 'warning',
  in_transit: 'info',
  partial_receipt: 'secondary',
  received: 'success',
  cancelled: 'destructive',
  denied: 'destructive',
  awaiting_return: 'warning',
  shipped_to_vendor: 'info',
  return_resolved: 'success',
}

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'pending_approval', label: statusLabels.pending_approval },
  { value: 'approved', label: statusLabels.approved },
  { value: 'not_started', label: statusLabels.not_started },
  { value: 'awaiting_supplier', label: statusLabels.awaiting_supplier },
  { value: 'in_transit', label: statusLabels.in_transit },
  { value: 'partial_receipt', label: statusLabels.partial_receipt },
  { value: 'received', label: statusLabels.received },
  { value: 'cancelled', label: statusLabels.cancelled },
  { value: 'denied', label: statusLabels.denied },
  { value: 'awaiting_return', label: statusLabels.awaiting_return },
  { value: 'shipped_to_vendor', label: statusLabels.shipped_to_vendor },
  { value: 'return_resolved', label: statusLabels.return_resolved },
]

const purchaseOrderPageSizeOptions = [10, 20, 30, 50]
const purchaseOrderTableHeaderClassName = 'border-b border-[#d9e2ef] bg-white px-4 py-4 uppercase'
const purchaseOrderTableCellClassName = 'border-b border-[#d9e2ef] px-4 py-3'

const formatPurchaseOrderNumber = (order: PurchaseOrder) => {
  const year = new Date(order.created_at).getFullYear()
  return `PO-${year}-${String(order.po_number).padStart(4, '0')}`
}

const formatDateLabel = (value: string | null | undefined) => {
  if (!value) return 'TBD'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

const getWorkflowStatus = (status: PurchaseOrder['status']): WorkflowBadge => {
  return {
    label: statusLabels[status],
    variant: statusVariants[status],
  }
}

const getDateSortValue = (value: string | null | undefined) => {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const PurchaseOrdersTab = ({ companyId }: { companyId: string | null }) => {
  const { searchValue } = useTopBarSearchValue()
  const [isCreating, setIsCreating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAlertsHint, setShowAlertsHint] = useState(false)
  const [newPoSupplier, setNewPoSupplier] = useState('')
  const [newPoDate, setNewPoDate] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(purchaseOrderPageSizeOptions[0])
  const [tableSortField, setTableSortField] = useState<PurchaseOrderSortField | null>('created')
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data: purchaseOrders = [], isLoading: loadingOrders } = useProcurementPurchaseOrders(companyId)
  const { data: purchaseOrderItems = [] } = useProcurementPurchaseOrderItems(companyId)
  const { data: suppliers = [], isLoading: loadingSuppliers } = useProcurementSuppliers(companyId)
  const { data: products = [] } = useProcurementProducts(companyId)
  const createPurchaseOrderMutation = useCreatePurchaseOrder(companyId)

  const suppliersAvailable = suppliers.length > 0
  const lowStockProducts = useMemo(
    () => products.filter((product) => product.reorder_point > 0 && product.quantity_on_hand <= product.reorder_point),
    [products],
  )

  const totalsByPo = useMemo(() => {
    return purchaseOrderItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.po_id] = (acc[item.po_id] ?? 0) + item.quantity_ordered * item.unit_cost
      return acc
    }, {})
  }, [purchaseOrderItems])

  const workflowByPo = useMemo(() => {
    const unitTotals = purchaseOrderItems.reduce<Record<string, { ordered: number; received: number }>>((acc, item) => {
      const current = acc[item.po_id] ?? { ordered: 0, received: 0 }
      current.ordered += item.quantity_ordered
      current.received += item.quantity_received
      acc[item.po_id] = current
      return acc
    }, {})

    return purchaseOrders.reduce<Record<string, OrderWorkflowSummary>>((acc, order) => {
      const totals = unitTotals[order.id] ?? { ordered: 0, received: 0 }

      acc[order.id] = {
        status: getWorkflowStatus(order.status),
        orderedUnits: totals.ordered,
        receivedUnits: totals.received,
      }
      return acc
    }, {})
  }, [purchaseOrderItems, purchaseOrders])

  const filteredPurchaseOrders = useMemo(() => {
    const searchedPurchaseOrders = fuzzySearchItems(purchaseOrders, searchValue, [
      {
        key: (order) => formatPurchaseOrderNumber(order),
        maxRanking: fuzzyRankings.STARTS_WITH,
      },
      {
        key: (order) => order.suppliers?.name ?? '',
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (order) => {
          const workflow = workflowByPo[order.id]
          return workflow ? workflow.status.label : statusLabels[order.status]
        },
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ])

    return searchedPurchaseOrders.filter((order) => statusFilter === 'all' || order.status === statusFilter)
  }, [purchaseOrders, searchValue, statusFilter, workflowByPo])

  const sortedPurchaseOrders = useMemo(() => {
    if (!tableSortField) {
      return filteredPurchaseOrders
    }

    return [...filteredPurchaseOrders].sort((left, right) => {
      let comparison = 0

      switch (tableSortField) {
        case 'poNumber':
          comparison = left.po_number - right.po_number
          break
        case 'supplier':
          comparison = (left.suppliers?.name ?? '').localeCompare(right.suppliers?.name ?? '')
          break
        case 'created':
          comparison = getDateSortValue(left.created_at) - getDateSortValue(right.created_at)
          break
        case 'expected':
          comparison = getDateSortValue(left.expected_date) - getDateSortValue(right.expected_date)
          break
        case 'total':
          comparison =
            (left.total_amount ?? totalsByPo[left.id] ?? 0) -
            (right.total_amount ?? totalsByPo[right.id] ?? 0)
          break
        case 'workflow':
          comparison = (workflowByPo[left.id]?.status.label ?? statusLabels[left.status]).localeCompare(
            workflowByPo[right.id]?.status.label ?? statusLabels[right.status],
          )
          break
        default:
          comparison = 0
      }

      return tableSortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredPurchaseOrders, tableSortDirection, tableSortField, totalsByPo, workflowByPo])

  const currentTablePage = Math.min(
    tablePage,
    Math.max(1, Math.ceil(sortedPurchaseOrders.length / tablePageSize)),
  )
  const pagedPurchaseOrders = useMemo(() => {
    const startIndex = (currentTablePage - 1) * tablePageSize
    return sortedPurchaseOrders.slice(startIndex, startIndex + tablePageSize)
  }, [currentTablePage, sortedPurchaseOrders, tablePageSize])

  const handlePageSizeChange = (pageSize: number) => {
    setTablePageSize(pageSize)
    setTablePage(1)
  }

  const handleStatusFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter)
    setTablePage(1)
  }

  const handleTableSort = (field: PurchaseOrderSortField) => {
    if (tableSortField === field) {
      setTableSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTableSortField(field)
    setTableSortDirection('asc')
    setTablePage(1)
  }

  const purchaseOrderColumns = useMemo<DataTableColumn<PurchaseOrder, PurchaseOrderSortField>[]>(
    () => [
      {
        id: 'po-number',
        header: 'PO Number',
        sortKey: 'poNumber',
        width: '14%',
        headerClassName: purchaseOrderTableHeaderClassName,
        cellClassName: purchaseOrderTableCellClassName,
        renderCell: (order) => (
          <span className="font-semibold text-[var(--color-primary)]">
            {formatPurchaseOrderNumber(order)}
          </span>
        ),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        sortKey: 'supplier',
        width: '23%',
        headerClassName: purchaseOrderTableHeaderClassName,
        cellClassName: purchaseOrderTableCellClassName,
        renderCell: (order) => (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[var(--color-muted)] p-2 text-[var(--color-muted-foreground)]">
              <Building2 size={16} />
            </div>
            <span className="font-medium">
              {order.suppliers?.name ?? 'Unknown supplier'}
            </span>
          </div>
        ),
      },
      {
        id: 'created',
        header: 'Created',
        sortKey: 'created',
        width: '11%',
        headerClassName: purchaseOrderTableHeaderClassName,
        cellClassName: purchaseOrderTableCellClassName,
        renderCell: (order) => formatDateLabel(order.created_at),
      },
      {
        id: 'expected',
        header: 'Expected',
        sortKey: 'expected',
        width: '11%',
        headerClassName: purchaseOrderTableHeaderClassName,
        cellClassName: purchaseOrderTableCellClassName,
        renderCell: (order) => formatDateLabel(order.expected_date),
      },
      {
        id: 'total',
        header: 'Total',
        sortKey: 'total',
        width: '10%',
        align: 'right',
        headerClassName: purchaseOrderTableHeaderClassName,
        cellClassName: purchaseOrderTableCellClassName,
        renderCell: (order) => formatCurrency(order.total_amount ?? totalsByPo[order.id] ?? 0),
      },
      {
        id: 'workflow',
        header: 'Workflow',
        sortKey: 'workflow',
        width: '31%',
        headerClassName: purchaseOrderTableHeaderClassName,
        cellClassName: purchaseOrderTableCellClassName,
        renderCell: (order) => {
          const workflow = workflowByPo[order.id] ?? {
            status: { label: statusLabels[order.status], variant: statusVariants[order.status] },
            orderedUnits: 0,
            receivedUnits: 0,
          }

          return (
            <div className="flex min-w-[280px] flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={workflow.status.variant} size="md">
                  {workflow.status.label}
                </Badge>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {workflow.receivedUnits}/{workflow.orderedUnits} units received
                </span>
              </div>
            </div>
          )
        },
      },
    ],
    [totalsByPo, workflowByPo],
  )

  const purchaseOrderSuggestions = useMemo(
    () => filteredPurchaseOrders.slice(0, 8).map((order) => ({
      id: order.id,
      title: formatPurchaseOrderNumber(order),
      subtitle: order.suppliers?.name ?? 'No supplier assigned',
      value: formatPurchaseOrderNumber(order),
      keywords: [
        order.suppliers?.name ?? '',
        workflowByPo[order.id]?.status.label ?? statusLabels[order.status],
      ],
      badge: 'PO',
    })),
    [filteredPurchaseOrders, workflowByPo],
  )

  usePageTopBarSearch(useMemo(() => ({
    searchKey: 'procurement-purchase-orders',
    placeholder: 'Search POs...',
    defaultSuggestions: [
      { id: 'procurement-po-approval', title: 'Pending Approval', subtitle: 'POs waiting for request approval', value: 'pending approval', badge: 'PO' },
      { id: 'procurement-po-transit', title: 'In Transit', subtitle: 'Open orders currently on the way', value: 'in transit', badge: 'PO' },
      { id: 'procurement-po-returns', title: 'Return Resolved', subtitle: 'Completed vendor return workflows', value: 'return resolved', badge: 'PO' },
    ],
    suggestions: purchaseOrderSuggestions,
  }), [purchaseOrderSuggestions]))

  const handleCreatePO = async () => {
    if (!newPoSupplier) return

    try {
      setMessage(null)
      await createPurchaseOrderMutation.mutateAsync({
        supplierId: newPoSupplier,
        expectedDate: newPoDate,
      })
      setIsCreating(false)
      setNewPoSupplier('')
      setNewPoDate('')
      setMessage({ tone: 'success', text: 'Purchase order request created.' })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Failed to create purchase order.',
      })
    }
  }

  const emptyStateDescription =
    purchaseOrders.length === 0
      ? 'Create your first purchase order to start tracking supplier commitments and incoming stock.'
      : normalizePageSearchTerm(searchValue).length > 0
        ? `No purchase orders matched "${normalizePageSearchTerm(searchValue)}". Try a different term or status filter.`
        : 'Try adjusting your search or status filter to find a matching purchase order.'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <Card variant="plain" className="flex min-h-0 flex-1 flex-col overflow-hidden" padding="none">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 md:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:min-w-[220px]">
            <FilterDropdown
              value={statusFilter}
              options={statusOptions}
              onChange={handleStatusFilterChange}
              ariaLabel="Purchase order status filter"
              menuClassName="min-w-[220px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={showAlertsHint ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]' : undefined}
              onClick={() => setShowAlertsHint((current) => !current)}
            >
              <span className="inline-flex items-center gap-2">
                <BellRing className="h-4 w-4" />
                Auto-Generate from Alerts
              </span>
              <Badge variant={lowStockProducts.length > 0 ? 'warning' : 'secondary'} size="sm">
                {lowStockProducts.length}
              </Badge>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={isCreating ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:bg-[var(--color-primary-hover)]' : undefined}
              onClick={() => setIsCreating((current) => !current)}
            >
              <Plus className="h-4 w-4" />
              Create PO
            </Button>
          </div>
        </div>

        {showAlertsHint ? (
          <div className="border-b border-dashed border-[var(--color-border-hover)] bg-[var(--color-muted)]/40 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-[var(--color-warning-light)] p-2 text-[var(--color-warning)]">
                  <Sparkles size={16} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Alert automation staging area</h3>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {lowStockProducts.length > 0
                      ? `${lowStockProducts.length} low-stock products are ready to seed future purchase-order automation.`
                      : 'No low-stock products are currently queued for purchase-order automation.'}
                  </p>
                </div>
              </div>

              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAlertsHint(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}

        {isCreating ? (
          <div className="border-b border-dashed border-[var(--color-border-hover)]">
            <CardHeader className="border-b border-[var(--color-border)] px-6 py-5">
              <CardTitle className="text-lg">Create Purchase Order</CardTitle>
            <CardDescription>Start a new purchase order request and assign the expected receiving date.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5 px-6 py-5">
              {loadingSuppliers ? (
                <div className="empty-state">Loading suppliers...</div>
              ) : !suppliersAvailable ? (
                <EmptyState
                  title="No suppliers available"
                  description="Suppliers will be managed in the dedicated Suppliers tab once that workflow is wired in."
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
                    Supplier
                    <Select
                      value={newPoSupplier}
                      onChange={(event) => setNewPoSupplier(event.target.value)}
                      placeholder="Select a supplier"
                      options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                    />
                  </label>

                  <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
                    Expected
                    <Input type="date" value={newPoDate} onChange={(event) => setNewPoDate(event.target.value)} />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  loading={createPurchaseOrderMutation.isPending}
                  disabled={!suppliersAvailable || !newPoSupplier}
                  onClick={handleCreatePO}
                >
                  <CheckCircle2 size={16} />
                  Create Request
                </Button>
              </div>
            </CardContent>
          </div>
        ) : null}

        {message ? (
          <div className="border-b border-[var(--color-border)] px-4 py-3 md:px-6">
            <p className={message.tone === 'error' ? 'text-sm text-[var(--color-destructive)]' : 'text-sm text-[var(--color-success)]'}>
              {message.text}
            </p>
          </div>
        ) : null}

        {loadingOrders ? (
          <div className="empty-state">Loading purchase orders...</div>
        ) : filteredPurchaseOrders.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState title="No purchase orders found" description={emptyStateDescription} />
          </div>
        ) : (
          <DataTable
            className="min-h-0 flex-1"
            columns={purchaseOrderColumns}
            rows={pagedPurchaseOrders}
            getRowId={(order) => order.id}
            minTableWidth={1120}
            tableLayout="fixed"
            sortField={tableSortField}
            sortDirection={tableSortDirection}
            onSortChange={handleTableSort}
            tableWrapClassName="border-0 bg-white"
            tableClassName="bg-white"
            pagination={{
              currentPage: currentTablePage,
              totalItems: filteredPurchaseOrders.length,
              itemsPerPage: tablePageSize,
              onPageChange: setTablePage,
              onItemsPerPageChange: handlePageSizeChange,
              pageSizeOptions: purchaseOrderPageSizeOptions,
            }}
          />
        )}
      </Card>
    </div>
  )
}
