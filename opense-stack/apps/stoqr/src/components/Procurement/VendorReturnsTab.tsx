import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { PurchaseOrderItem, Supplier } from '../../api/procurement'
import {
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
  useProcurementSuppliers,
} from '../../hooks/queries/useProcurementTabs'

type VendorReturnStatus = 'awaiting-return' | 'shipped' | 'resolved'
type CreditResolutionStatus = 'pending-replacement' | 'refund-issued' | 'credit-applied'

type VendorReturnRecord = {
  id: string
  supplierName: string
  rmaNumber: string
  itemDescription: string
  logisticsStatus: VendorReturnStatus
  creditStatus: CreditResolutionStatus
  createdAt: string
}

type VendorReturnFormState = {
  supplierName: string
  rmaNumber: string
  itemDescription: string
  logisticsStatus: VendorReturnStatus
  creditStatus: CreditResolutionStatus
}

const initialFormState: VendorReturnFormState = {
  supplierName: '',
  rmaNumber: '',
  itemDescription: '',
  logisticsStatus: 'awaiting-return',
  creditStatus: 'pending-replacement',
}

const logisticsPresentation: Record<VendorReturnStatus, {
  label: string
  legendLabel: string
  badgeVariant: 'warning' | 'info' | 'success'
  dotClassName: string
}> = {
  'awaiting-return': {
    label: 'Awaiting Return',
    legendLabel: 'Awaiting Return',
    badgeVariant: 'warning',
    dotClassName: 'bg-[var(--color-warning)]',
  },
  shipped: {
    label: 'Shipped to Vendor',
    legendLabel: 'Shipped',
    badgeVariant: 'info',
    dotClassName: 'bg-[var(--color-info)]',
  },
  resolved: {
    label: 'Resolved',
    legendLabel: 'Resolved',
    badgeVariant: 'success',
    dotClassName: 'bg-[var(--color-success)]',
  },
}

const creditPresentation: Record<CreditResolutionStatus, {
  label: string
  textClassName: string
  icon: 'dot' | 'check'
}> = {
  'pending-replacement': {
    label: 'Pending Replacement',
    textClassName: 'text-[var(--color-warning)]',
    icon: 'dot',
  },
  'refund-issued': {
    label: 'Refund Issued',
    textClassName: 'text-[var(--color-success)]',
    icon: 'check',
  },
  'credit-applied': {
    label: 'Credit Applied',
    textClassName: 'text-[var(--color-success)]',
    icon: 'check',
  },
}

const issuePrefixes = ['Defective', 'Damaged', 'Wrong', 'Incorrect'] as const
const rmaPrefixes = ['AUTH', 'RTN', 'V-RET', 'SUP'] as const
const statusSequence: VendorReturnStatus[] = ['awaiting-return', 'shipped', 'resolved']
const creditSequence: CreditResolutionStatus[] = ['pending-replacement', 'refund-issued', 'credit-applied']

const formatReturnId = (value: number) => `RMA-${String(value).padStart(3, '0')}`

const parseReturnId = (value: string) => Number(value.replace(/\D/g, ''))

const buildRmaNumber = (supplier: Supplier, index: number) => {
  const prefix = rmaPrefixes[index % rmaPrefixes.length]
  const suffix = String(Math.abs(
    supplier.name.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 97,
  )).slice(0, 4)

  return `${prefix}-${suffix}${index % 2 === 0 ? '-X' : 'A'}`
}

const buildItemDescription = (item: PurchaseOrderItem | null, index: number) => {
  const prefix = issuePrefixes[index % issuePrefixes.length]
  const itemName = item?.products?.name ?? 'Packaging materials'
  const quantity = item ? Math.max(Math.min(item.quantity_ordered, 9), 1) : 1

  return quantity > 1 ? `${prefix} ${itemName} (x${quantity})` : `${prefix} ${itemName}`
}

const buildBaseReturns = (
  suppliers: Supplier[],
  items: PurchaseOrderItem[],
  supplierNameByPoId: Map<string, string>,
) => {
  const candidates = suppliers
    .map((supplier) => {
      const supplierItems = items.filter((item) => supplierNameByPoId.get(item.po_id) === supplier.name)
      return { supplier, item: supplierItems[0] ?? null }
    })
    .filter((entry) => entry.item || entry.supplier.name)
    .slice(0, 6)

  return candidates.map((entry, index) => ({
    id: formatReturnId(401 - index),
    supplierName: entry.supplier.name,
    rmaNumber: buildRmaNumber(entry.supplier, index),
    itemDescription: buildItemDescription(entry.item, index),
    logisticsStatus: statusSequence[index % statusSequence.length],
    creditStatus: creditSequence[index % creditSequence.length],
    createdAt: new Date(2026, 9, 14 - index).toISOString(),
  } satisfies VendorReturnRecord))
}

const sortReturns = (returns: VendorReturnRecord[]) => {
  return [...returns].sort((left, right) => parseReturnId(right.id) - parseReturnId(left.id))
}

