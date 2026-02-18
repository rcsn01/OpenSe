import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPurchaseOrder,
  createSupplier,
  fetchPurchaseOrders,
  fetchReceivingLogs,
  fetchSuppliers,
} from '../../api/procurement'

const procurementKeys = {
  root: ['stoqr', 'procurement'] as const,
  suppliers: (companyId: string | null) => ['stoqr', 'procurement', 'suppliers', companyId] as const,
  purchaseOrders: (companyId: string | null) => ['stoqr', 'procurement', 'purchase-orders', companyId] as const,
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
