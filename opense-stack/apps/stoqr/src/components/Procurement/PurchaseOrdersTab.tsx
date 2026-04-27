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
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
  Select,
} from '@repo/ui'
import { BellRing, Building2, CheckCircle2, ChevronDown, Filter, Plus, Search, Sparkles } from 'lucide-react'
import type { PurchaseOrder } from '../../api/procurement'
import {
  useCreatePurchaseOrder,
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
  useProcurementSuppliers,
} from '../../hooks/queries/useProcurementTabs'
import { useProcurementProducts } from '../../hooks/queries/useProcurement'
import { formatCurrency } from '../../utils'

type StatusFilter = 'all' | PurchaseOrder['status']
type ApprovalStatus = NonNullable<PurchaseOrder['approval_status']>
type ReturnStatus = NonNullable<PurchaseOrder['return_status']>

type WorkflowBadge = {
  label: string
  variant: 'warning' | 'info' | 'secondary' | 'success' | 'destructive'
}

type OrderWorkflowSummary = {
  request: WorkflowBadge
  order: WorkflowBadge
  returnStatus: WorkflowBadge | null
  orderedUnits: number
  receivedUnits: number
}

const statusLabels: Record<PurchaseOrder['status'], string> = {
  draft: 'Awaiting Supplier',
  sent: 'In Transit',
  partial: 'Partial Receipt',
  closed: 'Received',
  cancelled: 'Cancelled',
}

const statusVariants: Record<PurchaseOrder['status'], 'warning' | 'info' | 'secondary' | 'success' | 'destructive'> = {
  draft: 'warning',
  sent: 'info',
  partial: 'secondary',
  closed: 'success',
  cancelled: 'destructive',
}

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: statusLabels.draft },
  { value: 'sent', label: statusLabels.sent },
  { value: 'partial', label: statusLabels.partial },
  { value: 'closed', label: statusLabels.closed },
  { value: 'cancelled', label: statusLabels.cancelled },
]

const approvalStatusLabels: Record<ApprovalStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  denied: 'Denied',
}

const approvalStatusVariants: Record<ApprovalStatus, WorkflowBadge['variant']> = {
  pending: 'warning',
  approved: 'success',
  denied: 'destructive',
}

const returnStatusLabels: Record<Exclude<ReturnStatus, 'none'>, string> = {
  awaiting_return: 'Awaiting Return',
  shipped: 'Shipped to Vendor',
  resolved: 'Resolved',
}

const returnStatusVariants: Record<Exclude<ReturnStatus, 'none'>, WorkflowBadge['variant']> = {
  awaiting_return: 'warning',
  shipped: 'info',
  resolved: 'success',
}

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

const getApprovalWorkflow = (approvalStatus: ApprovalStatus): WorkflowBadge => {
  return {
    label: approvalStatusLabels[approvalStatus],
    variant: approvalStatusVariants[approvalStatus],
  }
}

const getOrderWorkflow = (status: PurchaseOrder['status']): WorkflowBadge => {
  return {
    label: statusLabels[status],
    variant: statusVariants[status],
  }
}

const getReturnWorkflow = (returnStatus: ReturnStatus): WorkflowBadge | null => {
  if (returnStatus === 'none') {
    return null
  }

  return {
    label: returnStatusLabels[returnStatus],
    variant: returnStatusVariants[returnStatus],
  }
}

