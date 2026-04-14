import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { AlertCircle, CalendarDays, ScanSearch, Truck } from 'lucide-react'
import type { PurchaseOrder, PurchaseOrderItem, ReceivingLog } from '../../api/procurement'
import {
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
  useProcurementReceivingLogs,
} from '../../hooks/queries/useProcurementTabs'

type IncomingShipmentStatus = 'In Transit' | 'Discrepancy' | 'Awaiting Scan'

type ShipmentSummary = {
  id: string
  purchaseOrderLabel: string
  supplierName: string
  itemsExpected: number
  etaLabel: string
  etaTimestamp: number
  status: IncomingShipmentStatus
}

const statusVariantMap: Record<IncomingShipmentStatus, 'info' | 'destructive' | 'secondary'> = {
  'In Transit': 'info',
  Discrepancy: 'destructive',
  'Awaiting Scan': 'secondary',
}

const formatPurchaseOrderNumber = (order: PurchaseOrder) => {
  const year = new Date(order.created_at).getFullYear()
  return `PO-${year}-${String(order.po_number).padStart(4, '0')}`
}

const buildShipmentId = (poNumber: number) => `SHP-${String(poNumber + 8880).padStart(4, '0')}`

const isSameDay = (left: Date, right: Date) => (
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
)

const formatEtaLabel = (value: string | null | undefined, today: Date) => {
  if (!value) return 'TBD'

  const date = new Date(value)
  if (isSameDay(date, today)) return 'Today'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const summarizeItemsByPo = (items: PurchaseOrderItem[]) => {
  return items.reduce<Record<string, { ordered: number; received: number }>>((acc, item) => {
    const summary = acc[item.po_id] ?? { ordered: 0, received: 0 }
    summary.ordered += item.quantity_ordered
    summary.received += item.quantity_received
    acc[item.po_id] = summary
    return acc
  }, {})
}

const determineShipmentStatus = (
  order: PurchaseOrder,
  remainingUnits: number,
  hasReceivingActivity: boolean,
  today: Date,
) => {
  if (order.status === 'partial' || (hasReceivingActivity && remainingUnits > 0)) {
    return 'Discrepancy'
  }

  if (order.expected_date && isSameDay(new Date(order.expected_date), today)) {
    return 'In Transit'
  }

  return 'Awaiting Scan'
}

const buildShipmentSummaries = (
  orders: PurchaseOrder[],
  items: PurchaseOrderItem[],
  logs: ReceivingLog[],
  today: Date,
): ShipmentSummary[] => {
  const itemTotalsByPo = summarizeItemsByPo(items)
  const receivingActivityPoIds = new Set(logs.map((log) => log.po_id).filter((poId): poId is string => Boolean(poId)))

  return orders
    .filter((order) => !['closed', 'cancelled'].includes(order.status))
    .map((order) => {
      const itemSummary = itemTotalsByPo[order.id] ?? { ordered: 0, received: 0 }
      const remainingUnits = Math.max(itemSummary.ordered - itemSummary.received, 0)

      return {
        id: buildShipmentId(order.po_number),
        purchaseOrderLabel: formatPurchaseOrderNumber(order),
        supplierName: order.suppliers?.name ?? 'Unknown supplier',
        itemsExpected: remainingUnits,
        etaLabel: formatEtaLabel(order.expected_date, today),
        etaTimestamp: order.expected_date ? new Date(order.expected_date).getTime() : Number.MAX_SAFE_INTEGER,
        status: determineShipmentStatus(order, remainingUnits, receivingActivityPoIds.has(order.id), today),
      }
    })
    .sort((left, right) => left.etaTimestamp - right.etaTimestamp)
}

export const IncomingReceivingTab = ({ companyId }: { companyId: string | null }) => {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const { data: purchaseOrders = [], isLoading: loadingOrders } = useProcurementPurchaseOrders(companyId)
  const { data: purchaseOrderItems = [], isLoading: loadingItems } = useProcurementPurchaseOrderItems(companyId)
  const { data: receivingLogs = [], isLoading: loadingLogs } = useProcurementReceivingLogs(companyId)

  const shipments = useMemo(
    () => buildShipmentSummaries(purchaseOrders, purchaseOrderItems, receivingLogs, today),
    [purchaseOrders, purchaseOrderItems, receivingLogs, today],
  )

  const expectedTodayCount = useMemo(
    () => shipments.filter((shipment) => shipment.etaLabel === 'Today').length,
    [shipments],
  )
  const discrepancyCount = useMemo(
    () => shipments.filter((shipment) => shipment.status === 'Discrepancy').length,
    [shipments],
  )
  const isLoading = loadingOrders || loadingItems || loadingLogs

  return (
    <div className="flex flex-col gap-6 pt-6">
      <div className="grid gap-6 xl:grid-cols-[repeat(2,minmax(0,1fr))_280px]">
        <Card padding="none" className="overflow-hidden">
          <CardContent className="flex h-full items-start justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Expected Today</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.04em] text-[var(--color-foreground)]">
                {expectedTodayCount}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Across {shipments.length} POs</p>
            </div>

            <div className="rounded-full bg-[var(--color-primary-light)]/40 p-2.5 text-[var(--color-primary)]">
              <Truck size={18} />
            </div>
          </CardContent>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <CardContent className="flex h-full items-start justify-between gap-4 p-6">
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">Discrepancies</p>
              <p className="mt-2 text-5xl font-semibold tracking-[-0.04em] text-[var(--color-destructive)]">
                {discrepancyCount}
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Requires follow-up</p>
            </div>

            <div className="rounded-full bg-[var(--color-destructive-light)]/50 p-2.5 text-[var(--color-destructive)]">
              <AlertCircle size={18} />
            </div>
          </CardContent>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <CardContent className="flex h-full items-center justify-center p-6">
            <Button
              type="button"
              size="lg"
              className="w-full max-w-[220px] bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90"
              onClick={() => navigate('/scan/scan-actions')}
            >
              <ScanSearch size={18} />
              Open Scanner App
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Incoming Shipments</h2>
          <Button type="button" variant="ghost" size="sm" className="text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30">
            <CalendarDays size={16} />
            View Calendar
          </Button>
        </div>

        {isLoading ? (
          <div className="empty-state">Loading incoming shipments...</div>
        ) : shipments.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState
              title="No incoming shipments"
              description="Open purchase orders with expected receipts will appear here once they are in flight."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Shipment ID
                  </TableHead>
                  <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Associated PO
                  </TableHead>
                  <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Supplier
                  </TableHead>
                  <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Items Expected
                  </TableHead>
                  <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    ETA
                  </TableHead>
                  <TableHead className="h-14 bg-[var(--color-muted)]/50 text-right text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <TableRow key={shipment.id} className="h-[76px]">
                    <TableCell className="py-5 font-semibold text-[var(--color-foreground)]">{shipment.id}</TableCell>
                    <TableCell className="py-5">
                      <span className="font-medium text-[var(--color-primary)]">{shipment.purchaseOrderLabel}</span>
                    </TableCell>
                    <TableCell className="py-5 text-[var(--color-muted-foreground)]">{shipment.supplierName}</TableCell>
                    <TableCell className="py-5 text-[var(--color-muted-foreground)]">{shipment.itemsExpected} units</TableCell>
                    <TableCell className="py-5 font-medium text-[var(--color-foreground)]">{shipment.etaLabel}</TableCell>
                    <TableCell className="py-5 text-right">
                      <Badge variant={statusVariantMap[shipment.status]} size="lg">
                        {shipment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}