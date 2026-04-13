import { useQuery } from '@tanstack/react-query'
import { fetchAuditShrinkageData, fetchReportsData } from '../../api/reports'

const reportsKey = (companyId: string | null) => ['stoqr', 'reports', companyId] as const
const auditShrinkageKey = (companyId: string | null) => ['stoqr', 'reports', 'audit-shrinkage', companyId] as const

export const useReportsData = (companyId: string | null) =>
  useQuery({
    queryKey: reportsKey(companyId),
    queryFn: () => fetchReportsData(companyId as string),
    enabled: !!companyId,
    retry: false,
    staleTime: 60_000,
  })

export const useAuditShrinkageData = (companyId: string | null) =>
  useQuery({
    queryKey: auditShrinkageKey(companyId),
    queryFn: () => fetchAuditShrinkageData(companyId as string),
    enabled: !!companyId,
    retry: false,
    staleTime: 60_000,
  })
