import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createReportSchedule,
  deleteReportSchedule,
  fetchReportsData,
  type CreateReportSchedulePayload,
} from '../../api/reports'

const reportsKey = (companyId: string | null) => ['stoqr', 'reports', companyId] as const

export const useReportsData = (companyId: string | null) =>
  useQuery({
    queryKey: reportsKey(companyId),
    queryFn: () => fetchReportsData(companyId as string),
    enabled: !!companyId,
    retry: false,
    staleTime: 60_000,
  })

export const useReportsRefresh = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: reportsKey(companyId) })
  }
}

export const useCreateReportSchedule = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateReportSchedulePayload) => {
      if (!companyId) throw new Error('No company selected')
      await createReportSchedule(companyId, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKey(companyId) })
    },
  })
}

export const useDeleteReportSchedule = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!companyId) throw new Error('No company selected')
      await deleteReportSchedule(companyId, scheduleId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKey(companyId) })
    },
  })
}