export const PurchaseOrdersTab = ({ companyId }: { companyId: string | null }) => {
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showAlertsHint, setShowAlertsHint] = useState(false)
  const [newPoSupplier, setNewPoSupplier] = useState('')
  const [newPoDate, setNewPoDate] = useState('')
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

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
      const approvalStatus = order.approval_status ?? 'pending'
      const returnStatus = order.return_status ?? 'none'

      acc[order.id] = {
        request: getApprovalWorkflow(approvalStatus),
        order: getOrderWorkflow(order.status),
        returnStatus: getReturnWorkflow(returnStatus),
        orderedUnits: totals.ordered,
        receivedUnits: totals.received,
      }
      return acc
    }, {})
  }, [purchaseOrderItems, purchaseOrders])

  const filteredPurchaseOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return purchaseOrders.filter((order) => {
      const poNumber = formatPurchaseOrderNumber(order).toLowerCase()
      const supplierName = order.suppliers?.name?.toLowerCase() ?? ''
      const workflow = workflowByPo[order.id]
      const workflowText = workflow
        ? [workflow.request.label, workflow.order.label, workflow.returnStatus?.label ?? ''].join(' ').toLowerCase()
        : ''
      const matchesSearch =
        normalizedSearch.length === 0
        || poNumber.includes(normalizedSearch)
        || supplierName.includes(normalizedSearch)
        || workflowText.includes(normalizedSearch)
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [purchaseOrders, searchTerm, statusFilter, workflowByPo])

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
      setMessage({ tone: 'success', text: 'Purchase order draft created.' })
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
      : 'Try adjusting your search or status filter to find a matching purchase order.'

  return (
    <div className="flex flex-col gap-6">
      <Card className="overflow-hidden" padding="none">
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="min-w-[140px]" onClick={() => setIsCreating((current) => !current)}>
              <Plus size={16} />
              Create PO
            </Button>

            <Button
              type="button"
              variant="outline"
              className="min-w-[220px] justify-between"
              onClick={() => setShowAlertsHint((current) => !current)}
            >
              <span className="inline-flex items-center gap-2">
                <BellRing size={16} />
                Auto-Generate from Alerts
              </span>
              <Badge variant={lowStockProducts.length > 0 ? 'warning' : 'secondary'} size="sm">
                {lowStockProducts.length}
              </Badge>
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:min-w-[420px] xl:justify-end">
            <div className="w-full sm:max-w-[320px]">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search POs..."
                prefix={<Search size={16} />}
              />
            </div>

            <Dropdown
              align="right"
              trigger={
                <Button type="button" variant="outline" className="min-w-[132px] justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Filter size={16} />
                    Filter
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {statusFilter !== 'all' ? (
                      <Badge variant="secondary" size="sm">
                        {statusLabels[statusFilter]}
                      </Badge>
                    ) : null}
                    <ChevronDown size={16} />
                  </span>
                </Button>
              }
            >
              {statusOptions.map((option) => (
                <DropdownItem
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={statusFilter === option.value ? 'bg-[var(--color-muted)]' : undefined}
                >
                  {option.label}
                </DropdownItem>
              ))}
            </Dropdown>
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
              <CardDescription>Start a new draft order and assign the expected receiving date.</CardDescription>
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
                  Create Draft
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
            columns={[
              {
                id: 'po-number',
                header: 'PO Number',
                cellClassName: '!py-5',
                renderCell: (order) => (
                  <span className="text-sm font-semibold text-[var(--color-primary)]">
                    {formatPurchaseOrderNumber(order)}
                  </span>
                ),
              },
              {
                id: 'supplier',
                header: 'Supplier',
                cellClassName: '!py-5',
                renderCell: (order) => (
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[var(--color-muted)] p-2 text-[var(--color-muted-foreground)]">
                      <Building2 size={16} />
                    </div>
                    <span className="font-medium text-[var(--color-foreground)]">
                      {order.suppliers?.name ?? 'Unknown supplier'}
                    </span>
                  </div>
                ),
              },
              {
                id: 'created',
                header: 'Created',
                cellClassName: '!py-5 text-[var(--color-muted-foreground)]',
                renderCell: (order) => formatDateLabel(order.created_at),
              },
              {
                id: 'expected',
                header: 'Expected',
                cellClassName: '!py-5 text-[var(--color-muted-foreground)]',
                renderCell: (order) => formatDateLabel(order.expected_date),
              },
              {
                id: 'total',
                header: 'Total',
                align: 'right',
                cellClassName: '!py-5 font-semibold text-[var(--color-foreground)]',
                renderCell: (order) => formatCurrency(order.total_amount ?? totalsByPo[order.id] ?? 0),
              },
              {
                id: 'workflow',
                header: 'Workflow',
                cellClassName: '!py-5',
                renderCell: (order) => {
                  const workflow = workflowByPo[order.id] ?? {
                    request: { label: 'Pending Approval', variant: 'warning' as const },
                    order: { label: statusLabels[order.status], variant: statusVariants[order.status] },
                    returnStatus: null,
                    orderedUnits: 0,
                    receivedUnits: 0,
                  }

                  return (
                    <div className="flex min-w-[280px] flex-col gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          Request
                        </span>
                        <Badge variant={workflow.request.variant} size="md">
                          {workflow.request.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          Order
                        </span>
                        <Badge variant={workflow.order.variant} size="md">
                          {workflow.order.label}
                        </Badge>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {workflow.receivedUnits}/{workflow.orderedUnits} units received
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                          Return
                        </span>
                        {workflow.returnStatus ? (
                          <Badge variant={workflow.returnStatus.variant} size="md">
                            {workflow.returnStatus.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[var(--color-muted-foreground)]">No return</span>
                        )}
                      </div>
                    </div>
                  )
                },
              },
            ]}
            rows={filteredPurchaseOrders}
            getRowId={(order) => order.id}
            minTableWidth={1120}
            tableWrapClassName="border-0 rounded-none"
          />
        )}
      </Card>
    </div>
  )
}
