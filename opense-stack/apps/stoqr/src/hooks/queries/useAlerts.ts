import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAlertConnector,
  createAlertConnectorTarget,
  createAlertRule,
  dispatchAlertEmails,
  dispatchAlertNotifications,
  fetchAlertRule,
  fetchAlertConnectors,
  fetchAlertDeliveryLogs,
  fetchAlertEvents,
  fetchAlertProducts,
  fetchAlertRules,
  testAlertConnectorTarget,
  testAlertEmailRecipients,
  updateAlertRule,
  updateAlertEventStatus,
  updateAlertRuleEnabled,
} from '../../api/alerts'

const alertsKeys = {
  root: (companyId: string | null) => ['stoqr', 'alerts', companyId] as const,
  products: (companyId: string | null) => ['stoqr', 'alerts', 'products', companyId] as const,
  rules: (companyId: string | null) => ['stoqr', 'alerts', 'rules', companyId] as const,
  rule: (companyId: string | null, ruleId: string | null) => ['stoqr', 'alerts', 'rules', companyId, ruleId] as const,
  connectors: (companyId: string | null) => ['stoqr', 'alerts', 'connectors', companyId] as const,
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

export const useAlertRule = (companyId: string | null, ruleId: string | null) =>
  useQuery({
    queryKey: alertsKeys.rule(companyId, ruleId),
    queryFn: () => fetchAlertRule(companyId as string, ruleId as string),
    enabled: !!companyId && !!ruleId,
  })

export const useAlertConnectors = (companyId: string | null) =>
  useQuery({
    queryKey: alertsKeys.connectors(companyId),
    queryFn: () => fetchAlertConnectors(companyId as string),
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
      deliveryChannels: Array<'in_app' | 'email' | 'push' | 'telegram' | 'mattermost'>
      recipients: string[]
      connectorTargetIds?: string[]
      enabled?: boolean
    }) => {
      if (!companyId) throw new Error('No company selected')
      await createAlertRule(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.root(companyId) })
    },
  })
}

export const useUpdateAlertRule = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      ruleId: string
      name: string
      alertType: 'low_stock' | 'reorder_point' | 'expiration' | 'custom'
      condition: Record<string, unknown>
      deliveryChannels: Array<'in_app' | 'email' | 'push' | 'telegram' | 'mattermost'>
      recipients: string[]
      connectorTargetIds?: string[]
      enabled: boolean
    }) => {
      if (!companyId) throw new Error('No company selected')
      const { ruleId, ...rulePayload } = payload
      await updateAlertRule(companyId, ruleId, rulePayload)
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

export const useDispatchAlertEmails = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company selected')
      return dispatchAlertEmails(companyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.root(companyId) })
    },
  })
}

export const useDispatchAlertNotifications = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company selected')
      return dispatchAlertNotifications(companyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.root(companyId) })
    },
  })
}

export const useCreateAlertConnector = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      provider: 'telegram' | 'mattermost'
      displayName: string
      status?: 'disconnected' | 'pairing' | 'connected' | 'error'
    }) => {
      if (!companyId) throw new Error('No company selected')
      return createAlertConnector(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.connectors(companyId) })
    },
  })
}

export const useCreateAlertConnectorTarget = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      connectorId: string
      payload: {
        targetType: 'chat' | 'group' | 'channel' | 'webhook'
        targetName: string
        providerTargetId: string
      }
    }) => createAlertConnectorTarget(payload.connectorId, payload.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertsKeys.connectors(companyId) })
    },
  })
}

export const useTestAlertConnectorTarget = (companyId: string | null) =>
  useMutation({
    mutationFn: async (targetId: string) => {
      if (!companyId) throw new Error('No company selected')
      return testAlertConnectorTarget(companyId, targetId)
    },
  })

export const useTestAlertEmailRecipients = (companyId: string | null) =>
  useMutation({
    mutationFn: async (roleIds: string[]) => {
      if (!companyId) throw new Error('No company selected')
      return testAlertEmailRecipients(companyId, roleIds)
    },
  })
