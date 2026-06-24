import { describe, expect, it, vi } from 'vitest'
import { enabledWhen, invalidateQueryKeys } from '../queryHelpers'

describe('query helpers', () => {
  it('enables only when every value is present', () => {
    expect(enabledWhen('org', 'issue')).toBe(true)
    expect(enabledWhen('org', null)).toBe(false)
  })

  it('invalidates every supplied query key', async () => {
    const queryClient = {
      invalidateQueries: vi.fn().mockResolvedValue(undefined),
    }

    await invalidateQueryKeys(queryClient as never, [
      ['open-kb', 'issues'],
      ['open-kb', 'projects'],
    ])

    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2)
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ['open-kb', 'issues'] })
    expect(queryClient.invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: ['open-kb', 'projects'] })
  })
})
