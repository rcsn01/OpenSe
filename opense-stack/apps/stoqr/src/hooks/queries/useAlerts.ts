import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAlertRule,
  fetchAlertDeliveryLogs,
  fetchAlertEvents,
  fetchAlertProducts,
  fetchAlertRules,
  updateAlertEventStatus,
  updateAlertRuleEnabled,
} from '../../api/alerts'

const alertsKeys = {
  root: (companyId: string | null) => ['stoqr', 'alerts', companyId] as const,
  products: (companyId: string | null) => ['stoqr', 'alerts', 'products', companyId] as const,
  rules: (companyId: string | null) => ['stoqr', 'alerts', 'rules', companyId] as const,
  events: (companyId: string | null) => ['stoqr', 'alerts', 'events', companyId] as const,
  deliveries: (companyId: string | null) => ['stoqr', 'alerts', 'deliveries', companyId] as const,
}

export const useAlertProducts = (companyId: string | null) =>
  useQuery({
    queryKey: alertsKeys.products(companyId),
    queryFn: () => fetchAlertProducts(companyId as string),
    enabled: !!companyId,
  })

export const useAlertRules = (companyId: string | null) =>
  useQuery({
    queryKey: alertsKeys.rules(companyId),
    queryFn: () => fetchAlertRules(companyId as string),
    enabled: !!companyId,
  })

export const useAlertEvents = (companyId: string | null) =>
  useQuery({
    queryKey: alertsKeys.events(companyId),
    queryFn: () => fetchAlertEvents(companyId as string),
    enabled: !!companyId,
  })

export const useAlertDeliveryLogs = (companyId: string | null) =>
  useQuery({
    queryKey: alertsKeys.deliveries(companyId),
    queryFn: () => fetchAlertDeliveryLogs(companyId as string),
    enabled: !!companyId,
  })

export const useCreateAlertRule = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      name: string
      alertType: 'low_stock' | 'reorder_point' | 'expiration' | 'custom'
      condition: Record<string, unknown>
      deliveryChannels: Array<'in_app' | 'email' | 'push'>
      recipients: string[]
    }) => {
      if (!companyId) throw new Error('No company selected')
      await createAlertRule(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.root(companyId) })
    },
  })
}

export const useUpdateAlertRuleEnabled = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { ruleId: string; enabled: boolean }) => {
      if (!companyId) throw new Error('No company selected')
      await updateAlertRuleEnabled(companyId, payload.ruleId, payload.enabled)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.root(companyId) })
    },
  })
}

export const useUpdateAlertEventStatus = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { eventId: string; status: 'open' | 'acknowledged' | 'resolved' }) => {
      if (!companyId) throw new Error('No company selected')
      await updateAlertEventStatus(companyId, payload.eventId, payload.status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.root(companyId) })
    },
  })
}
