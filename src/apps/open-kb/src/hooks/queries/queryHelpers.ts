import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const enabledWhen = (...values: unknown[]) => values.every(Boolean)

export const invalidateQueryKeys = async (
  queryClient: QueryClient,
  queryKeys: QueryKey[],
) => {
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}
