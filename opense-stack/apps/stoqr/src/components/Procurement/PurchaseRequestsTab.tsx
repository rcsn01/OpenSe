import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from '@repo/ui'
import { ArrowUpRight, Plus, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { useProcurementProducts } from '../../hooks/queries/useProcurement'
import { useProcurementReceivingLogs } from '../../hooks/queries/useProcurementTabs'

type PurchaseRequestStatus = 'pending' | 'approved' | 'denied'

type PurchaseRequest = {
  id: string
  requesterName: string
  department: string
  itemName: string
  quantity: number
  status: PurchaseRequestStatus
  requestedAt: string
}

type RequesterIdentity = {
  name: string
  department: string
}

type RequestFormState = {
  requesterName: string
  department: string
  itemName: string
  quantity: number
}

const fallbackRequesters: RequesterIdentity[] = [
  { name: 'John Doe', department: 'Warehouse' },
  { name: 'Jane Smith', department: 'Office' },
  { name: 'Bob Wilson', department: 'Floor' },
  { name: 'Sarah Jenkins', department: 'Operations' },
  { name: 'Mike Chen', department: 'Purchasing' },
]

const statusSequence: PurchaseRequestStatus[] = ['pending', 'approved', 'denied']

const initialFormState: RequestFormState = {
  requesterName: '',
  department: '',
  itemName: '',
  quantity: 1,
}

const formatRequestId = (value: number) => `REQ-${String(value).padStart(4, '0')}`

const parseRequestId = (requestId: string) => Number(requestId.replace(/\D/g, ''))

const formatDateLabel = (value: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

const getRequesterPool = (profiles: Array<{ full_name: string | null; username: string | null } | null>) => {
  const knownNames = Array.from(
    new Set(
      profiles
        .map((profile) => profile?.full_name ?? profile?.username ?? null)
        .filter((name): name is string => Boolean(name?.trim())),
    ),
  )

  if (knownNames.length === 0) return fallbackRequesters

  return knownNames.map((name, index) => ({
    name,
    department: fallbackRequesters[index % fallbackRequesters.length]?.department ?? 'Operations',
  }))
}

const buildBaseRequests = (
  products: Array<{ name: string; quantity_on_hand: number; reorder_point: number }>,
  requesterPool: RequesterIdentity[],
) => {
  const prioritizedProducts = [...products]
    .filter((product) => product.reorder_point > 0)
    .sort((left, right) => {
      const leftShortfall = left.reorder_point - left.quantity_on_hand
      const rightShortfall = right.reorder_point - right.quantity_on_hand
      return rightShortfall - leftShortfall
    })

  const candidateProducts = (prioritizedProducts.length > 0 ? prioritizedProducts : [...products])
    .slice(0, 6)

  return candidateProducts.map((product, index) => {
    const requester = requesterPool[index % requesterPool.length] ?? fallbackRequesters[index % fallbackRequesters.length]
    const quantity = Math.max(product.reorder_point > 0 ? product.reorder_point - product.quantity_on_hand + 1 : index + 1, 1)
    const requestedAt = new Date(2026, 9, 14 - index).toISOString()

    return {
      id: formatRequestId(89 - index),
      requesterName: requester.name,
      department: requester.department,
      itemName: product.name,
      quantity,
      status: statusSequence[index % statusSequence.length],
      requestedAt,
    } satisfies PurchaseRequest
  })
}

const statusPresentation: Record<PurchaseRequestStatus, {
  label: string
  badgeVariant: 'warning' | 'success' | 'destructive'
  iconClassName: string
  cardClassName: string
}> = {
  pending: {
    label: 'Pending Approval',
    badgeVariant: 'warning',
    iconClassName: 'bg-[var(--color-warning-light)]/70 text-[var(--color-warning)]',
    cardClassName: 'border-[var(--color-border)]',
  },
  approved: {
    label: 'Approved',
    badgeVariant: 'success',
    iconClassName: 'bg-[var(--color-success-light)]/70 text-[var(--color-success)]',
    cardClassName: 'border-[var(--color-primary)]/55 shadow-[0_0_0_1px_var(--color-primary-light)]',
  },
  denied: {
    label: 'Denied',
    badgeVariant: 'destructive',
    iconClassName: 'bg-[var(--color-destructive-light)]/70 text-[var(--color-destructive)]',
    cardClassName: 'border-[var(--color-border)]',
  },
}

export const PurchaseRequestsTab = ({ companyId }: { companyId: string | null }) => {
  const navigate = useNavigate()
  const { data: products = [], isLoading: loadingProducts } = useProcurementProducts(companyId)
  const { data: receivingLogs = [], isLoading: loadingLogs } = useProcurementReceivingLogs(companyId)
  const [manualRequests, setManualRequests] = useState<PurchaseRequest[]>([])
  const [statusOverrides, setStatusOverrides] = useState<Record<string, PurchaseRequestStatus>>({})
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [formState, setFormState] = useState<RequestFormState>(initialFormState)

  const requesterPool = useMemo(
    () => getRequesterPool(receivingLogs.map((log) => log.profiles ?? null)),
    [receivingLogs],
  )

  const baseRequests = useMemo(
    () => buildBaseRequests(products, requesterPool),
    [products, requesterPool],
  )

  const requests = useMemo(() => {
    return [...manualRequests, ...baseRequests]
      .map((request) => ({
        ...request,
        status: statusOverrides[request.id] ?? request.status,
      }))
      .sort((left, right) => new Date(right.requestedAt).getTime() - new Date(left.requestedAt).getTime())
  }, [baseRequests, manualRequests, statusOverrides])

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null
  const isLoading = loadingProducts || loadingLogs

  const setRequestStatus = (requestId: string, status: PurchaseRequestStatus) => {
    setStatusOverrides((current) => ({
      ...current,
      [requestId]: status,
    }))
  }

  const handleApprove = (requestId: string) => {
    setRequestStatus(requestId, 'approved')
    toast.success('Purchase request approved.')
  }

  const handleDeny = (requestId: string) => {
    setRequestStatus(requestId, 'denied')
    toast.success('Purchase request denied.')
  }

  const handleConvertToPo = (requestId: string) => {
    setRequestStatus(requestId, 'approved')
    toast.success('Open purchase orders to convert this request into a PO.')
    navigate('/procurement/purchase-orders')
  }

  const handleCreateRequest = () => {
    if (!formState.requesterName.trim() || !formState.department.trim() || !formState.itemName.trim()) {
      toast.error('Complete the request form before saving.')
      return
    }

    const nextNumericId = requests.reduce((maxValue, request) => {
      const numericId = parseRequestId(request.id)
      return Number.isFinite(numericId) && numericId > maxValue ? numericId : maxValue
    }, 89) + 1

    const nextRequest: PurchaseRequest = {
      id: formatRequestId(nextNumericId),
      requesterName: formState.requesterName.trim(),
      department: formState.department.trim(),
      itemName: formState.itemName.trim(),
      quantity: Math.max(formState.quantity, 1),
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }

    setManualRequests((current) => [nextRequest, ...current])
    setIsCreateDialogOpen(false)
    setFormState(initialFormState)
    toast.success('Purchase request created.')
  }

  return (
    <>
      <div className="flex flex-col gap-6 pt-6">
        <Card padding="none" className="overflow-hidden">
          <CardContent className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
                Internal Requisitions
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Review and convert staff requests into Purchase Orders.
              </p>
            </div>

            <Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus size={16} />
              New Request
            </Button>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="empty-state">Loading purchase requests...</div>
        ) : requests.length === 0 ? (
          <Card padding="none" className="overflow-hidden">
            <CardContent className="px-6 py-10">
              <EmptyState
                title="No purchase requests"
                description="Create a requisition to start internal approval and PO conversion workflows."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((request) => {
              const presentation = statusPresentation[request.status]

              return (
                <Card key={request.id} padding="none" className={`overflow-hidden ${presentation.cardClassName}`}>
                  <CardContent className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${presentation.iconClassName}`}>
                        <ShoppingCart size={20} />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)]">
                            {request.id}
                          </h3>
                          <Badge variant={presentation.badgeVariant} size="lg">
                            {presentation.label}
                          </Badge>
                        </div>

                        <p className="text-sm text-[var(--color-foreground)]">
                          <span className="font-semibold">Requested by:</span>{' '}
                          {request.requesterName} ({request.department})
                        </p>
                        <p className="text-sm text-[var(--color-foreground)]">
                          <span className="font-semibold">Items:</span>{' '}
                          {request.itemName} (x{request.quantity})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 lg:min-w-[250px] lg:items-end">
                      <div className="text-sm text-[var(--color-muted-foreground)] lg:border-l lg:border-[var(--color-border)] lg:pl-6">
                        {formatDateLabel(request.requestedAt)}
                      </div>

                      <div className="flex flex-wrap gap-3 lg:justify-end">
                        {request.status === 'pending' ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              className="bg-[var(--color-success-light)]/55 text-[var(--color-success)] hover:bg-[var(--color-success-light)]"
                              onClick={() => handleApprove(request.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="bg-[var(--color-destructive-light)]/55 text-[var(--color-destructive)] hover:bg-[var(--color-destructive-light)]"
                              onClick={() => handleDeny(request.id)}
                            >
                              Deny
                            </Button>
                          </>
                        ) : request.status === 'approved' ? (
                          <Button type="button" onClick={() => handleConvertToPo(request.id)}>
                            Convert to PO
                            <ArrowUpRight size={16} />
                          </Button>
                        ) : (
                          <Button type="button" variant="outline" onClick={() => setSelectedRequestId(request.id)}>
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Purchase Request</DialogTitle>
            <DialogDescription>Create an internal requisition for approval and PO conversion.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              Requester Name
              <Input
                value={formState.requesterName}
                onChange={(event) => setFormState({ ...formState, requesterName: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              Department
              <Input
                value={formState.department}
                onChange={(event) => setFormState({ ...formState, department: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)] md:col-span-2">
              Item
              <Input
                value={formState.itemName}
                onChange={(event) => setFormState({ ...formState, itemName: event.target.value })}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              Quantity
              <Input
                type="number"
                min={1}
                value={formState.quantity}
                onChange={(event) => setFormState({ ...formState, quantity: Number(event.target.value) || 1 })}
              />
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateRequest}>
              Save Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRequest)} onClose={() => setSelectedRequestId(null)}>
        <DialogContent className="max-w-xl">
          {selectedRequest ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRequest.id}</DialogTitle>
                <DialogDescription>Review the internal requisition details for this request.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Status
                  </p>
                  <div className="mt-3">
                    <Badge variant={statusPresentation[selectedRequest.status].badgeVariant} size="lg">
                      {statusPresentation[selectedRequest.status].label}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                    Submitted
                  </p>
                  <p className="mt-3 text-sm font-medium text-[var(--color-foreground)]">
                    {formatDateLabel(selectedRequest.requestedAt)}
                  </p>
                </div>

                <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 sm:col-span-2">
                  <div className="flex flex-col gap-3 text-sm text-[var(--color-foreground)]">
                    <p><span className="font-semibold">Requester:</span> {selectedRequest.requesterName}</p>
                    <p><span className="font-semibold">Department:</span> {selectedRequest.department}</p>
                    <p><span className="font-semibold">Item:</span> {selectedRequest.itemName}</p>
                    <p><span className="font-semibold">Quantity:</span> {selectedRequest.quantity}</p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setSelectedRequestId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}