const formatCreatedAt = (value: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export const VendorReturnsTab = ({ companyId }: { companyId: string | null }) => {
  const { data: suppliers = [], isLoading: loadingSuppliers } = useProcurementSuppliers(companyId)
  const { data: purchaseOrders = [], isLoading: loadingOrders } = useProcurementPurchaseOrders(companyId)
  const { data: purchaseOrderItems = [], isLoading: loadingItems } = useProcurementPurchaseOrderItems(companyId)
  const [manualReturns, setManualReturns] = useState<VendorReturnRecord[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formState, setFormState] = useState<VendorReturnFormState>(initialFormState)

  const supplierNameByPoId = useMemo(() => {
    const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]))

    return new Map(
      purchaseOrders.map((order) => [
        order.id,
        supplierById.get(order.supplier_id ?? '') ?? order.suppliers?.name ?? 'Unknown supplier',
      ]),
    )
  }, [purchaseOrders, suppliers])

  const baseReturns = useMemo(
    () => buildBaseReturns(suppliers, purchaseOrderItems, supplierNameByPoId),
    [purchaseOrderItems, supplierNameByPoId, suppliers],
  )

  const allReturns = useMemo(() => sortReturns([...manualReturns, ...baseReturns]), [baseReturns, manualReturns])
  const isLoading = loadingSuppliers || loadingOrders || loadingItems

  const handleCreateReturn = () => {
    if (!formState.supplierName.trim() || !formState.rmaNumber.trim() || !formState.itemDescription.trim()) {
      toast.error('Complete the return form before saving.')
      return
    }

    const nextNumericId = allReturns.reduce((maxValue, record) => {
      const numericId = parseReturnId(record.id)
      return Number.isFinite(numericId) && numericId > maxValue ? numericId : maxValue
    }, 401) + 1

    const nextReturn: VendorReturnRecord = {
      id: formatReturnId(nextNumericId),
      supplierName: formState.supplierName.trim(),
      rmaNumber: formState.rmaNumber.trim(),
      itemDescription: formState.itemDescription.trim(),
      logisticsStatus: formState.logisticsStatus,
      creditStatus: formState.creditStatus,
      createdAt: new Date().toISOString(),
    }

    setManualReturns((current) => sortReturns([nextReturn, ...current]))
    setIsCreateDialogOpen(false)
    setFormState(initialFormState)
    toast.success('Vendor return logged.')
  }

  return (
    <>
      <div className="flex flex-col gap-6 pt-6">
        <Card padding="none" className="overflow-hidden">
          <CardContent className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={16} />
              Log New Return (RMA)
            </Button>

            <div className="flex flex-wrap items-center gap-6 text-sm text-[var(--color-foreground)]">
              {(['awaiting-return', 'shipped', 'resolved'] as const).map((status) => (
                <div key={status} className="inline-flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${logisticsPresentation[status].dotClassName}`} />
                  <span>{logisticsPresentation[status].legendLabel}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card padding="none" className="overflow-hidden">
          {isLoading ? (
            <div className="empty-state">Loading vendor returns...</div>
          ) : allReturns.length === 0 ? (
            <CardContent className="px-6 py-10">
              <EmptyState
                title="No vendor returns"
                description="Log RMAs for defective or mismatched supplier items to track refunds and credits."
              />
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Return ID
                    </TableHead>
                    <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Supplier &amp; RMA #
                    </TableHead>
                    <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Items
                    </TableHead>
                    <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Logistics Status
                    </TableHead>
                    <TableHead className="h-14 bg-[var(--color-muted)]/50 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Credit / Refund
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allReturns.map((record) => {
                    const logistics = logisticsPresentation[record.logisticsStatus]
                    const credit = creditPresentation[record.creditStatus]

                    return (
                      <TableRow key={record.id} className="h-[100px]">
                        <TableCell className="py-6 font-semibold text-[var(--color-foreground)]">{record.id}</TableCell>
                        <TableCell className="py-6">
                          <div className="space-y-1">
                            <p className="font-semibold text-[var(--color-foreground)]">{record.supplierName}</p>
                            <p className="text-sm text-[var(--color-muted-foreground)]">RMA: {record.rmaNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                          <div className="space-y-1">
                            <p className="text-[var(--color-foreground)]">{record.itemDescription}</p>
                            <p className="text-sm text-[var(--color-muted-foreground)]">Opened {formatCreatedAt(record.createdAt)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-6">
                          <Badge variant={logistics.badgeVariant} size="lg">
                            {logistics.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-6">
                          <div className={`inline-flex items-center gap-2 text-sm font-medium ${credit.textClassName}`}>
                            {credit.icon === 'check' ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full bg-current" />
                            )}
                            <span>{credit.label}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Log New Return (RMA)</DialogTitle>
            <DialogDescription>Create a supplier return record for refunds, replacements, or credits.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)] md:col-span-2">
              Supplier
              <Input
                value={formState.supplierName}
                onChange={(event) => setFormState({ ...formState, supplierName: event.target.value })}
                placeholder="Supplier name"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              RMA Number
              <Input
                value={formState.rmaNumber}
                onChange={(event) => setFormState({ ...formState, rmaNumber: event.target.value })}
                placeholder="AUTH-9921-X"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              Logistics Status
              <Select
                value={formState.logisticsStatus}
                onChange={(event) => setFormState({ ...formState, logisticsStatus: event.target.value as VendorReturnStatus })}
                options={[
                  { value: 'awaiting-return', label: logisticsPresentation['awaiting-return'].label },
                  { value: 'shipped', label: logisticsPresentation.shipped.label },
                  { value: 'resolved', label: logisticsPresentation.resolved.label },
                ]}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)] md:col-span-2">
              Item Description
              <Input
                value={formState.itemDescription}
                onChange={(event) => setFormState({ ...formState, itemDescription: event.target.value })}
                placeholder="Damaged component or packaging"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)] md:col-span-2">
              Credit / Refund Status
              <Select
                value={formState.creditStatus}
                onChange={(event) => setFormState({ ...formState, creditStatus: event.target.value as CreditResolutionStatus })}
                options={[
                  { value: 'pending-replacement', label: creditPresentation['pending-replacement'].label },
                  { value: 'refund-issued', label: creditPresentation['refund-issued'].label },
                  { value: 'credit-applied', label: creditPresentation['credit-applied'].label },
                ]}
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateReturn}>
              Save Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}