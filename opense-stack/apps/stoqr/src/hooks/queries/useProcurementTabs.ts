import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPurchaseOrderItem,
  createPurchaseOrder,
  createSupplier,
  fetchPurchaseOrderHistory,
  fetchPurchaseOrderItems,
  fetchPurchaseOrders,
  fetchReceivingLogs,
  fetchSuppliers,
  recordPurchaseOrderReceipt,
} from '../../api/procurement'

const procurementKeys = {
  root: ['stoqr', 'procurement'] as const,
  suppliers: (companyId: string | null) => ['stoqr', 'procurement', 'suppliers', companyId] as const,
  purchaseOrders: (companyId: string | null) => ['stoqr', 'procurement', 'purchase-orders', companyId] as const,
  purchaseOrderItems: (companyId: string | null) => ['stoqr', 'procurement', 'purchase-order-items', companyId] as const,
  purchaseOrderHistory: (companyId: string | null) => ['stoqr', 'procurement', 'purchase-order-history', companyId] as const,
  receivingLogs: (companyId: string | null) => ['stoqr', 'procurement', 'receiving-logs', companyId] as const,
}

export const useProcurementSuppliers = (companyId: string | null) =>
  useQuery({
    queryKey: procurementKeys.suppliers(companyId),
    queryFn: () => fetchSuppliers(companyId as string),
    enabled: !!companyId,
  })

export const useProcurementPurchaseOrders = (companyId: string | null) =>
  useQuery({
    queryKey: procurementKeys.purchaseOrders(companyId),
    queryFn: () => fetchPurchaseOrders(companyId as string),
    enabled: !!companyId,
  })

export const useProcurementPurchaseOrderItems = (companyId: string | null) =>
  useQuery({
    queryKey: procurementKeys.purchaseOrderItems(companyId),
    queryFn: () => fetchPurchaseOrderItems(companyId as string),
    enabled: !!companyId,
  })

export const useProcurementOrderHistory = (companyId: string | null) =>
  useQuery({
    queryKey: procurementKeys.purchaseOrderHistory(companyId),
    queryFn: () => fetchPurchaseOrderHistory(companyId as string),
    enabled: !!companyId,
  })

export const useProcurementReceivingLogs = (companyId: string | null) =>
  useQuery({
    queryKey: procurementKeys.receivingLogs(companyId),
    queryFn: () => fetchReceivingLogs(companyId as string),
    enabled: !!companyId,
  })

export const useCreateProcurementSupplier = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; contact_name: string; email: string; phone: string }) => {
      if (!companyId) throw new Error('No company selected')
      await createSupplier(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.root })
    },
  })
}

export const useCreatePurchaseOrder = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { supplierId: string; expectedDate: string }) => {
      if (!companyId) throw new Error('No company selected')
      await createPurchaseOrder(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.root })
    },
  })
}

export const useCreatePurchaseOrderItem = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { poId: string; productId: string; quantityOrdered: number; unitCost: number }) => {
      if (!companyId) throw new Error('No company selected')
      await createPurchaseOrderItem(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.root })
    },
  })
}

export const useRecordPurchaseOrderReceipt = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { poId: string; productId: string; quantityReceived: number; notes?: string }) => {
      if (!companyId) throw new Error('No company selected')
      await recordPurchaseOrderReceipt(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: procurementKeys.root })
    },
  })
}
