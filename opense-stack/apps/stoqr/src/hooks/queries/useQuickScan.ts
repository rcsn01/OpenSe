import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createQuickScanTransaction,
  fetchCurrentUserId,
  lookupProductByScanValue,
} from '../../api/scan'

export const useQuickScanUser = () =>
  useQuery({
    queryKey: ['stoqr', 'scan', 'user'],
    queryFn: fetchCurrentUserId,
    staleTime: Infinity,
  })

export const useQuickScanLookup = (companyId: string, scanValue: string) =>
  useQuery({
    queryKey: ['stoqr', 'scan', 'lookup', companyId, scanValue],
    queryFn: () => lookupProductByScanValue(companyId, scanValue),
    enabled: !!companyId && !!scanValue.trim(),
  })

export const useQuickScanTransaction = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createQuickScanTransaction,
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'scan', 'lookup', variables.companyId] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'inventory'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['stoqr', 'alerts'] })
    },
  })
}
